type Row = Record<string, any>;
export type TripExport = { trip: Row; locations: Row[]; events: Row[]; expenses: Row[]; checklist: Row[] };
export const TRIP_EXPORT_COLUMNS = "id,title,description,start_date,end_date,budget_amount,budget_currency,status,country,city";
export const exportFormats = ["gpx","kml","json","csv","ics"] as const;
export type ExportFormat = typeof exportFormats[number];
function xml(value:unknown) {return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]||c));}
function csv(value:unknown) {
 const raw=String(value??"");
 // Text beginning with spreadsheet operators must remain text when opened in Excel.
 const safe=typeof value==="string"&&/^[\s]*[=+@-]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replaceAll('"','""')+'"';
}
const icsEscape=(value:unknown)=>String(value??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r\n|\r|\n/g,"\\n");
function foldLine(line:string) {
 const lines:string[]=[];let current="",bytes=0;
 for(const char of line){const size=Buffer.byteLength(char,"utf8");if(bytes+size>75){lines.push(current);current=" ";bytes=1;}current+=char;bytes+=size;}
 lines.push(current);return lines.join("\r\n");
}
export function createTripExport(format:ExportFormat,data:TripExport,now=new Date()) {
 const {trip,locations,events,expenses,checklist}=data;
 const filename=(String(trip.title).replace(/[^a-z0-9_-]+/gi,"_")||"viagem")+"."+format;
 const result=(body:string,contentType:string)=>({body,contentType,filename});
 if(format==="json")return result(JSON.stringify({version:1,exported_at:now.toISOString(),trip,locations,events,expenses,checklist},null,2),"application/json; charset=utf-8");
 if(format==="csv") {
  const columns=["name","city","country","latitude","longitude","visited_at","notes","order_index"];
  return result("\uFEFF"+[columns.join(','),...locations.map(row=>columns.map(column=>csv(row[column])).join(','))].join('\r\n')+'\r\n',"text/csv; charset=utf-8");
 }
 if(format==="ics") {
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//NaBagagem//Trip Calendar//PT-BR","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  const stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  for(const event of events) {
   if(!event.event_date)continue;
   const day=String(event.event_date).replaceAll('-','');
   const clock=(time:string)=>time.slice(0,8).replaceAll(':','').padEnd(6,'0');
   const location=locations.find(row=>row.id===event.location_id);
   lines.push("BEGIN:VEVENT","UID:"+event.id+"@nabagagem","DTSTAMP:"+stamp);
   if(event.start_time) {
    lines.push("DTSTART:"+day+"T"+clock(event.start_time));
    if(event.end_time && event.end_time>event.start_time)lines.push("DTEND:"+day+"T"+clock(event.end_time));
   } else lines.push("DTSTART;VALUE=DATE:"+day);
   lines.push("SUMMARY:"+icsEscape(event.title));
   if(event.description)lines.push("DESCRIPTION:"+icsEscape(event.description));
   if(location)lines.push("LOCATION:"+icsEscape([location.name,location.city,location.country].filter(Boolean).join(', ')));
   lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return result(lines.map(foldLine).join('\r\n')+'\r\n',"text/calendar; charset=utf-8");
 }
 const points=locations.filter(row=>Number.isFinite(row.latitude)&&Number.isFinite(row.longitude));
 const notes=(row:Row)=>xml([row.city,row.country,row.notes].filter(Boolean).join(' — '));
 if(format==="kml") {
  const placemarks=points.map(row=>`<Placemark><name>${xml(row.name)}</name><description>${notes(row)}</description><Point><coordinates>${row.longitude},${row.latitude},0</coordinates></Point></Placemark>`).join('');
  const route=points.length>1?`<Placemark><name>Rota</name><LineString><tessellate>1</tessellate><coordinates>${points.map(row=>`${row.longitude},${row.latitude},0`).join(' ')}</coordinates></LineString></Placemark>`:'';
  return result(`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(trip.title)}</name>${placemarks}${route}</Document></kml>`,"application/vnd.google-earth.kml+xml; charset=utf-8");
 }
 const waypoints=points.map(row=>`<wpt lat="${row.latitude}" lon="${row.longitude}"><name>${xml(row.name)}</name><desc>${notes(row)}</desc></wpt>`).join('');
 const track=points.length>1?`<trk><name>${xml(trip.title)}</name><trkseg>${points.map(row=>`<trkpt lat="${row.latitude}" lon="${row.longitude}"/>`).join('')}</trkseg></trk>`:'';
 return result(`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="NaBagagem" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${xml(trip.title)}</name><desc>${xml(trip.description)}</desc></metadata>${waypoints}${track}</gpx>`,"application/gpx+xml; charset=utf-8");
}
