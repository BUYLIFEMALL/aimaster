"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { sceneVoices, type ShortsScript } from "@/lib/script";
import { normalizeAudio } from "@/lib/voice";
import { LEAD, segmentAt, timeline } from "@/lib/render/scene";

// 미리보기 소리: 장면 내레이션을 타임라인에 맞춰 재생하고, 배경음악은 목소리가 나올 때 볼륨을 자동으로 낮춘다(덕킹).
// 저장소 파일은 1시간 서명 주소로 받아 <audio>로 재생한다(MP4 출력 단계에서는 같은 파일을 디코딩해 섞는다).
export function useAudio(script: ShortsScript | null | undefined) {
  const els = useRef(new Map<string, HTMLAudioElement>());
  const [urls, setUrls] = useState<Record<string, string>>({});
  const asked = useRef(new Set<string>());
  // v1.24: 서명을 요청했는데 주소가 오지 않은 파일 = 30일 정리 등으로 지워진 파일(다시 만들어야 함)
  const [gone, setGone] = useState<Set<string>>(new Set());

  const paths = script ? [...sceneVoices(script).map((v) => v.voice?.path), normalizeAudio(script.audio).bgm?.path].filter((p): p is string => !!p) : [];
  const key = paths.slice().sort().join("|");
  useEffect(() => {
    const need = (key ? key.split("|") : []).filter((p) => !urls[p] && !asked.current.has(p));
    if (!need.length) return;
    need.forEach((p) => asked.current.add(p));
    fetch("/api/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: need }) })
      .then((r) => r.json()).then((d) => {
        if (!d.urls) return; // 요청 자체가 실패하면 지워졌다고 판단하지 않는다
        if (Object.keys(d.urls).length) setUrls((u) => ({ ...u, ...d.urls }));
        const miss = need.length <= 60 ? need.filter((p) => !d.urls[p]) : []; if (miss.length)  /* 서명 API는 한 번에 60개까지 */ setGone((g) => new Set([...g, ...miss]));
      }).catch(() => undefined);
  }, [key, urls]);

  const el = useCallback((path: string, loop = false) => {
    const src = urls[path]; if (!src) return null;
    let a = els.current.get(path);
    if (!a) { a = new Audio(); a.preload = "auto"; a.crossOrigin = "anonymous"; a.loop = loop; a.src = src; els.current.set(path, a); }
    return a;
  }, [urls]);

  const stopAll = useCallback(() => { els.current.forEach((a) => a.pause()); }, []);

  /** 시각 t에 맞춰 소리 상태를 맞춘다(재생 중 매 프레임 호출해도 가볍다) */
  const sync = useCallback((t: number, playing: boolean) => {
    if (!script) return;
    const { segs } = timeline(script); const seg = segmentAt(segs, t); const idx = segs.indexOf(seg);
    const vs = sceneVoices(script); let speaking = false;
    vs.forEach((v, i) => {
      if (!v.voice) return; const a = el(v.voice.path); if (!a) return;
      const target = t - segs[i].start - LEAD;
      if (playing && i === idx && target >= 0 && target < v.voice.dur) {
        speaking = true;
        if (a.paused || Math.abs(a.currentTime - target) > 0.35) { a.currentTime = target; void a.play().catch(() => undefined); }
      } else if (!a.paused) a.pause();
    });
    const bgm = normalizeAudio(script.audio).bgm;
    if (bgm) {
      const b = el(bgm.path, true);
      if (b) {
        b.volume = Math.min(1, bgm.volume * (speaking ? 0.35 : 1));
        if (playing) {
          const d = b.duration || 0; const target = d ? t % d : t;
          if (b.paused || (d && Math.abs(b.currentTime - target) > 0.6)) { b.currentTime = target; void b.play().catch(() => undefined); }
        } else if (!b.paused) b.pause();
      }
    }
  }, [script, el]);

  useEffect(() => () => { els.current.forEach((a) => a.pause()); }, []);
  return { sync, stopAll, urls, gone };
}
