"use client";

import { useEffect, useState } from "react";
import { peaksFromChannels } from "@/lib/peaks";

// v1.12 실제 소리 파형 — 재생한 곡만 브라우저가 곡 파일을 한 번 더 받아 디코딩해 막대 값을 계산한다.
// 결과는 이 탭 메모리 + sessionStorage(`ams-peaks:<곡 키>`)에만 기억(서버 저장 없음). 실패하면 null → 장식 막대 유지.
const MAX_BYTES = 30 * 1024 * 1024;
const memory = new Map<string, number[]>();
const pending = new Map<string, Promise<number[] | null>>();

function readStored(key: string): number[] | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(`ams-peaks:${key}`) ?? "null");
    return Array.isArray(v) && v.every((x) => typeof x === "number") ? v : null;
  } catch { return null; }
}

async function compute(key: string, url: string, bars: number): Promise<number[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return null;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    try {
      const audio = await ctx.decodeAudioData(buf);
      const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, c) => audio.getChannelData(c));
      const peaks = peaksFromChannels(channels, bars);
      if (!peaks.length) return null;
      memory.set(key, peaks);
      try { sessionStorage.setItem(`ams-peaks:${key}`, JSON.stringify(peaks)); } catch { /* 저장 못 해도 계속 */ }
      return peaks;
    } finally { void ctx.close().catch(() => undefined); }
  } catch { return null; }
}

/** enabled가 true가 된 뒤(= 이 곡을 한 번 재생한 뒤) 실제 막대 값을 돌려준다. 그 전·실패 시 null. */
export function usePeaks(key: string, url: string, enabled: boolean, bars: number): number[] | null {
  const [peaks, setPeaks] = useState<number[] | null>(() => memory.get(key) ?? null);
  useEffect(() => {
    const known = memory.get(key) ?? readStored(key);
    if (known) { memory.set(key, known); setPeaks(known); return; }
    if (!enabled) return;
    let alive = true;
    let job = pending.get(key);
    if (!job) { job = compute(key, url, bars).finally(() => pending.delete(key)); pending.set(key, job); }
    void job.then((p) => { if (alive && p) setPeaks(p); });
    return () => { alive = false; };
  }, [key, url, enabled, bars]);
  return peaks;
}
