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

const countryCoordinates: Record<string,[number,number]> = {
  Brazil:[-51.9,-10.8], Japan:[138.25,36.2], "South Korea":[127.8,36.2],
  "North Korea":[127.2,40.3], "United States of America":[-100.0,38.0],
  Canada:[-106.3,56.1], Mexico:[-102.5,23.6], Argentina:[-63.6,-38.4],
  Chile:[-71.5,-35.7], Uruguay:[-55.8,-32.5], Paraguay:[-58.4,-23.4],
  Peru:[-75.0,-9.2], Bolivia:[-64.7,-16.7], Colombia:[-74.3,4.6],
  Ecuador:[-78.2,-1.4], Venezuela:[-66.2,7.1], "Costa Rica":[-84.0,9.9],
  Panama:[-80.0,8.5], "United Kingdom":[-3.4,55.4], Portugal:[-8.2,39.5],
  Spain:[-3.7,40.2], France:[2.2,46.2], Italy:[12.6,42.8], Germany:[10.4,51.1],
  Netherlands:[5.3,52.1], Belgium:[4.6,50.8], Switzerland:[8.2,46.8],
  Austria:[14.1,47.6], Ireland:[-8.0,53.2], Greece:[22.0,39.1], Turkey:[35.2,39.0],
  China:[103.8,35.9], India:[78.9,22.6], Thailand:[100.9,15.9], Vietnam:[108.3,14.1],
  Indonesia:[117.0,-2.5], Philippines:[122.9,11.9], Australia:[134.5,-25.7],
  "New Zealand":[172.0,-41.3], Egypt:[30.8,26.8], Morocco:[-6.0,31.8],
  "South Africa":[24.0,-30.6], "United Arab Emirates":[54.3,24.2]
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

    return countries.flatMap((saved) => {
      const normalizedSaved = normalize(saved);
      const mapName = aliases[normalizedSaved] || saved;
      const knownCoordinates = countryCoordinates[mapName];

      if (knownCoordinates) {
        return [{ name:saved, mapName, coordinates:knownCoordinates }];
      }

      const feature = (geo.features || []).find((item:any) =>
        countryMatches(saved, String(item.properties?.name || ""))
      );
      const coordinates = geometryCenter(feature?.geometry);

      return coordinates
        ? [{ name:saved, mapName, coordinates }]
        : [];
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
          <Marker key={"country-"+normalize(pin.name)} coordinates={pin.coordinates}>
            <g role="img" aria-label={"País visitado: "+pin.name} style={{ pointerEvents:"none" }}>
              <circle r="13" fill="#ef4444" stroke="#fff" strokeWidth="3" />
              <circle r="5" fill="#fff" />
              <path d="M -4 9 L 0 17 L 4 9 Z" fill="#ef4444" />
            </g>
          </Marker>
        ))}

        {uniquePoints.map((point) => (
          <Marker key={point.id} coordinates={[point.longitude, point.latitude]}>
            <g role="img" aria-label={point.city || point.country || "Lugar visitado"} style={{ pointerEvents:"none" }}>
              <circle r="6" fill="#111827" stroke="#fff" strokeWidth="2" />
              <circle r="2" fill="#fff" />
            </g>
          </Marker>
        ))}
      </ComposableMap>

      {!geo && <p className="px-4 pb-4 text-xs text-neutral-500">Carregando mapa-múndi…</p>}
      {geo && countryPins.length > 0 && (
        <p className="px-4 pb-2 text-xs text-neutral-500">
          Pins vermelhos = países visitados. Pins menores = cidades e destinos das suas viagens.
        </p>
      )}
    </div>
  );
}
