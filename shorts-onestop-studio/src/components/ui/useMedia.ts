"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Bg, ShortsScript } from "@/lib/script";

// 장면 배경 미디어를 브라우저에 불러와 캔버스에 그릴 수 있게 둔다(미리보기·MP4 공용).
// 스톡 CDN은 CORS를 허용하므로 crossOrigin="anonymous"로 불러와 캔버스가 오염되지 않게 한다(MP4 출력 대비).
// AI 이미지는 저장소 경로(path)를 서버에서 1시간 서명 주소로 바꿔 쓴다.
type El = HTMLImageElement | HTMLVideoElement;

export function allBgs(s: ShortsScript | null | undefined): Bg[] {
  if (!s) return [];
  return [s.backdrop?.global, s.intro.bg, ...s.cards.map((c) => c.bg), s.outro.bg].filter((b): b is Bg => !!b);
}

export function useMedia(script: ShortsScript | null | undefined) {
  const cache = useRef(new Map<string, El>());
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [tick, setTick] = useState(0);
  const asked = useRef(new Set<string>()); // 같은 경로를 반복 요청하지 않는다(실패해도 무한 재요청 방지)

  // AI 이미지 경로 → 서명 주소
  // v1.23: AI 영상의 첫 화면 사진(poster)도 썸네일·이어 붙이기용으로 서명 주소를 받는다
  const pathKey = allBgs(script).flatMap((b) => [b.path, b.poster?.path]).filter((p): p is string => !!p).sort().join("|");
  useEffect(() => {
    const paths = pathKey ? pathKey.split("|") : [];
    const need = paths.filter((p) => !signed[p] && !asked.current.has(p));
    if (!need.length) return;
    need.forEach((p) => asked.current.add(p));
    fetch("/api/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: need }) })
      .then((r) => r.json()).then((d) => { if (d.urls && Object.keys(d.urls).length) setSigned((s) => ({ ...s, ...d.urls })); }).catch(() => undefined);
  }, [pathKey, signed]);

  // Pixabay 사진·영상: 저장된 번호로 새 주소를 받는다(임시 주소 만료 대응). 받기 전에는 저장된 주소를 그대로 시도
  const [fresh, setFresh] = useState<Record<string, string>>({});
  const pbKey = allBgs(script).flatMap((b) => [b, b.poster]).filter((b): b is Bg => !!b && b.source === "pixabay" && !!b.stockId).map((b) => `${b.type}:${b.stockId}`).sort().join("|");
  useEffect(() => {
    const items = (pbKey ? pbKey.split("|") : []).map((k) => { const [type, id] = k.split(":"); return { type, id }; }).filter((x) => !asked.current.has(`pb:${x.id}`));
    if (!items.length) return;
    items.forEach((x) => asked.current.add(`pb:${x.id}`));
    fetch("/api/stock/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      .then((r) => r.json()).then((d) => { if (d.urls && Object.keys(d.urls).length) setFresh((f) => ({ ...f, ...Object.fromEntries(Object.entries(d.urls as Record<string, { src: string }>).map(([k, v]) => [k, v.src])) })); }).catch(() => undefined);
  }, [pbKey]);
  const srcOf = useCallback((b: Bg) => (b.path ? signed[b.path] ?? "" : b.source === "pixabay" && b.stockId && fresh[b.stockId] ? fresh[b.stockId] : b.src), [signed, fresh]);

  // 필요한 요소 불러오기
  useEffect(() => {
    for (const b of allBgs(script).flatMap((x) => (x.poster ? [x, x.poster] : [x]))) { // v1.23: AI 영상의 첫 화면 사진도 미리 불러 둔다(영상 로딩 중 대신 표시)
      const src = srcOf(b); const key = b.path ?? (b.stockId ? `${b.source}:${b.stockId}:${src}` : b.src);
      if (!src || cache.current.has(key)) continue;
      if (b.type === "video") {
        const v = document.createElement("video");
        v.crossOrigin = "anonymous"; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
        v.onloadeddata = () => { setTick((n) => n + 1); void v.play().catch(() => undefined); };
        v.src = src; cache.current.set(key, v);
      } else {
        const img = new Image(); img.crossOrigin = "anonymous"; img.decoding = "async";
        img.onload = () => setTick((n) => n + 1); img.src = src; cache.current.set(key, img);
      }
    }
  }, [script, srcOf]);

  // 다 그릴 수 있는 상태만 돌려준다(아직 로딩 중이면 null → 테마 배경)
  const resolve = useCallback((b: Bg): CanvasImageSource | null => {
    const el = cache.current.get(b.path ?? (b.stockId ? `${b.source}:${b.stockId}:${srcOf(b)}` : b.src));
    const ready = !el ? null : el instanceof HTMLVideoElement ? (el.readyState >= 2 ? el : null) : el.complete && el.naturalWidth > 0 ? el : null;
    if (ready) return ready;
    // AI 영상을 아직 받는 중이면 첫 화면 사진을 대신 보여 준다(테마 배경으로 깜빡이지 않게)
    const p = b.poster; if (!p) return null;
    const pe = cache.current.get(p.path ?? (p.stockId ? `${p.source}:${p.stockId}:${srcOf(p)}` : p.src));
    return pe instanceof HTMLImageElement && pe.complete && pe.naturalWidth > 0 ? pe : null;
  }, [srcOf]);

  return { resolve, srcOf, tick };
}
