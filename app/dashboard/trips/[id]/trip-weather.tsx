"use client";
import { useEffect, useMemo, useState } from "react";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { useLocale } from "@/lib/i18n/use-locale";
import { parseWeatherDays, validCoordinates, type WeatherDay } from "@/lib/weather";

type Location = { id: string; name: string; city?: string | null; latitude: number | null; longitude: number | null };
export default function TripWeather({ locations }: { locations: Location[] }) {
 const locale=useLocale(),t=dictionaries[locale];
 const points=useMemo(()=>locations.filter(point=>validCoordinates(point.latitude,point.longitude)),[locations]);
 const [selected,setSelected]=useState("");
 const point=points.find(item=>item.id===selected)||points[0];
 const [forecast,setForecast]=useState<WeatherDay[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!point)return;
  const controller=new AbortController();
  setLoading(true);setError(false);setForecast([]);
  fetch(`/api/weather?latitude=${point.latitude}&longitude=${point.longitude}`,{signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error();return parseWeatherDays(await response.json());})
   .then(days=>{if(!controller.signal.aborted)setForecast(days);})
   .catch(()=>{if(!controller.signal.aborted)setError(true);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[point?.id,point?.latitude,point?.longitude,attempt]);
 function label(code:number|null){if(code===null)return t.unavailable;if(code===0)return t.weatherClear;if(code<=3)return t.weatherCloudy;if(code<=48)return t.weatherFog;if(code<=57)return t.weatherDrizzle;if(code<=67)return t.weatherRain;if(code<=77)return t.weatherSnow;if(code<=82)return t.weatherShowers;if(code<=86)return t.weatherSnowShowers;return t.weatherThunderstorm;}
 return <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-neutral-400">{t.forecast}</p><h2 className="mt-1 text-xl font-bold text-neutral-950">{t.tripWeather}</h2><p className="mt-1 text-sm text-neutral-500">{t.forecastDescription}</p></div>
   {points.length>0&&<select aria-label={t.weatherDestination} value={point?.id||""} onChange={event=>setSelected(event.target.value)} className="max-w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm">{points.map(item=><option key={item.id} value={item.id}>{item.name}{item.city?" · "+item.city:""}</option>)}</select>}
  </div>
  {!point?<p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-500">{t.weatherNoLocation}</p>:loading?<p role="status" className="mt-5 text-sm text-neutral-500">{t.weatherLoading}</p>:error?<div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{t.weatherFailed}<button onClick={()=>setAttempt(value=>value+1)} className="ml-3 underline">{t.weatherRetry}</button></div>:<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{forecast.map(day=><div key={day.date} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"><p className="text-xs font-semibold text-neutral-500">{new Date(day.date+"T12:00:00Z").toLocaleDateString(locale,{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"})}</p><p className="mt-3 text-sm font-semibold text-neutral-950">{label(day.code)}</p><p className="mt-1 text-2xl font-bold text-neutral-950">{Math.round(day.max)}° <span className="text-sm font-normal text-neutral-400">{Math.round(day.min)}°</span></p><p className="mt-2 text-xs text-neutral-500">{t.rain}: {day.rain===null?t.unavailable:day.rain+"%"}</p></div>)}</div>}
 </section>;
}
