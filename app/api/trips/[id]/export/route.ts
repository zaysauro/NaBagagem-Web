import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTripExport, exportFormats, TRIP_EXPORT_COLUMNS, type ExportFormat } from "@/lib/trip-export";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const format=new URL(request.url).searchParams.get("format")?.toLowerCase()||"gpx";
 if(!exportFormats.includes(format as ExportFormat))return NextResponse.json({error:"Formato inválido."},{status:400});
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
 const {data:trip,error}=await client.from("trips").select(TRIP_EXPORT_COLUMNS).eq("id",id).eq("user_id",user.id).single();
 if(error||!trip)return NextResponse.json({error:"Viagem não encontrada."},{status:404});
 const requests=[client.from("trip_locations").select("*").eq("trip_id",id).order("order_index").order("created_at")];
 if(format==="json"||format==="ics")requests.push(client.from("trip_events").select("*").eq("trip_id",id).order("day_index").order("order_index").order("created_at"));
 if(format==="json")requests.push(client.from("trip_expenses").select("*").eq("trip_id",id).order("expense_date").order("created_at"),client.from("trip_checklist_items").select("*").eq("trip_id",id).order("order_index").order("created_at"));
 const results=await Promise.all(requests);
 if(results.some(result=>result.error))return NextResponse.json({error:"Não foi possível exportar todos os dados da viagem. Tente novamente."},{status:500});
 const [locations=[],events=[],expenses=[],checklist=[]]=results.map(result=>result.data||[]);
 const file=createTripExport(format as ExportFormat,{trip,locations,events,expenses,checklist});
 return new NextResponse(file.body,{headers:{"Content-Type":file.contentType,"Content-Disposition":`attachment; filename="${file.filename}"`}});
}
