"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchLibraryAudio } from "@/lib/engine";
import { nextRepeat, type RepeatMode } from "@/lib/playerOrder";
import { createPlaybackQueue, currentQueueId, selectQueueTrack, setQueueShuffle, stepPlaybackQueue, type PlaybackQueue } from "@/lib/playbackQueue";

// 화면 아래 재생바 — ai-music-studio `PlayerProvider`(v1.11~1.12) 방식을 가져옴(2026-11-04).
// 다른 점: 곡은 회원 PC 엔진 보관함에 있어 재생할 때 받아 온다(브라우저 안 주소, 최근 20곡만 기억).
// 반복·무작위 설정은 이 브라우저에만 기억한다. 다음 곡 고르기는 원본 boks-music `playback-queue.mjs`(MIT) 규칙(2026-11-06, lib/playbackQueue.ts).
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
  /** 음량 0~1(이 브라우저에 기억) */
  volume: number;
  setVolume: (v: number) => void;
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
  const pq = useRef<PlaybackQueue | null>(null);
  const urls = useRef(new Map<string, string>());
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [volume, setVolume] = useState(1);
  const modeLoaded = useRef(false);
  const volumeRef = useRef(1);
  volumeRef.current = volume;

  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem(MODE_KEY) ?? "{}") as { repeat?: RepeatMode; shuffle?: boolean; volume?: number };
      if (m.repeat === "off" || m.repeat === "all" || m.repeat === "one") setRepeat(m.repeat);
      if (typeof m.shuffle === "boolean") setShuffle(m.shuffle);
      if (typeof m.volume === "number" && m.volume >= 0 && m.volume <= 1) setVolume(m.volume);
    } catch {}
    modeLoaded.current = true;
  }, []);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
    if (!modeLoaded.current) return;
    try {
      localStorage.setItem(MODE_KEY, JSON.stringify({ repeat, shuffle, volume }));
    } catch {}
  }, [repeat, shuffle, volume]);

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
    async (t: PlayerTrack) => {
      const a = audio.current ?? (audio.current = new Audio());
      a.volume = volumeRef.current;
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

  // 대기열 순서(섞은 순서 포함)를 바꾸면 패널에 보이는 목록도 그 순서로
  const commitQueue = useCallback((q: PlaybackQueue | null) => {
    pq.current = q;
    const byKey = new Map(list.current.map((t) => [t.key, t]));
    setQueue(q ? q.order.map((k) => byKey.get(k)).filter((t): t is PlayerTrack => !!t) : []);
  }, []);

  const step = useCallback(
    (dir: 1 | -1, ended = false) => {
      const q = pq.current;
      const next = q ? stepPlaybackQueue(q, { direction: dir, ended }) : null;
      const t = next ? list.current.find((x) => x.key === currentQueueId(next)) : null;
      if (next && t) {
        if (next.order !== q?.order) commitQueue(next);
        else pq.current = next;
        void start(t);
      } else {
        audio.current?.pause();
        setPlaying(false);
      }
    },
    [start, commitQueue]
  );

  // 반복 설정이 바뀌면 지금 대기열에도 바로 적용
  useEffect(() => {
    if (pq.current) pq.current = { ...pq.current, repeat };
  }, [repeat]);

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

  // 단축키 — 원본 boks-music `App.tsx`(MIT): Space 재생/멈춤, ←/→ 5초(Shift 15초). 글 입력 중·창이 열려 있으면 동작하지 않는다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = audio.current;
      if (!current || !a || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']") || document.querySelector("dialog[open], [role='dialog']")) return;
      if (e.code === "Space" && !(el instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (a.paused) void a.play();
        else a.pause();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const d = (e.shiftKey ? 15 : 5) * (e.key === "ArrowLeft" ? -1 : 1);
        a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + d));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  // 키보드·이어폰 미디어 키와 윈도우 미디어 창(mediaSession)
  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms) return;
    ms.metadata = current ? new MediaMetadata({ title: current.title, artist: "AI 무료음악", album: current.subtitle }) : null;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(a, h);
      } catch {}
    };
    set("play", current ? () => void audio.current?.play() : null);
    set("pause", current ? () => audio.current?.pause() : null);
    set("nexttrack", current ? () => step(1) : null);
    set("previoustrack", current ? () => step(-1) : null);
    set("seekto", current ? (d) => { if (audio.current && d.seekTime != null) audio.current.currentTime = d.seekTime; } : null);
  }, [current, step]);

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
      volume,
      setVolume: (v) => setVolume(Math.max(0, Math.min(1, v))),
      jump: (key) => {
        const t = list.current.find((x) => x.key === key);
        if (!t || t.key === current?.key || !pq.current) return;
        pq.current = selectQueueTrack(pq.current, key);
        void start(t);
      },
      playList: (items, startKey) => {
        const t = items.find((x) => x.key === startKey) ?? items[0];
        if (!t) return;
        const a = audio.current;
        if (current?.key === t.key && a?.src) {
          if (a.paused) void a.play();
          else a.pause();
          return;
        }
        list.current = items;
        // 고른 곡부터 — 섞어 듣기면 그 곡을 맨 앞에 두고 나머지를 섞는다(원본 규칙)
        let q = selectQueueTrack(createPlaybackQueue(items.map((x) => x.key), { repeat }), t.key);
        if (shuffle) q = setQueueShuffle(q, true);
        commitQueue(q);
        void start(t);
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
      toggleShuffle: () => {
        if (pq.current) commitQueue(setQueueShuffle(pq.current, !shuffle));
        setShuffle(!shuffle);
      },
      close: () => {
        audio.current?.pause();
        setCurrent(null);
      },
    }),
    [current, playing, loading, error, time, duration, repeat, shuffle, queue, volume, start, step, commitQueue]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
