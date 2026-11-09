"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchLibraryAudio } from "@/lib/engine";
import { nextRepeat, type RepeatMode } from "@/lib/playerOrder";
import { createPlaybackQueue, currentQueueId, selectQueueTrack, setQueueShuffle, stepPlaybackQueue, type PlaybackQueue } from "@/lib/playbackQueue";
import { EQ_FREQUENCIES, EQ_MAX, EQ_MIN, normalizeGains } from "@/lib/playerEq";
import { VISUALIZER_MODES, type VisualizerMode } from "./Visualizer";

/** 재생 속도 선택지(백로그 D-10 — 뮤직 플레이어 기능) */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

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
  // 백로그 D-10(2026-11-09): 뮤직 플레이어의 이퀄라이저 8밴드·프리앰프·재생 속도·시각화(소리 경로는 처음 재생할 때 한 번 만든다)
  eq: number[];
  setEqBand: (i: number, db: number) => void;
  setEq: (gains: number[]) => void;
  preamp: number;
  setPreamp: (db: number) => void;
  rate: number;
  setRate: (r: number) => void;
  visMode: VisualizerMode;
  cycleVis: () => void;
  /** 시각화용 분석기(소리 경로를 못 만들었으면 null — 그래도 재생은 됨) */
  analyser: AnalyserNode | null;
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
  const [eq, setEqState] = useState<number[]>(() => EQ_FREQUENCIES.map(() => 0));
  const [preamp, setPreampState] = useState(0);
  const [rate, setRateState] = useState(1);
  const [visMode, setVisMode] = useState<VisualizerMode>("bars");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const graph = useRef<{ ctx: AudioContext; pre: GainNode; filters: BiquadFilterNode[] } | null>(null);
  const graphTried = useRef(false);
  const eqRef = useRef(eq);
  eqRef.current = eq;
  const preampRef = useRef(preamp);
  preampRef.current = preamp;
  const modeLoaded = useRef(false);
  const volumeRef = useRef(1);
  volumeRef.current = volume;

  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem(MODE_KEY) ?? "{}") as { repeat?: RepeatMode; shuffle?: boolean; volume?: number; eq?: unknown; preamp?: unknown; rate?: unknown; vis?: unknown };
      if (m.eq !== undefined) setEqState(normalizeGains(m.eq));
      if (typeof m.preamp === "number" && m.preamp >= EQ_MIN && m.preamp <= EQ_MAX) setPreampState(m.preamp);
      if (typeof m.rate === "number" && (PLAYBACK_RATES as readonly number[]).includes(m.rate)) setRateState(m.rate);
      if (VISUALIZER_MODES.some((x) => x.id === m.vis)) setVisMode(m.vis as VisualizerMode);
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
      localStorage.setItem(MODE_KEY, JSON.stringify({ repeat, shuffle, volume, eq, preamp, rate, vis: visMode }));
    } catch {}
  }, [repeat, shuffle, volume, eq, preamp, rate, visMode]);

  // 이퀄라이저·프리앰프·속도 적용
  useEffect(() => {
    graph.current?.filters.forEach((f, i) => (f.gain.value = eq[i] ?? 0));
  }, [eq]);
  useEffect(() => {
    if (graph.current) graph.current.pre.gain.value = Math.pow(10, preamp / 20);
  }, [preamp]);
  useEffect(() => {
    const a = audio.current;
    if (a) {
      a.playbackRate = rate;
      a.defaultPlaybackRate = rate;
    }
  }, [rate]);

  /**
   * 소리 경로(audio → 프리앰프 → EQ 8밴드 → 분석기 → 출력)를 한 번만 만든다(같은 <audio>에 소스를 두 번 만들 수 없음 — 뮤직 플레이어 engine.ts 방식).
   * 음원은 엔진에서 받아 만든 blob 주소(같은 출처)라 소리가 막히지 않는다. 만들지 못하면 그냥 재생한다.
   */
  const ensureGraph = useCallback((a: HTMLAudioElement) => {
    if (graphTried.current) {
      if (graph.current?.ctx.state === "suspended") void graph.current.ctx.resume().catch(() => undefined);
      return;
    }
    graphTried.current = true;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const source = ctx.createMediaElementSource(a);
      const pre = ctx.createGain();
      pre.gain.value = Math.pow(10, preampRef.current / 20);
      const filters = EQ_FREQUENCIES.map((f, i) => {
        const b = ctx.createBiquadFilter();
        b.type = "peaking";
        b.frequency.value = f;
        b.Q.value = 1.4;
        b.gain.value = eqRef.current[i] ?? 0;
        return b;
      });
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.8;
      let node: AudioNode = source.connect(pre);
      for (const f of filters) node = node.connect(f);
      node.connect(an);
      an.connect(ctx.destination);
      graph.current = { ctx, pre, filters };
      setAnalyser(an);
    } catch {
      graph.current = null;
    }
  }, []);

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
      ensureGraph(a);
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
        a.playbackRate = a.defaultPlaybackRate;
        await a.play().catch(() => setPlaying(false));
      } catch {
        setError("이 곡의 음원을 내 PC 엔진에서 불러오지 못했습니다. 엔진이 켜져 있는지 확인해 주세요.");
        setPlaying(false);
      } finally {
        setLoading(false);
      }
    },
    [urlOf, ensureGraph]
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
      eq,
      setEqBand: (i, db) => setEqState((g) => g.map((v, k) => (k === i ? normalizeGains([...g.slice(0, i), db])[i] : v))),
      setEq: (gains) => setEqState(normalizeGains(gains)),
      preamp,
      setPreamp: (db) => setPreampState(Math.max(EQ_MIN, Math.min(EQ_MAX, Math.round(db)))),
      rate,
      setRate: (r) => setRateState((PLAYBACK_RATES as readonly number[]).includes(r) ? r : 1),
      visMode,
      cycleVis: () => setVisMode((m) => VISUALIZER_MODES[(VISUALIZER_MODES.findIndex((x) => x.id === m) + 1) % VISUALIZER_MODES.length].id),
      analyser,
    }),
    [current, playing, loading, error, time, duration, repeat, shuffle, queue, volume, start, step, commitQueue, eq, preamp, rate, visMode, analyser]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
