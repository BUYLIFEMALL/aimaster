"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchLibraryAudio } from "@/lib/engine";
import { nextRepeat, pickNext, pickPrev, type RepeatMode } from "@/lib/playerOrder";

// 화면 아래 재생바 — ai-music-studio `PlayerProvider`(v1.11~1.12) 방식을 가져옴(2026-11-04).
// 다른 점: 곡은 회원 PC 엔진 보관함에 있어 재생할 때 받아 온다(브라우저 안 주소, 최근 20곡만 기억).
// 반복·무작위 설정은 이 브라우저에만 기억한다. 재생 목록은 화면이 넘겨준 곡 순서 그대로.
export interface PlayerTrack {
  /** 곡 번호(보관함 파일 이름) */
  key: string;
  title: string;
  subtitle: string;
}

interface PlayerValue {
  current: PlayerTrack | null;
  playing: boolean;
  loading: boolean;
  error: string;
  time: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  /** 지금 재생 목록(화면이 넘겨준 순서) — 대기열 패널 */
  queue: PlayerTrack[];
  /** 대기열에서 고른 곡으로 바로 */
  jump: (key: string) => void;
  /** 재생 목록을 정하고 그중 한 곡(없으면 첫 곡)부터 */
  playList: (list: PlayerTrack[], startKey?: string) => void;
  /** 지금 곡이면 멈춤·이어 듣기 */
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  close: () => void;
}

const MODE_KEY = "fms-player-mode";
const CACHE_MAX = 20;

const PlayerContext = createContext<PlayerValue | null>(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const list = useRef<PlayerTrack[]>([]);
  const urls = useRef(new Map<string, string>());
  const history = useRef<string[]>([]);
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);

  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem(MODE_KEY) ?? "{}") as { repeat?: RepeatMode; shuffle?: boolean };
      if (m.repeat === "off" || m.repeat === "all" || m.repeat === "one") setRepeat(m.repeat);
      if (typeof m.shuffle === "boolean") setShuffle(m.shuffle);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, JSON.stringify({ repeat, shuffle }));
    } catch {}
  }, [repeat, shuffle]);

  const urlOf = useCallback(async (key: string) => {
    const have = urls.current.get(key);
    if (have) return have;
    const url = await fetchLibraryAudio(key);
    urls.current.set(key, url);
    if (urls.current.size > CACHE_MAX) {
      const [oldKey, oldUrl] = urls.current.entries().next().value as [string, string];
      URL.revokeObjectURL(oldUrl);
      urls.current.delete(oldKey);
    }
    return url;
  }, []);

  const start = useCallback(
    async (t: PlayerTrack, from: PlayerTrack | null) => {
      const a = audio.current ?? (audio.current = new Audio());
      if (from && from.key !== t.key) history.current = [...history.current, from.key].slice(-50);
      setCurrent(t);
      setError("");
      setLoading(true);
      try {
        const url = await urlOf(t.key);
        if (a.src !== url) {
          a.src = url;
          setTime(0);
          setDuration(0);
        } else a.currentTime = 0;
        await a.play().catch(() => setPlaying(false));
      } catch {
        setError("이 곡의 음원을 내 PC 엔진에서 불러오지 못했습니다. 엔진이 켜져 있는지 확인해 주세요.");
        setPlaying(false);
      } finally {
        setLoading(false);
      }
    },
    [urlOf]
  );

  const step = useCallback(
    (dir: 1 | -1, ended = false) => {
      const items = list.current;
      const keys = items.map((t) => t.key);
      const key = current?.key ?? null;
      let n: number | null;
      if (dir === 1) n = pickNext(keys, key, { repeat, shuffle, ended });
      else {
        n = pickPrev(keys, key, { repeat, shuffle, history: history.current });
        if (n != null && shuffle) {
          const at = history.current.lastIndexOf(items[n].key);
          history.current = history.current.slice(0, Math.max(0, at));
        }
      }
      if (n != null && items[n]) void start(items[n], dir === 1 ? current : null);
      else {
        audio.current?.pause();
        setPlaying(false);
      }
    },
    [current, repeat, shuffle, start]
  );

  useEffect(() => {
    const a = audio.current ?? (audio.current = new Audio());
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onEnd = () => step(1, true);
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, [step]);

  useEffect(
    () => () => {
      audio.current?.pause();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    []
  );

  const value = useMemo<PlayerValue>(
    () => ({
      current,
      playing,
      loading,
      error,
      time,
      duration,
      repeat,
      shuffle,
      queue,
      jump: (key) => {
        const t = list.current.find((x) => x.key === key);
        if (t && t.key !== current?.key) void start(t, current);
      },
      playList: (items, startKey) => {
        list.current = items;
        setQueue(items);
        const t = items.find((x) => x.key === startKey) ?? items[0];
        if (!t) return;
        const a = audio.current;
        if (current?.key === t.key && a?.src) {
          if (a.paused) void a.play();
          else a.pause();
          return;
        }
        void start(t, current);
      },
      toggle: () => {
        const a = audio.current;
        if (!a || !current) return;
        if (a.paused) void a.play();
        else a.pause();
      },
      next: () => step(1),
      prev: () => step(-1),
      seek: (s) => {
        if (audio.current) audio.current.currentTime = s;
      },
      cycleRepeat: () => setRepeat((m) => nextRepeat(m)),
      toggleShuffle: () => setShuffle((v) => !v),
      close: () => {
        audio.current?.pause();
        setCurrent(null);
      },
    }),
    [current, playing, loading, error, time, duration, repeat, shuffle, queue, start, step]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
