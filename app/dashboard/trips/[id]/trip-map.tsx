"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point={id:string;name:string;city:string|null;country:string|null;latitude:number|null;longitude:number|null};
type EventPoint={id:string;title:string;day_index:number;color:string;latitude:number|null;longitude:number|null;status:string};
type POI={id:string;name:string;latitude:number;longitude:number;category:string};

const layerLabels={attractions:"Atrações",restaurants:"Restaurantes",transit:"Transporte"};

export default function TripMap({locations,events=[]}:{locations:Point[];events?:EventPoint[]}){
  const ref=useRef<HTMLDivElement>(null);
  const mapRef=useRef<L.Map|null>(null);
  const poiLayers=useRef<Record<string,L.LayerGroup>>({});
  const eventLayer=useRef<L.LayerGroup|null>(null);
  const [activeLayers,setActiveLayers]=useState<Record<string,boolean>>({attractions:false,restaurants:false,transit:false});
  const [day,setDay]=useState(0);
  const [poiMessage,setPoiMessage]=useState("");
  const [routeInfo,setRouteInfo]=useState<{distanceKm:number;durationMinutes:number}|null>(null);

  const days=useMemo(()=>[...new Set(events.map(e=>e.day_index).filter(Number.isFinite))].sort((a,b)=>a-b),[events]);

  useEffect(()=>{
    if(!ref.current)return;
    const points=locations.filter(p=>p.latitude!=null&&p.longitude!=null) as Array<Point&{latitude:number;longitude:number}>;
    const map=L.map(ref.current,{scrollWheelZoom:true});
    mapRef.current=map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OpenStreetMap contributors",maxZoom:19}).addTo(map);

    const route=L.layerGroup().addTo(map);
    if(points.length){
      const bounds=L.latLngBounds(points.map(p=>[p.latitude,p.longitude] as [number,number]));
      map.fitBounds(bounds.pad(0.2),{maxZoom:13});
      points.forEach((p,index)=>{
        L.marker([p.latitude,p.longitude]).addTo(map).bindPopup("<strong>"+escapeHtml(String(index+1)+". "+p.name)+"</strong><br/>"+escapeHtml([p.city,p.country].filter(Boolean).join(", ")));
      });
      if(points.length>1){
        fetch("/api/route?points="+encodeURIComponent(JSON.stringify(points.map((p)=>({latitude:p.latitude,longitude:p.longitude})))),{cache:"no-store"})
          .then(async(response)=>{
            if(!response.ok) throw new Error("rota");
            return response.json();
          })
          .then((data)=>{
            if(Array.isArray(data.geometry)){
              L.polyline(data.geometry as [number,number][],{weight:5,opacity:.8}).addTo(route);
              setRouteInfo({distanceKm:Number(data.distanceKm||0),durationMinutes:Number(data.durationMinutes||0)});
            }
          })
          .catch(()=>{
            L.polyline(points.map(p=>[p.latitude,p.longitude] as [number,number]),{weight:4,dashArray:"8 8",opacity:.65}).addTo(route);
            setRouteInfo(null);
          });
      }else setRouteInfo(null);
    }else map.setView([20,0],2);

    const timer=window.setTimeout(()=>map.invalidateSize(),100);
    return()=>{window.clearTimeout(timer);map.remove();mapRef.current=null;};
  },[locations]);

  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    Object.values(poiLayers.current).forEach(layer=>layer.remove());
    poiLayers.current={};
    (async()=>{
      const points=locations.filter(p=>p.latitude!=null&&p.longitude!=null) as Array<Point&{latitude:number;longitude:number}>;
      if(!points.length)return;
      for(const category of Object.keys(activeLayers)){
        if(!activeLayers[category])continue;
        setPoiMessage("Carregando "+layerLabels[category as keyof typeof layerLabels].toLowerCase()+"...");
        try{
          const responses=await Promise.all(points.map((point)=>
            fetch("/api/places?lat="+point.latitude+"&lng="+point.longitude+"&category="+category+"&radius=10000")
              .then(async(response)=>{
                const data=await response.json();
                if(!response.ok) throw new Error(data.error||"erro");
                return data.places as POI[];
              })
          ));
          const unique=new Map<string,POI>();
          responses.flat().forEach((place)=>unique.set(place.id,place));
          const group=L.layerGroup();
          [...unique.values()].forEach(p=>{
            const icon=L.divIcon({className:"",html:'<div style="width:14px;height:14px;border-radius:50%;background:#111827;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',iconSize:[14,14],iconAnchor:[7,7]});
            L.marker([p.latitude,p.longitude],{icon}).addTo(group).bindPopup("<strong>"+escapeHtml(p.name)+"</strong><br/><span>"+escapeHtml(layerLabels[category as keyof typeof layerLabels])+"</span>");
          });
          group.addTo(map);poiLayers.current[category]=group;
          setPoiMessage("");
        }catch(error){setPoiMessage(error instanceof Error?error.message:"Não foi possível carregar os lugares.");}
      }
    })();
  },[activeLayers,locations]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    if(eventLayer.current){eventLayer.current.remove();eventLayer.current=null;}
    const group=L.layerGroup().addTo(map);
    eventLayer.current=group;
    const visible=events.filter(e=>day===0||e.day_index===day).filter(e=>e.latitude!=null&&e.longitude!=null) as Array<EventPoint&{latitude:number;longitude:number}>;
    const byDay=new Map<number,Array<EventPoint&{latitude:number;longitude:number}>>();
    visible.forEach(e=>{const list=byDay.get(e.day_index)||[];list.push(e);byDay.set(e.day_index,list);});
    byDay.forEach((items,dayNumber)=>{
      const coords=items.map(e=>[e.latitude,e.longitude] as [number,number]);
      if(coords.length>1)L.polyline(coords,{weight:5,color:items[0].color||"#111827",opacity:.75,dashArray:"8 7"}).addTo(group);
      items.forEach((e,index)=>{
        const color=/^#[0-9a-f]{6}$/i.test(e.color)?e.color:"#111827";
        const icon=L.divIcon({className:"",html:'<div style="width:24px;height:24px;border-radius:50%;background:'+color+';border:2px solid white;color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35)">'+(index+1)+'</div>',iconSize:[24,24],iconAnchor:[12,12]});
        L.marker([e.latitude,e.longitude],{icon}).addTo(group).bindPopup("<strong>"+escapeHtml(e.title)+"</strong><br/>Dia "+e.day_index+" · "+escapeHtml(e.status));
      });
    });
    return()=>{group.remove();};
  },[events,day]);
  function toggle(category:string){
    setActiveLayers(current=>({...current,[category]:!current[category]}));
  }

  const visibleEvents=events.filter(e=>day===0||e.day_index===day);
  return <div className="relative">
    <div ref={ref} className="h-[460px] w-full overflow-hidden rounded-2xl"/>
    <div className="absolute left-3 top-3 z-[1000] flex max-w-[calc(100%-24px)] flex-wrap gap-2">
      {Object.entries(layerLabels).map(([key,label])=><button key={key} type="button" onClick={()=>toggle(key)} className={"rounded-full border bg-white px-3 py-1.5 text-xs font-semibold shadow "+(activeLayers[key]?"bg-neutral-950 text-white":"text-neutral-700")}>{label}</button>)}
    </div>
    {days.length>0&&<div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100%-24px)] gap-1 overflow-x-auto rounded-xl border bg-white p-1 shadow">
      <button type="button" onClick={()=>setDay(0)} className={"rounded-lg px-3 py-1.5 text-xs font-semibold "+(day===0?"bg-neutral-950 text-white":"")}>Todos</button>
      {days.map(d=><button key={d} type="button" onClick={()=>setDay(d)} className={"rounded-lg px-3 py-1.5 text-xs font-semibold "+(day===d?"bg-neutral-950 text-white":"")}>Dia {d}</button>)}
    </div>}
    {poiMessage&&<div className="absolute right-3 top-3 z-[1000] rounded-xl bg-white px-3 py-2 text-xs shadow">{poiMessage}</div>}
    {routeInfo&&<div className="absolute right-3 bottom-3 z-[1000] rounded-xl border bg-white px-3 py-2 text-xs shadow">
      <span className="font-semibold">Rota terrestre</span> · {routeInfo.distanceKm.toFixed(1)} km · {Math.round(routeInfo.durationMinutes)} min
    </div>}
    {visibleEvents.length>0&&<div className="mt-3 flex flex-wrap gap-2">
      {visibleEvents.map(e=><span key={e.id} className="rounded-full border bg-white px-3 py-1 text-xs font-semibold" style={{borderColor:e.color}}>{e.title}</span>)}
    </div>}
  </div>;
}

function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]||char));
}