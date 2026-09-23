import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("id,user_id").eq("id", id).maybeSingle();
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });
  const { data: member } = await supabase.from("trip_members").select("role").eq("trip_id", id).eq("user_id", user.id).maybeSingle();
  if (trip.user_id !== user.id && member?.role !== "editor") return NextResponse.json({ error: "Sem permissão para editar." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const day = Number(body.day);
  if (!Number.isInteger(day) || day < 1) return NextResponse.json({ error: "Dia inválido." }, { status: 400 });

  const { data: events, error } = await supabase.from("trip_events")
    .select("id,location_id,latitude,longitude,order_index,start_time,reservation_name,confirmation_code")
    .eq("trip_id", id).eq("day_index", day).order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const usable = (events || []).filter((e: any) => Number.isFinite(e.latitude) && Number.isFinite(e.longitude));
  if (usable.length < 2) return NextResponse.json({ error: "O dia precisa ter pelo menos 2 atividades com localização." }, { status: 400 });

  const distance=(a:any,b:any)=>{const dLat=a.latitude-b.latitude;const dLng=(a.longitude-b.longitude)*Math.cos(a.latitude*Math.PI/180);return dLat*dLat+dLng*dLng;};
  const scheduled=usable.filter((event:any)=>event.start_time).sort((a:any,b:any)=>(a.start_time||"").localeCompare(b.start_time||""));
  const reserved=usable.filter((event:any)=>!event.start_time&&(event.reservation_name||event.confirmation_code));
  const anchors=[...scheduled,...reserved.filter((event:any)=>!scheduled.some((x:any)=>x.id===event.id))];
  const flexible=usable.filter((event:any)=>!anchors.some((x:any)=>x.id===event.id));

  if (anchors.length <= 1) {
    const fixedStart=anchors[0]||usable[0];
    const remaining=usable.filter((event:any)=>event.id!==fixedStart.id);
    const ordered:any[]=[fixedStart];
    while(remaining.length){
      const current=ordered[ordered.length-1]; let best=0; let bestDistance=Number.POSITIVE_INFINITY;
      remaining.forEach((candidate:any,index:number)=>{const d=distance(current,candidate);if(d<bestDistance){bestDistance=d;best=index;}});
      ordered.push(remaining.splice(best,1)[0]);
    }
    for(let i=1;i<ordered.length-2;i++){
      for(let k=i+1;k<ordered.length-1;k++){
        const before=distance(ordered[i-1],ordered[i])+distance(ordered[k],ordered[k+1]);
        const after=distance(ordered[i-1],ordered[k])+distance(ordered[i],ordered[k+1]);
        if(after+1e-12<before) ordered.splice(i,k-i+1,...ordered.slice(i,k+1).reverse());
      }
    }
    anchors.splice(0,anchors.length,...ordered);
  }

  const ordered:any[]=[];
  const nearest=(from:any,pool:any[])=>{
    if(!pool.length)return null;
    let bestIndex=0,bestDistance=Number.POSITIVE_INFINITY;
    pool.forEach((candidate:any,index:number)=>{const d=distance(from,candidate);if(d<bestDistance){bestDistance=d;bestIndex=index;}});
    return pool.splice(bestIndex,1)[0];
  };

  // Horários marcados funcionam como âncoras: atividades flexíveis são inseridas
  // no espaço disponível entre duas âncoras, sem atravessar uma reserva agendada.
  const remainingFlexible=[...flexible];
  for(let i=0;i<anchors.length;i++){
    const anchor=anchors[i];
    ordered.push(anchor);
    const nextAnchor=anchors[i+1];
    if(!nextAnchor) {
      let current=anchor;
      while(remainingFlexible.length){const next=nearest(current,remainingFlexible);if(!next)break;ordered.push(next);current=next;}
      break;
    }
    while(remainingFlexible.length){
      const candidate=remainingFlexible.reduce((best:any,item:any)=>!best||distance(anchor,item)<distance(anchor,best)?item:best,null);
      if(!candidate)break;
      const beforeCandidate=distance(anchor,candidate)+distance(candidate,nextAnchor);
      const direct=distance(anchor,nextAnchor);
      // Insert only when the detour is reasonably small; this keeps the route compact
      // while preserving every scheduled/reserved anchor in its original order.
      if(beforeCandidate <= direct*1.85){
        remainingFlexible.splice(remainingFlexible.findIndex((x:any)=>x.id===candidate.id),1);
        ordered.push(candidate);
      } else break;
    }
  }
  for (let index = 0; index < ordered.length; index++) {
    const { error: updateError } = await supabase.from("trip_events").update({ order_index: index }).eq("id", ordered[index].id).eq("trip_id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, order: ordered.map((event) => event.id) });
}
