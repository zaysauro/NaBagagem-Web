import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
 const {data:trips,error}=await supabase.from("trips").select("id,start_date,end_date").eq("user_id",user.id);
 if(error)return NextResponse.json({error:error.message},{status:400});
 const ids=(trips||[]).map(t=>t.id);
 const {data:locations}=ids.length?await supabase.from("trip_locations").select("id,trip_id,city,country,latitude,longitude").in("trip_id",ids):{data:[]};
 const countries=[...new Set((locations||[]).map(x=>x.country).filter(Boolean))] as string[];
 const cities=[...new Set((locations||[]).map(x=>[x.city,x.country].filter(Boolean).join(", ")).filter(Boolean))] as string[];
 const points=(locations||[]).filter(x=>x.latitude!=null&&x.longitude!=null);
 let km=0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const R=6371,dLat=(b.latitude-a.latitude)*Math.PI/180,dLon=(b.longitude-a.longitude)*Math.PI/180;const q=Math.sin(dLat/2)**2+Math.cos(a.latitude*Math.PI/180)*Math.cos(b.latitude*Math.PI/180)*Math.sin(dLon/2)**2;km+=2*R*Math.asin(Math.sqrt(q));}
 const {data:profile}=await supabase.from("profiles").select("display_name,username,avatar_url,bio").eq("id",user.id).maybeSingle();
 const {data:settings}=await supabase.from("travel_stats").select("is_public").eq("user_id",user.id).maybeSingle();
 const badges=[] as string[];
 if(trips?.length)badges.push("first_trip");
 if(countries.length>=3)badges.push("three_countries");
 if(countries.length>=10)badges.push("ten_countries");
 if(km>=1000)badges.push("1000_km");
 return NextResponse.json({profile,publicStats:settings?.is_public??true,stats:{trips:trips?.length||0,countries:countries.length,cities:cities.length,kilometers:Math.round(km),countriesList:countries,citiesList:cities},badges});
}