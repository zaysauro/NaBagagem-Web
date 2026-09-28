"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { useEffect, useMemo, useState } from "react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type VisitPoint = { id:string; city:string|null; country:string|null; latitude:number; longitude:number };
type Props = { countries: string[]; visitPoints?: VisitPoint[] };

const aliases: Record<string,string> = {
  brasil:"Brazil", japao:"Japan", "coreia do sul":"South Korea", "coreia do norte":"North Korea",
  "estados unidos":"United States of America", "estados unidos da america":"United States of America",
  canada:"Canada", mexico:"Mexico", argentina:"Argentina", chile:"Chile", uruguai:"Uruguay",
  paraguai:"Paraguay", peru:"Peru", bolivia:"Bolivia", colombia:"Colombia", equador:"Ecuador",
  venezuela:"Venezuela", "costa rica":"Costa Rica", panama:"Panama", "reino unido":"United Kingdom",
  inglaterra:"United Kingdom", escocia:"United Kingdom", portugal:"Portugal", espanha:"Spain",
  franca:"France", italia:"Italy", alemanha:"Germany", "paises baixos":"Netherlands",
  holanda:"Netherlands", belgica:"Belgium", suica:"Switzerland", austria:"Austria",
  irlanda:"Ireland", grecia:"Greece", turquia:"Turkey", china:"China", india:"India",
  tailandia:"Thailand", vietnam:"Vietnam", indonesia:"Indonesia", filipinas:"Philippines",
  australia:"Australia", "nova zelandia":"New Zealand", egito:"Egypt", marrocos:"Morocco",
  "africa do sul":"South Africa", "emirados arabes unidos":"United Arab Emirates"
};

function normalize(value:string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function countryMatches(saved:string, mapName:string) {
  const normalized = normalize(saved);
  const target = aliases[normalized] || saved;
  return normalize(target) === normalize(mapName);
}

function geometryCenter(geometry:any): [number,number] | null {
  const coords:number[][] = [];
  const collect=(value:any)=>{
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      coords.push([value[0], value[1]]);
      return;
    }
    value.forEach(collect);
  };
  collect(geometry?.coordinates);
  if (!coords.length) return null;
  const lons=coords.map(p=>p[0]), lats=coords.map(p=>p[1]);
  return [(Math.min(...lons)+Math.max(...lons))/2,(Math.min(...lats)+Math.max(...lats))/2];
}

export default function WorldMap({ countries, visitPoints = [] }: Props) {
  const [geo, setGeo] = useState<any>(null);
  const normalized = new Set(countries.map(normalize));
  const uniquePoints = Array.from(new Map(visitPoints.map((p) => [((p.city || "") + "|" + (p.country || "")) || p.id, p])).values());

  useEffect(() => {
    fetch(GEO_URL).then((r) => r.json()).then(setGeo).catch(() => setGeo(null));
  }, []);

  const countryPins = useMemo(() => {
    if (!geo) return [];
    return (geo.features || []).flatMap((feature:any) => {
      const mapName=String(feature.properties?.name || "");
      const saved=countries.find(country => countryMatches(country,mapName));
      if (!saved) return [];
      const coordinates=geometryCenter(feature.geometry);
      return coordinates ? [{ name:saved, mapName, coordinates }] : [];
    });
  }, [geo, countries]);

  return (
    <div className="overflow-hidden rounded-2xl bg-neutral-100 p-2">
      <ComposableMap projectionConfig={{ scale: 145 }} width={800} height={390}>
        {geo ? (
          <Geographies geography={geo}>
            {({ geographies }) => geographies.map((g:any) => {
              const name=String(g.properties?.name || "");
              const visited=[...normalized].some(saved => countryMatches(saved,name));
              return (
                <Geography
                  key={g.rsmKey}
                  geography={g}
                  style={{
                    default:{ fill:visited ? "#111827" : "#d4d4d4", outline:"none" },
                    hover:{ fill:visited ? "#111827" : "#a3a3a3", outline:"none" },
                    pressed:{ fill:"#111827", outline:"none" },
                  } as any}
                />
              );
            })}
          </Geographies>
        ) : null}

        {countryPins.map((pin:any) => (
          <Marker key={"country-"+pin.name} coordinates={pin.coordinates}>
            <g role="img" aria-label={"País visitado: "+pin.name}>
              <circle r="9" fill="#111827" stroke="#fff" strokeWidth="3" />
              <circle r="3" fill="#fff" />
            </g>
          </Marker>
        ))}

        {uniquePoints.map((point) => (
          <Marker key={point.id} coordinates={[point.longitude, point.latitude]}>
            <g role="img" aria-label={point.city || point.country || "Lugar visitado"}>
              <circle r="6" fill="#111827" stroke="#fff" strokeWidth="2" />
              <circle r="2" fill="#fff" />
            </g>
          </Marker>
        ))}
      </ComposableMap>
      {!geo && <p className="px-4 pb-4 text-xs text-neutral-500">Carregando mapa-múndi…</p>}
      {geo && countryPins.length > 0 && <p className="px-4 pb-2 text-xs text-neutral-500">Cada pin representa um país marcado como visitado. Os pins menores mostram cidades/destinos das suas viagens.</p>}
    </div>
  );
}
