"use client";

import { feature } from "topojson-client";
import { countryPinsFor, numericCountryCode } from "@/lib/country-pins";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { useEffect, useMemo, useState } from "react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type VisitPoint = { id:string; city:string|null; country:string|null; latitude:number; longitude:number };
type Props = { countries: string[]; visitPoints?: VisitPoint[] };

export default function WorldMap({ countries, visitPoints = [] }: Props) {
  const [geo, setGeo] = useState<any>(null);
  const countryPins = useMemo(() => countryPinsFor(countries), [countries]);
  const visitedCodes = new Set(countryPins.map(pin => pin.code));
  const [failed, setFailed] = useState(false);
  const uniquePoints = Array.from(new Map(visitPoints.map((p) => [((p.city || "") + "|" + (p.country || "")) || p.id, p])).values());

  useEffect(() => {
    let active=true;
    fetch(GEO_URL).then(r=>{if(!r.ok)throw new Error("Map unavailable");return r.json();}).then(data=>{if(active)setGeo(data.type==="Topology"?feature(data,data.objects.countries):data);}).catch(()=>{if(active){setGeo(null);setFailed(true);}});
    return()=>{active=false;};
  }, []);


  return (
    <div className="overflow-hidden rounded-2xl bg-neutral-100 p-2">
      <ComposableMap projectionConfig={{ scale: 145 }} width={800} height={390}>
        {geo ? (
          <Geographies geography={geo}>
            {({ geographies }) => geographies.map((g:any) => {
              const visited=visitedCodes.has(numericCountryCode(String(g.id)) || "");
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

        {countryPins.map((pin) => (
          <Marker key={"country-"+pin.code} coordinates={pin.coordinates}>
            <g data-country-code={pin.code} role="img" aria-label={"País visitado: "+pin.name} style={{ pointerEvents:"none" }}>
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

      <p className="px-4 pb-2 text-xs text-neutral-500">Coordenadas: <a href="https://github.com/mledoze/countries" className="underline">World countries (ODbL)</a></p>
      {!geo && <p className="px-4 pb-4 text-xs text-neutral-500">{failed ? "Não foi possível carregar o fundo do mapa. Os países continuam marcados." : "Carregando mapa-múndi…"}</p>}
      {countryPins.length > 0 && (
        <p className="px-4 pb-2 text-xs text-neutral-500">
          Pins vermelhos = países visitados. Pins menores = cidades e destinos das suas viagens.
        </p>
      )}
    </div>
  );
}
