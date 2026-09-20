import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function haversine(a:any,b:any) {
  const R=6371,dLat=(b.latitude-a.latitude)*Math.PI/180,dLon=(b.longitude-a.longitude)*Math.PI/180;
  const q=Math.sin(dLat/2)**2+Math.cos(a.latitude*Math.PI/180)*Math.cos(b.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

function tripDays(start:string|null,end:string|null) {
  if(!start) return 0;
  const a=new Date(start+"T00:00:00");
  const b=new Date((end||start)+"T00:00:00");
  return Math.max(1,Math.round((b.getTime()-a.getTime())/86400000)+1);
}

function eventHours(start:string|null,end:string|null) {
  if(!start||!end) return 0;
  const [sh,sm]=start.split(":").map(Number), [eh,em]=end.split(":").map(Number);
  const minutes=(eh*60+em)-(sh*60+sm);
  return minutes>0?minutes/60:0;
}

export async function GET() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

  const {data:trips,error}=await supabase.from("trips")
    .select("id,title,start_date,end_date,created_at").eq("user_id",user.id).order("start_date",{ascending:true});
  if(error)return NextResponse.json({error:error.message},{status:400});

  const ids=(trips||[]).map(t=>t.id);
  const {data:locations}=ids.length
    ? await supabase.from("trip_locations").select("id,trip_id,city,country,latitude,longitude,visited_at").in("trip_id",ids)
    : {data:[]};
  const {data:events}=ids.length
    ? await supabase.from("trip_events").select("trip_id,event_date,start_time,end_time").in("trip_id",ids)
    : {data:[]};
  const {data:expenses}=ids.length
    ? await supabase.from("trip_expenses").select("trip_id,amount,currency,expense_date").in("trip_id",ids)
    : {data:[]};

  const points=(locations||[]).filter(x=>x.latitude!=null&&x.longitude!=null);
  let km=0;
  for(let i=1;i<points.length;i++) km+=haversine(points[i-1],points[i]);

  const countries=[...new Set((locations||[]).map(x=>x.country?.trim()).filter(Boolean))] as string[];
  const cities=[...new Set((locations||[]).map(x=>[x.city,x.country].filter(Boolean).join(", ")).filter(Boolean))] as string[];
  const days=(trips||[]).reduce((sum,t)=>sum+tripDays(t.start_date,t.end_date),0);
  const hours=(events||[]).reduce((sum,e)=>sum+eventHours(e.start_time,e.end_time),0);

  const monthly=MONTHS.map((label,i)=>{
    const now=new Date();
    const year=now.getFullYear();
    const tripsCount=(trips||[]).filter(t=>{const d=t.start_date?new Date(t.start_date+"T00:00:00"):null;return d&&d.getFullYear()===year&&d.getMonth()===i}).length;
    const spent=(expenses||[]).filter(e=>{const d=e.expense_date?new Date(e.expense_date+"T00:00:00"):null;return d&&d.getFullYear()===year&&d.getMonth()===i&&e.currency==="BRL"}).reduce((s,e)=>s+Number(e.amount||0),0);
    return {label,trips:tripsCount,expenses:spent};
  });

  const badges:string[]=[];
  if((trips||[]).length>=1) badges.push("first_trip");
  if((trips||[]).some(t=>t.end_date&&new Date(t.end_date+"T00:00:00")<new Date())) badges.push("trip_completed");
  if(countries.length>=3) badges.push("three_countries");
  if(countries.length>=10) badges.push("ten_countries");
  if(km>=1000) badges.push("1000_km");
  if(cities.length>=25) badges.push("25_cities");
  if(days>=30) badges.push("30_travel_days");

  if(badges.length) {
    await supabase.from("user_badges").upsert(
      badges.map(badge_key=>({user_id:user.id,badge_key})),
      {onConflict:"user_id,badge_key",ignoreDuplicates:true}
    );
  }

  const {data:earned}=await supabase.from("user_badges").select("badge_key,earned_at").eq("user_id",user.id).order("earned_at",{ascending:false});
  const {data:profile}=await supabase.from("profiles").select("display_name,username,avatar_url,bio").eq("id",user.id).maybeSingle();
  const {data:settings}=await supabase.from("travel_stats").select("is_public").eq("user_id",user.id).maybeSingle();

  return NextResponse.json({
    profile, publicStats:settings?.is_public??true,
    stats:{
      trips:trips?.length||0,countries:countries.length,cities:cities.length,
      kilometers:Math.round(km),travelDays:days,travelHours:Math.round(hours*10)/10,
      countryPercent:Math.min(100,(countries.length/195)*100),
      countriesList:countries,citiesList:cities,totalExpensesBRL:(expenses||[]).filter(e=>e.currency==="BRL").reduce((s,e)=>s+Number(e.amount||0),0)
    },
    monthly,badges,earnedBadges:earned||[]
  });
}