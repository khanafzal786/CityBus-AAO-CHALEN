"use client";
import { useEffect, useState } from "react";
import { api } from "../api";
export default function RouteMap({
  busId,
  userLocation,
}: {
  busId: string;
  userLocation?: { latitude: number; longitude: number } | null;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const get = () =>
      api("buses/" + busId + "/location")
        .then((d) => {
          if (active) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => active && setError(e.message));
    get();
    const t = setInterval(get, 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [busId]);
  if (error)
    return (
      <div className="empty" role="alert">
        {error}
      </div>
    );
  if (!data)
    return <div className="skeleton map-loading">Loading route map…</div>;
  const stops = data.stops || [],
    all = [...stops, ...(userLocation ? [userLocation] : [])];
  const lats = all.map((s) => s.latitude),
    lngs = all.map((s) => s.longitude);
  const minLat = Math.min(...lats) - 0.015,
    maxLat = Math.max(...lats) + 0.015,
    minLng = Math.min(...lngs) - 0.015,
    maxLng = Math.max(...lngs) + 0.015;
  const xy = (s: any) => ({
    x: 60 + ((s.longitude - minLng) / (maxLng - minLng)) * 680,
    y: 440 - ((s.latitude - minLat) / (maxLat - minLat)) * 380,
  });
  const bus = xy(data);
  return (
    <div className="map-wrap">
      <div className="map-label">
        <span className="dot" />
        {data.mode === "DEMO" ? "SIMULATED MOVEMENT" : "GPS LOCATION"} ·
        SCHEMATIC MAP
      </div>
      <svg
        viewBox="0 0 800 500"
        role="img"
        aria-label="Schematic route map, not a navigation map"
      >
        <defs>
          <pattern
            id="grid"
            width="70"
            height="65"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-16)"
          >
            <rect width="70" height="65" fill="#f2f4ee" />
            <rect x="4" y="4" width="57" height="52" rx="7" fill="#e7ebdf" />
            <path d="M0 0H70V65" fill="none" stroke="white" strokeWidth="8" />
          </pattern>
        </defs>
        <rect width="800" height="500" fill="url(#grid)" />
        <path
          d="M0 160 Q200 320 400 150 T800 300"
          stroke="#c2e1ed"
          strokeWidth="36"
          fill="none"
        />
        <text x="480" y="65" fill="#79877a" fontSize="20" letterSpacing="5">
          LUCKNOW
        </text>
        <polyline
          points={stops
            .map((s: any) => {
              const q = xy(s);
              return `${q.x},${q.y}`;
            })
            .join(" ")}
          stroke="white"
          strokeWidth="11"
          fill="none"
        />
        <polyline
          points={stops
            .map((s: any) => {
              const q = xy(s);
              return `${q.x},${q.y}`;
            })
            .join(" ")}
          stroke="#3831d8"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {stops.map((s: any, i: number) => {
          const q = xy(s);
          return (
            <g key={s.id}>
              <circle
                cx={q.x}
                cy={q.y}
                r="7"
                fill="white"
                stroke="#3831d8"
                strokeWidth="3"
              />
              <text
                x={q.x + 12}
                y={q.y + (i % 2 ? 20 : -12)}
                fontSize="12"
                fill="#25302d"
                paintOrder="stroke"
                stroke="#fff"
                strokeWidth="3"
              >
                {s.stopName}
              </text>
            </g>
          );
        })}
        {data.latitude != null && (
          <g transform={`translate(${bus.x},${bus.y})`}>
            <circle r="27" fill="#3831d8" opacity=".12" />
            <rect
              x="-19"
              y="-19"
              width="38"
              height="38"
              rx="12"
              fill="#3831d8"
              stroke="white"
              strokeWidth="3"
            />
            <text textAnchor="middle" y="5" fill="white" fontSize="14">
              BUS
            </text>
          </g>
        )}
        {userLocation && (
          <circle
            cx={xy(userLocation).x}
            cy={xy(userLocation).y}
            r="9"
            fill="#087bdf"
            stroke="white"
            strokeWidth="4"
          />
        )}
      </svg>
      <div className="map-bottom">
        <span>
          <b>{data.nextStop}</b>
          <small>
            Next stop ·{" "}
            {data.stale
              ? "Location is stale"
              : data.etaMinutes
                ? `~${data.etaMinutes} min estimate`
                : "ETA unavailable"}
          </small>
        </span>
        <span className="pill">
          {data.mode === "DEMO" ? "Demo" : "GPS"} ·{" "}
          {data.timestamp
            ? new Date(data.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "No update"}
        </span>
      </div>
    </div>
  );
}
