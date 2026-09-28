"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { useEffect, useState } from "react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type VisitPoint = { id:string; city:string|null; country:string|null; latitude:number; longitude:number };\ntype Props = { countries: string[]; visitPoints?: VisitPoint[] };

export default function WorldMap({ countries, visitPoints = [] }: Props) {
  const [geo, setGeo] = useState<any>(null);
  const normalized = new Set(countries.map((c) => c.trim().toLowerCase()));\n  const uniquePoints = Array.from(new Map(visitPoints.map((p) => [(p.city || "") + "|" + (p.country || "") || p.id, p])).values());

  useEffect(() => {
    fetch(GEO_URL).then((r) => r.json()).then(setGeo).catch(() => setGeo(null));
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl bg-neutral-100 p-2">
      <ComposableMap projectionConfig={{ scale: 145 }} width={800} height={390}>
        {geo ? (
          <Geographies geography={geo}>
            {({ geographies }) => geographies.map((g: any) => {
              const name = String(g.properties?.name || "");
              const visited = normalized.has(name.toLowerCase());
              return (
                <Geography
                  key={g.rsmKey}
                  geography={g}
                  style={{
                    default: { fill: visited ? "#111827" : "#d4d4d4", outline: "none" },
                    hover: { fill: visited ? "#111827" : "#a3a3a3", outline: "none" },
                    pressed: { fill: "#111827", outline: "none" },
                  } as any}
                />
              );
            })}
          </Geographies>
        ) : null}
        {uniquePoints.map((point) => (\n          <Marker key={point.id} coordinates={[point.longitude, point.latitude]}>\n            <g role="img" aria-label={point.city || point.country || "Lugar visitado"}>\n              <circle r="8" fill="#171717" stroke="#fff" strokeWidth="3" />\n              <circle r="3" fill="#fff" />\n            </g>\n          </Marker>\n        ))}\n      </ComposableMap>
      {!geo && <p className="px-4 pb-4 text-xs text-neutral-500">Carregando mapa-múndi…</p>}
    </div>
  );
}
