"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { nextRepeat, pickNext, pickPrev, type RepeatMode } from "@/lib/playerOrder";

// v1.11 화면 아래 고정 미니 플레이어 — 곡 카드의 재생 버튼이 한 플레이어로 듣고, 끝나면 화면에 보이는 다음 곡으로 넘어간다.
// v1.12 반복(끔·목록·한 곡)·무작위 — 순서 규칙은 lib/playerOrder.ts, 설정은 이 브라우저 localStorage에만 기억.
// 곡 주소는 1시간 서명 주소(기존 그대로). 플레이어는 브라우저 안에서만 동작하고 서버에 아무것도 저장하지 않는다.
export interface Track { key: string; url: string; title: string; modelName: string; provider: string }

interface PlayerValue {
  current: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  toggle: (t: Track) => void;
  register: (t: Track) => () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  close: () => void;
}

const MODE_KEY = "ams-player-mode";

const PlayerContext = createContext<PlayerValue | null>(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const tracks = useRef<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const history = useRef<string[]>([]);

  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem(MODE_KEY) ?? "{}") as { repeat?: RepeatMode; shuffle?: boolean };
      if (m.repeat === "off" || m.repeat === "all" || m.repeat === "one") setRepeat(m.repeat);
      if (typeof m.shuffle === "boolean") setShuffle(m.shuffle);
    } catch { /* 기억 못 해도 기본값으로 동작 */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, JSON.stringify({ repeat, shuffle })); } catch { /* 무시 */ }
  }, [repeat, shuffle]);

  const start = useCallback((t: Track, from?: Track | null) => {
    const a = audio.current ?? (audio.current = new Audio());
    if (from && from.key !== t.key) history.current = [...history.current, from.key].slice(-50);
    if (a.src !== t.url) { a.src = t.url; setTime(0); setDuration(0); }
    else a.currentTime = 0; // 한 곡 반복·같은 곡 다시
    setCurrent(t);
    void a.play().catch(() => setPlaying(false));
  }, []);

  const step = useCallback((dir: 1 | -1, ended = false) => {
    const list = tracks.current;
    const keys = list.map((t) => t.key);
    const key = current?.key ?? null;
    let n: number | null;
    if (dir === 1) n = pickNext(keys, key, { repeat, shuffle, ended });
    else {
      n = pickPrev(keys, key, { repeat, shuffle, history: history.current });
      // 무작위 이전 곡은 기록을 거슬러 올라간다(앞으로 다시 쌓이지 않게 지금 곡까지 잘라 냄)
      if (n != null && shuffle) { const at = history.current.lastIndexOf(list[n].key); history.current = history.current.slice(0, Math.max(0, at)); }
    }
    if (n != null && list[n]) start(list[n], dir === 1 ? current : null);
    else { audio.current?.pause(); setPlaying(false); }
  }, [current, repeat, shuffle, start]);

  useEffect(() => {
    const a = audio.current ?? (audio.current = new Audio());
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    a.addEventListener("play", onPlay); a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime); a.addEventListener("loadedmetadata", onMeta);
    return () => { a.removeEventListener("play", onPlay); a.removeEventListener("pause", onPause); a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onMeta); };
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onEnd = () => step(1, true);
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, [step]);

  useEffect(() => () => { audio.current?.pause(); }, []);

  const value = useMemo<PlayerValue>(() => ({
    current, playing, time, duration, repeat, shuffle,
    cycleRepeat: () => setRepeat((m) => nextRepeat(m)),
    toggleShuffle: () => setShuffle((v) => !v),
    toggle: (t) => {
      const a = audio.current;
      if (current?.key === t.key && a) { if (a.paused) void a.play(); else a.pause(); return; }
      start(t, current);
    },
    register: (t) => {
      // 이미 있으면 그 자리에서 바꾼다(주소가 새로 서명돼도 화면 순서 유지)
      tracks.current = tracks.current.some((x) => x.key === t.key) ? tracks.current.map((x) => (x.key === t.key ? t : x)) : [...tracks.current, t];
      return () => { tracks.current = tracks.current.filter((x) => x.key !== t.key); };
    },
    next: () => step(1),
    prev: () => step(-1),
    seek: (s) => { if (audio.current) audio.current.currentTime = s; },
    close: () => { audio.current?.pause(); setCurrent(null); },
  }), [current, playing, time, duration, repeat, shuffle, start, step]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
