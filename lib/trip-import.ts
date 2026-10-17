import { XMLParser, XMLValidator } from "fast-xml-parser";
import { expenseInput } from "./expense-validation";

type Row = Record<string, any>;
export type TripImport = { trip: Row; locations: Row[]; events: Row[]; expenses: Row[]; checklist: Row[] };
export const MAX_IMPORT_BYTES = 5_000_000;
const list = (value: any): any[] => value == null ? [] : Array.isArray(value) ? value : [value];
function text(value: unknown, fallback = "") { return typeof value === "string" ? value.trim() : fallback; }
function nullable(value: unknown) { return text(value) || null; }
function date(value: unknown) {
 if (value == null || value === "") return null;
 if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) throw new Error("O arquivo contém uma data inválida.");
 return value;
}
function coordinate(value: unknown, limit: number) {
 if (value == null || value === "") return null;
 if ((typeof value !== "number" && typeof value !== "string") || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > limit) throw new Error("O arquivo contém coordenadas inválidas.");
 return Number(value);
}
function integer(value: unknown, fallback: number, minimum=0) {
 if(value == null || value === "") return fallback;
 const number=Number(value);
 if(!Number.isSafeInteger(number) || number<minimum) throw new Error("O arquivo contém um índice inválido.");
 return number;
}
function money(value: unknown, digits=12) {
 if(value==null || value==="") return null;
 const amount=String(value);
 if(!new RegExp(`^\\d{1,${digits}}(\\.\\d{1,2})?$`).test(amount)) throw new Error("O arquivo contém um valor inválido.");
 return amount;
}
function array(value: unknown, maximum: number) {
 if(value==null) return [];
 if(!Array.isArray(value) || value.length>maximum || value.some(row=>!row || typeof row!=="object" || Array.isArray(row))) throw new Error("O arquivo possui registros inválidos ou excede o limite de importação.");
 return value as Row[];
}
function time(value: unknown) {
 if(value==null || value==="") return null;
 if(typeof value!=="string" || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(value)) throw new Error("O arquivo contém um horário inválido.");
 return value;
}
function normalizeBackup(backup: any): TripImport {
 if(!backup || backup.version!==1 || !backup.trip || typeof backup.trip!=="object") throw new Error("Backup NaBagagem inválido ou incompatível.");
 const source=backup.trip;
 const title=text(source.title,"Viagem restaurada");
 if(!title || title.length>120) throw new Error("O nome da viagem deve ter entre 1 e 120 caracteres.");
 const start=date(source.start_date), end=date(source.end_date);
 if(start && end && end<start) throw new Error("As datas da viagem estão invertidas.");
 const currency=text(source.budget_currency,"BRL").toUpperCase();
 if(!/^[A-Z]{3}$/.test(currency)) throw new Error("Moeda inválida.");
 const trip={title,description:nullable(source.description),start_date:start,end_date:end,budget_amount:money(source.budget_amount),budget_currency:currency,status:["planned","ongoing","completed","archived"].includes(source.status)?source.status:"planned",country:nullable(source.country),city:nullable(source.city)};
 const locations=array(backup.locations,500).map((row,index)=>({source_id:nullable(row.id),name:text(row.name,"Destino"),city:nullable(row.city),country:nullable(row.country),latitude:coordinate(row.latitude,90),longitude:coordinate(row.longitude,180),visited_at:date(row.visited_at),notes:nullable(row.notes),order_index:integer(row.order_index,index)}));
 const ids=locations.map(row=>row.source_id).filter(Boolean);
 if(new Set(ids).size!==ids.length) throw new Error("O backup contém destinos duplicados.");
 const events=array(backup.events,1000).map(row=>{
  const locationId=nullable(row.location_id);
  if(locationId && !ids.includes(locationId)) throw new Error("Uma atividade referencia um destino ausente no backup.");
  const reminder=row.reminder_minutes==null || row.reminder_minutes===""?null:integer(row.reminder_minutes,0);
  if(reminder!==null && reminder>10080) throw new Error("Lembrete inválido.");
  const reservation=nullable(row.reservation_url);
  if(reservation && !/^https?:\/\//i.test(reservation)) throw new Error("Link de reserva inválido.");
  return {source_location_id:locationId,title:text(row.title,"Atividade"),description:nullable(row.description),event_date:date(row.event_date),start_time:time(row.start_time),end_time:time(row.end_time),latitude:coordinate(row.latitude,90),longitude:coordinate(row.longitude,180),day_index:integer(row.day_index,1,1),order_index:integer(row.order_index,0),status:["completed","in_progress","future"].includes(row.status)?row.status:"future",color:/^#[0-9a-f]{6}$/i.test(row.color)?row.color:"#111827",reservation_name:nullable(row.reservation_name),confirmation_code:nullable(row.confirmation_code),reservation_url:reservation,reminder_minutes:reminder,activity_type:text(row.activity_type,"activity"),duration_minutes:row.duration_minutes==null?null:integer(row.duration_minutes,0),address:nullable(row.address),cost:money(row.cost)};
 });
 const expenses=array(backup.expenses,2000).map(row=>({...expenseInput(row),original_amount:money(row.original_amount),original_currency:nullable(row.original_currency),exchange_rate:row.exchange_rate==null?null:String(row.exchange_rate),exchange_date:date(row.exchange_date)}));
 const checklist=array(backup.checklist,1000).map((row,index)=>({title:text(row.title,"Item"),completed:row.completed===true,order_index:integer(row.order_index,index),category:text(row.category,"general"),description:nullable(row.description),due_date:date(row.due_date),priority:["low","normal","high"].includes(row.priority)?row.priority:"normal"}));
 return {trip,locations,events,expenses,checklist};
}

// CSV destinations use a header row and RFC-style quoted fields (including newlines).
export function parseCsv(raw: string) {
 const source=raw.replace(/^\uFEFF/,"");
 const firstLine=source.split(/\r?\n/,1)[0];
 const separator=firstLine.includes(";") && !firstLine.includes(",")?";":",";
 const rows:string[][]=[];let row:string[]=[], field="", quoted=false, closed=false;
 for(let i=0;i<source.length;i++) {
  const c=source[i];
  if(quoted) {if(c==='"'){if(source[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'){if(field || closed)throw new Error("CSV inválido.");quoted=true;continue;}
  if(c===separator){row.push(field);field="";closed=false;continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field="";closed=false;continue;}
  if(closed)throw new Error("CSV inválido.");field+=c;
 }
 if(quoted)throw new Error("CSV contém aspas não fechadas.");
 row.push(field);if(row.some(Boolean))rows.push(row);
 const headers=rows.shift()?.map(value=>value.trim().toLowerCase());
 if(!headers?.includes("name") || new Set(headers).size!==headers.length)throw new Error("O CSV precisa de um cabeçalho único com a coluna name.");
 return rows.map(values=>{if(values.length!==headers.length)throw new Error("CSV contém uma linha incompleta.");return Object.fromEntries(headers.map((header,index)=>[header,values[index]]));});
}
function descendants(node: any,key:string): any[] {
 if(!node || typeof node!=="object")return [];
 return Object.entries(node).flatMap(([name,value])=>name===key?list(value):list(value).flatMap(child=>descendants(child,key)));
}
function geoLocations(raw:string,format:"gpx"|"kml") {
 if(/<!DOCTYPE|<!ENTITY/i.test(raw) || XMLValidator.validate(raw)!==true)throw new Error("Arquivo XML inválido.");
 const parsed=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,parseAttributeValue:false}).parse(raw);
 if(!parsed[format])throw new Error("O arquivo não corresponde ao formato escolhido.");
 const point=(node:any,fallback:string)=>({name:text(node.name,fallback),latitude:node["@_lat"],longitude:node["@_lon"],notes:nullable(node.desc)});
 if(format==="gpx") {
  // Exported files include both waypoints and a connecting track; import one representation.
  const waypoints=list(parsed.gpx.wpt), routes=descendants(parsed.gpx,"rtept"), tracks=descendants(parsed.gpx,"trkpt");
  return (waypoints.length?waypoints:routes.length?routes:tracks).map(node=>point(node,"Ponto GPX"));
 }
 const placemarks=descendants(parsed.kml,"Placemark");
 const points=placemarks.filter(node=>node.Point).map(node=>{
  const parts=text(node.Point.coordinates).split(/\s+/)[0].split(",");
  return {name:text(node.name,"Ponto KML"),longitude:parts[0],latitude:parts[1],notes:nullable(node.description)};
 });
 if(points.length)return points;
 return placemarks.flatMap(node=>list(node.LineString).flatMap(line=>text(line.coordinates).split(/\s+/).filter(Boolean).map(coordinates=>{const [longitude,latitude]=coordinates.split(",");return {name:text(node.name,"Ponto KML"),longitude,latitude};})));
}
export function parseTripImport(raw:string,filename:string,title?:string):TripImport {
 if(Buffer.byteLength(raw,"utf8")>MAX_IMPORT_BYTES)throw new Error("Arquivo muito grande.");
 const format=filename.split(".").pop()?.toLowerCase();
 if(format==="json") {let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error("Backup JSON inválido.");}return normalizeBackup(parsed);}
 if(format!=="csv"&&format!=="gpx"&&format!=="kml")throw new Error("Formato aceito: GPX, KML, CSV ou Backup JSON.");
 const locations=format==="csv"?parseCsv(raw):geoLocations(raw,format);
 if(!locations.length)throw new Error("O arquivo não contém destinos para importar.");
 if(format!=="csv" && locations.some(row=>row.latitude==null||row.latitude===""||row.longitude==null||row.longitude===""))throw new Error("O arquivo contém um ponto sem coordenadas.");
 return normalizeBackup({version:1,trip:{title:title?.trim()||filename.replace(/\.[^.]+$/,"")||"Viagem importada"},locations});
}

type QueryClient = { query: (sql: string, values?: any[]) => Promise<{rows: any[]}> };
// The caller supplies one transaction for the complete import, including identity/RLS.
export async function persistTripImport(client:QueryClient,userId:string,input:TripImport) {
 async function insert(table:string,row:Row) {
  const columns=Object.keys(row);
  const result=await client.query(`insert into ${table} (${columns.map(column=>'"'+column+'"').join(',')}) values (${columns.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(row));
  return result.rows[0];
 }
 const trip=await insert("trips",{...input.trip,user_id:userId});
 const ids=new Map<string,string>();
 for(const {source_id,...location} of input.locations) {const saved=await insert("trip_locations",{...location,trip_id:trip.id});if(source_id)ids.set(source_id,saved.id);}
 for(const {source_location_id,...event} of input.events) await insert("trip_events",{...event,trip_id:trip.id,location_id:source_location_id?ids.get(source_location_id):null});
 for(const expense of input.expenses)await insert("trip_expenses",{...expense,trip_id:trip.id});
 for(const item of input.checklist)await insert("trip_checklist_items",{...item,trip_id:trip.id});
 return trip;
}
