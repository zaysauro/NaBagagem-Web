import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const queries:Record<string,string>={
  attractions:'["tourism"~"attraction|museum|gallery|theme_park|viewpoint|zoo|aquarium"]',
  restaurants:'["amenity"="restaurant"]',
  transit:'["public_transport"~"station|stop_position"]'
};

export async function GET(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

  const params=new URL(request.url).searchParams;
  const lat=Number(params.get("lat"));
  const lng=Number(params.get("lng"));
  const category=params.get("category")||"attractions";
  const radius=Math.min(Math.max(Number(params.get("radius")||5000),500),10000);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!queries[category])return NextResponse.json({error:"Parâmetros inválidos."},{status:400});

  const q=`[out:json][timeout:12];(nwr(around:${radius},${lat},${lng})${queries[category]};);out center tags 60;`;
  const response=await fetch("https://overpass-api.de/api/interpreter",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded","User-Agent":"NaBagagem-Web/1.0"},
    body:new URLSearchParams({data:q}),
    next:{revalidate:1800}
  });
  if(!response.ok)return NextResponse.json({error:"Serviço de lugares indisponível."},{status:502});
  const data=await response.json();
  const places=(data.elements||[]).map((item:any)=>({
    id:String(item.id),
    name:item.tags?.name||item.tags?.["name:en"]||"Lugar sem nome",
    latitude:Number(item.lat??item.center?.lat),
    longitude:Number(item.lon??item.center?.lon),
    category
  })).filter((p:any)=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
  return NextResponse.json({places});
}