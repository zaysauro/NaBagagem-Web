"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point={id:string;name:string;city:string|null;country:string|null;latitude:number|null;longitude:number|null};
type EventPoint={id:string;title:string;day_index:number;color:string;latitude:number|null;longitude:number|null;status:string};
type POI={id:string;name:string;latitude:number;longitude:number;category:string};
type SearchPlace={latitude:number;longitude:number;display_name:string;name:string;city:string;country:string;type:string};

const layerLabels={attractions:"Atrações",restaurants:"Restaurantes",transit:"Transporte"};

export default function TripMap({locations,events=[],tripId,canEdit=false}:{locations:Point[];events?:EventPoint[];tripId:string;canEdit?:boolean}){
  const router=useRouter();
  const ref=useRef<HTMLDivElement>(null);
  const mapRef=useRef<L.Map|null>(null);
  const poiLayers=useRef<Record<string,L.LayerGroup>>({});
  const eventLayer=useRef<L.LayerGroup|null>(null);
  const searchLayer=useRef<L.LayerGroup|null>(null);
  const [activeLayers,setActiveLayers]=useState<Record<string,boolean>>({attractions:false,restaurants:false,transit:false});
  const [day,setDay]=useState(0);
  const [poiMessage,setPoiMessage]=useState("");
  const [routeInfo,setRouteInfo]=useState<{distanceKm:number;durationMinutes:number}|null>(null);
  const [search,setSearch]=useState("");
  const [searchResults,setSearchResults]=useState<SearchPlace[]>([]);
  const [searching,setSearching]=useState(false);
  const [searchError,setSearchError]=useState("");
  const [adding,setAdding]=useState("");
  const [selectedSearch,setSelectedSearch]=useState<SearchPlace|null>(null);

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
      points.forEach((p,index)=>L.marker([p.latitude,p.longitude]).addTo(map).bindPopup("<strong>"+escapeHtml(String(index+1)+". "+p.name)+"</strong><br/>"+escapeHtml([p.city,p.country].filter(Boolean).join(", "))));
      if(points.length>1){
        fetch("/api/route?points="+encodeURIComponent(JSON.stringify(points.map((p)=>({latitude:p.latitude,longitude:p.longitude})))),{cache:"no-store"})
          .then(async(response)=>{if(!response.ok)throw new Error("rota");return response.json();})
          .then((data)=>{if(Array.isArray(data.geometry)){L.polyline(data.geometry as [number,number][],{weight:5,opacity:.8}).addTo(route);setRouteInfo({distanceKm:Number(data.distanceKm||0),durationMinutes:Number(data.durationMinutes||0)});}})
          .catch(()=>{L.polyline(points.map(p=>[p.latitude,p.longitude] as [number,number]),{weight:4,dashArray:"8 8",opacity:.65}).addTo(route);setRouteInfo(null);});
      }else setRouteInfo(null);
    }else map.setView([20,0],2);
    const timer=window.setTimeout(()=>map.invalidateSize(),100);
    return()=>{window.clearTimeout(timer);map.remove();mapRef.current=null;};
  },[locations]);

  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    Object.values(poiLayers.current).forEach(layer=>layer.remove());poiLayers.current={};
    (async()=>{
      const points=locations.filter(p=>p.latitude!=null&&p.longitude!=null) as Array<Point&{latitude:number;longitude:number}>;
      if(!points.length)return;
      for(const category of Object.keys(activeLayers)){
        if(!activeLayers[category])continue;
        setPoiMessage("Carregando "+layerLabels[category as keyof typeof layerLabels].toLowerCase()+"...");
        try{
          const responses=await Promise.all(points.map((point)=>
            fetch("/api/places?lat="+point.latitude+"&lng="+point.longitude+"&category="+category+"&radius=10000")
              .then(async(response)=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"erro");return data.places as POI[];})
          ));
          const unique=new Map<string,POI>();responses.flat().forEach((place)=>unique.set(place.id,place));
          const group=L.layerGroup();
          [...unique.values()].forEach(p=>{
            const icon=L.divIcon({className:"",html:'<div style="width:14px;height:14px;border-radius:50%;background:#111827;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',iconSize:[14,14],iconAnchor:[7,7]});
            L.marker([p.latitude,p.longitude],{icon}).addTo(group).bindPopup("<strong>"+escapeHtml(p.name)+"</strong><br/><span>"+escapeHtml(layerLabels[category as keyof typeof layerLabels])+"</span>");
          });
          group.addTo(map);poiLayers.current[category]=group;setPoiMessage("");
        }catch(error){setPoiMessage(error instanceof Error?error.message:"Não foi possível carregar os lugares.");}
      }
    })();
  },[activeLayers,locations]);

  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    if(eventLayer.current){eventLayer.current.remove();eventLayer.current=null;}
    const group=L.layerGroup().addTo(map);eventLayer.current=group;
    const visible=events.filter(e=>day===0||e.day_index===day).filter(e=>e.latitude!=null&&e.longitude!=null) as Array<EventPoint&{latitude:number;longitude:number}>;
    const byDay=new Map<number,Array<EventPoint&{latitude:number;longitude:number}>>();
    visible.forEach(e=>{const list=byDay.get(e.day_index)||[];list.push(e);byDay.set(e.day_index,list);});
    byDay.forEach((items)=>{
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

  async function searchPlaces(){
    const query=search.trim();if(!query)return;
    setSearching(true);setSearchError("");setSearchResults([]);
    try{
      const response=await fetch("/api/geocode?q="+encodeURIComponent(query),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível pesquisar.");
      setSearchResults(Array.isArray(data.places)?data.places:[]);
    }catch(error){setSearchError(error instanceof Error?error.message:"Não foi possível pesquisar.");}
    finally{setSearching(false);}
  }

  function selectSearchPlace(place:SearchPlace){
    setSelectedSearch(place);
    const map=mapRef.current;if(!map)return;
    if(searchLayer.current){searchLayer.current.remove();}
    const group=L.layerGroup().addTo(map);searchLayer.current=group;
    const marker=L.marker([place.latitude,place.longitude]).addTo(group);
    marker.bindPopup("<strong>"+escapeHtml(place.name)+"</strong><br/>"+escapeHtml(place.display_name)).openPopup();
    map.flyTo([place.latitude,place.longitude],15,{duration:.8});
  }

  async function addSearchPlace(place:SearchPlace){
    if(!canEdit)return;
    setAdding(place.display_name);setSearchError("");
    try{
      const response=await fetch("/api/trips/"+tripId+"/locations",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:place.name,city:place.city,country:place.country,latitude:place.latitude,longitude:place.longitude,order_index:locations.length})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível adicionar o destino.");
      setSearchResults([]);setSelectedSearch(null);setSearch("");
      if(searchLayer.current){searchLayer.current.remove();searchLayer.current=null;}
      router.refresh();
    }catch(error){setSearchError(error instanceof Error?error.message:"Não foi possível adicionar o destino.");}
    finally{setAdding("");}
  }

  function toggle(category:string){setActiveLayers(current=>({...current,[category]:!current[category]}));}
  const visibleEvents=events.filter(e=>day===0||e.day_index===day);

  return <div className="relative">
    <div className="absolute left-3 top-3 z-[1000] w-[min(420px,calc(100%-24px))]">
      <form onSubmit={(event)=>{event.preventDefault();void searchPlaces();}} className="flex gap-2 rounded-2xl border bg-white p-2 shadow-lg">
        <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Pesquisar cidade, lugar, atração..." className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none" />
        <button type="submit" disabled={searching||!search.trim()} className="rounded-xl bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">{searching?"Buscando...":"Buscar"}</button>
      </form>
      {(searchResults.length>0||searchError)&&<div className="mt-2 max-h-64 overflow-auto rounded-2xl border bg-white p-2 shadow-lg">
        {searchResults.map((place,index)=><button key={place.latitude+"-"+place.longitude+"-"+index} type="button" onClick={()=>selectSearchPlace(place)} className="block w-full rounded-xl p-3 text-left hover:bg-neutral-50">
          <div className="text-sm font-semibold text-neutral-900">{place.name}</div>
          <div className="mt-0.5 text-xs text-neutral-500">{place.display_name}</div>
        </button>)}
        {searchError&&<p className="p-3 text-xs text-red-600">{searchError}</p>}
      </div>}
      {selectedSearch&&<div className="mt-2 rounded-2xl border bg-white p-3 shadow-lg">
        <p className="text-xs font-semibold text-neutral-500">Local selecionado</p>
        <p className="mt-1 text-sm font-bold">{selectedSearch.name}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{selectedSearch.city}{selectedSearch.country?" · "+selectedSearch.country:""}</p>
        {canEdit&&<button type="button" onClick={()=>void addSearchPlace(selectedSearch)} disabled={!!adding} className="mt-3 w-full rounded-xl bg-neutral-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{adding?"Adicionando...":"Adicionar ao roteiro"}</button>}
      </div>}
    </div>
    <div ref={ref} className="h-[460px] w-full overflow-hidden rounded-2xl"/>
    <div className="absolute right-3 top-3 z-[1000] flex max-w-[calc(100%-24px)] flex-wrap justify-end gap-2">
      {Object.entries(layerLabels).map(([key,label])=><button key={key} type="button" onClick={()=>toggle(key)} className={"rounded-full border bg-white px-3 py-1.5 text-xs font-semibold shadow "+(activeLayers[key]?"bg-neutral-950 text-white":"text-neutral-700")}>{label}</button>)}
    </div>
    {days.length>0&&<div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100%-24px)] gap-1 overflow-x-auto rounded-xl border bg-white p-1 shadow">
      <button type="button" onClick={()=>setDay(0)} className={"rounded-lg px-3 py-1.5 text-xs font-semibold "+(day===0?"bg-neutral-950 text-white":"")}>Todos</button>
      {days.map(d=><button key={d} type="button" onClick={()=>setDay(d)} className={"rounded-lg px-3 py-1.5 text-xs font-semibold "+(day===d?"bg-neutral-950 text-white":"")}>Dia {d}</button>)}
    </div>}
    {poiMessage&&<div className="absolute right-3 top-14 z-[1000] rounded-xl bg-white px-3 py-2 text-xs shadow">{poiMessage}</div>}
    {routeInfo&&<div className="absolute right-3 bottom-3 z-[1000] rounded-xl border bg-white px-3 py-2 text-xs shadow">
      <span className="font-semibold">Rota terrestre</span> · {routeInfo.distanceKm.toFixed(1)} km · {Math.round(routeInfo.durationMinutes)} min
    </div>}
    {visibleEvents.length>0&&<div className="mt-3 flex flex-wrap gap-2">{visibleEvents.map(e=><span key={e.id} className="rounded-full border bg-white px-3 py-1 text-xs font-semibold" style={{borderColor:e.color}}>{e.title}</span>)}</div>}
  </div>;
}

function escapeHtml(value:string){return value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]||char));}
