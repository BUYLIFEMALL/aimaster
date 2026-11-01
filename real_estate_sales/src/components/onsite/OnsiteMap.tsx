"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export type OnsitePin = { id: string; lat: number; lon: number; label: string; color: string; href?: string };

const KOREA_CENTER = { lat: 36.5, lon: 127.8 };

/**
 * 브이월드 배경지도. picking이면 가운데 핀을 고정하고 지도를 움직여 위치를 맞춘다
 * (사전 검증에서 핀 끌기가 손가락으로 불편했다).
 */
export function OnsiteMap({
  mapKey,
  center,
  zoom = 17,
  pins = [],
  picking = false,
  onCenterChange,
  className = "h-72",
}: {
  mapKey: string | null;
  center?: { lat: number; lon: number } | null;
  zoom?: number;
  pins?: OnsitePin[];
  picking?: boolean;
  onCenterChange?: (c: { lat: number; lon: number }) => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onCenterChange);
  onChangeRef.current = onCenterChange;
  const pinsKey = JSON.stringify(pins);

  useEffect(() => {
    if (!mapKey || !boxRef.current) return;
    let map: LeafletMap | null = null;
    let cancelled = false;
    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !boxRef.current) return;
      const start = center ?? KOREA_CENTER;
      map = L.map(boxRef.current).setView([start.lat, start.lon], center ? zoom : 7);
      L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${mapKey}/Base/{z}/{y}/{x}.png`, {
        minZoom: 6,
        maxZoom: 19,
        attribution: "브이월드",
      }).addTo(map);
      const shown: OnsitePin[] = JSON.parse(pinsKey);
      for (const pin of shown) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:18px;height:18px;border-radius:50%;background:${pin.color};border:2px solid #fff;box-shadow:0 1px 4px #0008"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const marker = L.marker([pin.lat, pin.lon], { icon, title: pin.label }).addTo(map);
        if (pin.href) marker.on("click", () => window.location.assign(pin.href as string));
      }
      if (!center && shown.length) map.fitBounds(L.latLngBounds(shown.map((p) => [p.lat, p.lon])), { padding: [30, 30], maxZoom: 16 });
      const report = () => {
        const c = map?.getCenter();
        if (c) onChangeRef.current?.({ lat: c.lat, lon: c.lng });
      };
      map.on("moveend", report);
      report();
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
    // 지도는 처음 위치로 한 번 만들고, 이후 움직임은 회원 조작을 따른다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey, pinsKey]);

  if (!mapKey) {
    return <div className={`flex items-center justify-center rounded-xl border border-mx-border bg-mx-raised text-sm text-mx-muted ${className}`}>지도를 불러오지 못했습니다.</div>;
  }
  return (
    <div className={`relative isolate overflow-hidden rounded-xl border border-mx-border ${className}`}>
      <div ref={boxRef} className="h-full w-full" />
      {picking && (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-full text-4xl leading-none">
          📍
        </div>
      )}
    </div>
  );
}
