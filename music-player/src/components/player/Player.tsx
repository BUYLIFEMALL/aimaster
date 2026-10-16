"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown, AudioLines, Disc3, FilePlus, FolderPlus, Image as ImageIcon, ListMusic, Music, Pause, Play, Repeat, Repeat1,
  Search, Shuffle, SkipBack, SkipForward, SlidersHorizontal, Trash2, Volume2, VolumeX, X, CircleAlert,
} from "lucide-react";
import { AudioEngine } from "@/lib/player/engine";
import { parseId3, type LegacyTagEncoding } from "@/lib/player/id3";
import { formatBytes, formatTime, isAudioFile, parseFileName } from "@/lib/player/format";
import { SORT_LABEL, filterSort, nextOf, nextSort, prevOf, type QueueState } from "@/lib/player/queue";
import {
  clearAll, deleteTracks, estimateUsage, getBlob, getCover, listTracks, loadSettings, openStore, putTrack, saveSettings, updateTrackText, type PlayerStore,
} from "@/lib/player/storage";
import { DEFAULT_SETTINGS, type PlayerSettings, type RepeatMode, type TrackMeta, type VisualizerMode } from "@/lib/player/types";
import { Visualizer } from "./Visualizer";
import { Equalizer } from "./Equalizer";

const MODES: { id: VisualizerMode; label: string }[] = [
  { id: "bars", label: "막대" },
  { id: "circle", label: "원형" },
  { id: "dots", label: "점" },
  { id: "wave", label: "파형" },
  { id: "line", label: "곡선" },
];
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const REPEAT_NEXT: Record<RepeatMode, RepeatMode> = { none: "all", all: "one", one: "none" };
const REPEAT_LABEL: Record<RepeatMode, string> = { none: "반복 안 함", all: "전체 반복", one: "한 곡 반복" };

async function readId3(file: Blob, legacyEncoding: LegacyTagEncoding = "auto") {
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return null;
    const size = ((head[6] & 0x7f) << 21) | ((head[7] & 0x7f) << 14) | ((head[8] & 0x7f) << 7) | (head[9] & 0x7f);
    const len = Math.min(size + 10, 12 * 1024 * 1024);
    return parseId3(await file.slice(0, len).arrayBuffer(), legacyEncoding);
  } catch {
    return null;
  }
}

function probeDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("audio");
    let done = false;
    const finish = (d: number) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      a.removeAttribute("src");
      resolve(Number.isFinite(d) && d > 0 ? d : 0);
    };
    a.preload = "metadata";
    a.onloadedmetadata = () => finish(a.duration);
    a.onerror = () => finish(0);
    setTimeout(() => finish(0), 5000);
    a.src = url;
  });
}

function newId(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Player({ userId }: { userId: string }) {
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [db, setDb] = useState<PlayerStore | null>(null);
  const [ready, setReady] = useState(false);
  const [tracks, setTracks] = useState<TrackMeta[]>([]);
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [eqOpen, setEqOpen] = useState(false);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onOk: () => void } | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [unsaved, setUnsaved] = useState<Set<string>>(new Set());
  const [helpKeys, setHelpKeys] = useState(false);
  const [legacyEncoding, setLegacyEncoding] = useState<LegacyTagEncoding>("auto");
  const editBusy = useRef(false);

  const blobCache = useRef(new Map<string, Blob>());
  const urlRef = useRef<string | null>(null);
  const playedRef = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const say = useCallback((text: string, kind: "ok" | "error" = "ok") => setToast({ text, kind }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.kind === "error" ? 7000 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- 엔진·저장소 열기 ----
  useEffect(() => {
    const e = new AudioEngine();
    setEngine(e);
    return () => e.dispose();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let opened: PlayerStore | null = null;
    (async () => {
      try {
        const store = await openStore(userId);
        opened = store;
        const [list, s] = await Promise.all([listTracks(store), loadSettings(store)]);
        if (cancelled) { store.close(); return; }
        setDb(store);
        setTracks(list);
        setSettings({ ...s, currentId: s.currentId && list.some((t) => t.id === s.currentId) ? s.currentId : null });
      } catch {
        if (!cancelled) say("이 브라우저에서는 재생목록을 저장할 수 없습니다. 파일은 이번 접속 동안만 유지됩니다.", "error");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; opened?.close(); };
  }, [userId, say]);

  // 설정 자동 저장
  useEffect(() => {
    if (!db || !ready) return;
    const t = setTimeout(() => { void saveSettings(db, settings).catch(() => undefined); }, 400);
    return () => clearTimeout(t);
  }, [db, ready, settings]);

  // 설정 → 소리 엔진
  useEffect(() => { engine?.setVolume(settings.volume, settings.muted); }, [engine, settings.volume, settings.muted]);
  useEffect(() => { engine?.setEq(settings.eqGains); }, [engine, settings.eqGains]);
  useEffect(() => { engine?.setPreamp(settings.preamp); }, [engine, settings.preamp]);
  useEffect(() => { engine?.setRate(settings.rate); }, [engine, settings.rate]);

  const patch = useCallback((p: Partial<PlayerSettings>) => setSettings((s) => ({ ...s, ...p })), []);

  // ---- 표시 목록 ----
  const visible = useMemo(() => filterSort(tracks, search, settings.sortKey, settings.sortDir), [tracks, search, settings.sortKey, settings.sortDir]);
  const order = useMemo(() => visible.map((t) => t.id), [visible]);
  const current = useMemo(() => tracks.find((t) => t.id === settings.currentId) ?? null, [tracks, settings.currentId]);

  // 최신 값 보관(이벤트 핸들러가 오래된 값을 쓰지 않게)
  const live = useRef({ order, settings, tracks, engine, duration, time, db });
  live.current = { order, settings, tracks, engine, duration, time, db };

  // ---- 곡 불러오기·재생 ----
  const blobOf = useCallback(async (id: string): Promise<Blob | null> => {
    const cached = blobCache.current.get(id);
    if (cached) return cached;
    if (!db) return null;
    const b = await getBlob(db, id).catch(() => null);
    if (b) blobCache.current.set(id, b);
    return b;
  }, [db]);

  const selectTrack = useCallback(async (id: string, play: boolean) => {
    const e = live.current.engine;
    if (!e) return;
    const blob = await blobOf(id);
    if (!blob) {
      say("이 곡의 파일을 찾을 수 없습니다. 목록에서 삭제하고 다시 추가해 주세요.", "error");
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    e.audio.src = url;
    e.setRate(live.current.settings.rate);
    setTime(0);
    setDuration(live.current.tracks.find((t) => t.id === id)?.duration ?? 0);
    setSettings((s) => ({ ...s, currentId: id }));
    if (play) {
      setAnalyser(e.ensure());
      await e.resume();
      try { await e.audio.play(); } catch { say("재생을 시작하지 못했습니다. 다시 눌러 주세요.", "error"); }
    }
  }, [blobOf, say]);

  // 저장된 마지막 곡을 일시정지 상태로 준비
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || !engine || restored.current) return;
    restored.current = true;
    if (settings.currentId) void selectTrack(settings.currentId, false);
  }, [ready, engine, settings.currentId, selectTrack]);

  const queueState = useCallback((): QueueState => ({
    currentId: live.current.settings.currentId,
    shuffle: live.current.settings.shuffle,
    repeat: live.current.settings.repeat,
    played: playedRef.current,
  }), []);

  const goNext = useCallback((manual: boolean) => {
    const r = nextOf(live.current.order, queueState(), manual);
    playedRef.current = r.played;
    if (r.id) void selectTrack(r.id, true);
    else { live.current.engine?.audio.pause(); setPlaying(false); }
  }, [queueState, selectTrack]);

  const goPrev = useCallback(() => {
    const e = live.current.engine;
    const r = prevOf(live.current.order, queueState(), e?.audio.currentTime ?? 0);
    playedRef.current = r.played;
    if (r.restart && e) { e.audio.currentTime = 0; setTime(0); return; }
    if (r.id) void selectTrack(r.id, true);
  }, [queueState, selectTrack]);

  const togglePlay = useCallback(async () => {
    const e = live.current.engine;
    if (!e) return;
    if (!live.current.settings.currentId) {
      const first = live.current.order[0];
      if (first) void selectTrack(first, true);
      return;
    }
    if (e.audio.paused) {
      setAnalyser(e.ensure());
      await e.resume();
      try { await e.audio.play(); } catch { say("재생을 시작하지 못했습니다.", "error"); }
    } else e.audio.pause();
  }, [selectTrack, say]);

  // 오디오 요소 이벤트
  useEffect(() => {
    if (!engine) return;
    const a = engine.audio;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => {
      if (!Number.isFinite(a.duration) || a.duration <= 0) return;
      setDuration(a.duration);
      // 길이를 미리 읽지 못했던 곡은 재생 시 알게 된 길이를 목록과 저장소에 반영한다
      const id = live.current.settings.currentId;
      const meta = id ? live.current.tracks.find((t) => t.id === id) : null;
      if (meta && !meta.duration) {
        const next = { ...meta, duration: a.duration };
        setTracks((ts) => ts.map((t) => (t.id === next.id ? next : t)));
        const store = live.current.db;
        if (store) void store.put("tracks", next).catch(() => undefined);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (live.current.settings.repeat === "one") { a.currentTime = 0; void a.play(); return; }
      goNext(false);
    };
    const onError = () => { if (a.src) say("이 파일은 재생할 수 없습니다. 지원하지 않는 형식이거나 파일이 손상되었을 수 있습니다.", "error"); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, [engine, goNext, say]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  // ---- 파일 추가 ----
  const addFiles = useCallback(async (input: File[]) => {
    if (editBusy.current) { say("현재 작업이 끝난 후 다시 시도해 주세요.", "error"); return; }
    const files = input.filter((f) => isAudioFile(f));
    const skipped = input.length - files.length;
    if (files.length === 0) {
      say(input.length ? "오디오 파일이 아닙니다. mp3·m4a·wav·flac·ogg 파일을 추가해 주세요." : "추가할 파일이 없습니다.", "error");
      return;
    }
    editBusy.current = true;
    try {
      let added = 0, dup = 0, fail = 0;
      const metas: TrackMeta[] = [];
      const existing = new Set(live.current.tracks.map((t) => `${t.name}|${t.artist}|${t.size}`));
      for (let i = 0; i < files.length; i += 1) {
        setBusy(`추가 중… ${i + 1}/${files.length}`);
        const file = files[i];
        const id3 = await readId3(file, legacyEncoding);
        const fromName = parseFileName(file.name);
        const name = id3?.title || fromName.name;
        const artist = id3?.artist || fromName.artist;
        const key = `${name}|${artist}|${file.size}`;
        if (existing.has(key)) { dup += 1; continue; }
        existing.add(key);
        const dur = await probeDuration(file);
        const cover = id3?.cover ? new Blob([id3.cover.data as BlobPart], { type: id3.cover.mime }) : null;
        const meta: TrackMeta = {
          id: newId(), name, artist, album: id3?.album ?? "", duration: dur, size: file.size,
          mime: file.type || "audio/mpeg", addedAt: Date.now() + i, hasCover: !!cover,
        };
        blobCache.current.set(meta.id, file);
        if (db) {
          try { await putTrack(db, meta, file, cover); }
          catch {
            fail += 1;
            setUnsaved((s) => new Set(s).add(meta.id));
          }
        } else setUnsaved((s) => new Set(s).add(meta.id));
        if (cover) setCoverUrls((c) => ({ ...c, [meta.id]: URL.createObjectURL(cover) }));
        metas.push(meta);
        added += 1;
      }
      setBusy(null);
      if (metas.length) {
        setTracks((t) => [...t, ...metas]);
        if (!live.current.settings.currentId) void selectTrack(metas[0].id, false);
      }
      const parts = [`${added}곡을 추가했습니다.`];
      if (dup) parts.push(`${dup}곡은 이미 있어 건너뛰었습니다.`);
      if (skipped) parts.push(`오디오가 아닌 파일 ${skipped}개는 제외했습니다.`);
      if (fail) parts.push(`${fail}곡은 저장 공간이 부족해 이번 접속 동안만 유지됩니다.`);
      say(parts.join(" "), fail ? "error" : "ok");
      void estimateUsage().then(setUsage);
    } finally { editBusy.current = false; setBusy(null); }
  }, [db, say, selectTrack, legacyEncoding]);

  const refreshTags = useCallback(async () => {
    if (editBusy.current) return;
    editBusy.current = true;
    const targets = live.current.tracks.filter((t) => selected.size === 0 || selected.has(t.id));
    const store = live.current.db;
    const changes = new Map<string, Pick<TrackMeta, "name" | "artist" | "album">>();
    let failed = 0, unchanged = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        if (live.current.db !== store) return;
        setBusy(`곡 정보 복구 중… ${i + 1}/${targets.length}`);
        const track = targets[i];
        try {
          const blob = await blobOf(track.id);
          if (!blob) { failed++; continue; }
          const tags = await readId3(blob, legacyEncoding);
          const text = { name: tags?.title || track.name, artist: tags?.artist || track.artist, album: tags?.album || track.album };
          if (text.name === track.name && text.artist === track.artist && text.album === track.album) { unchanged++; continue; }
          if (live.current.db !== store) return;
          if (store && !unsaved.has(track.id) && !await updateTrackText(store, track.id, text)) { failed++; continue; }
          changes.set(track.id, text);
        } catch { failed++; }
      }
      setTracks((list) => list.map((t) => changes.has(t.id) ? { ...t, ...changes.get(t.id)! } : t));
      say(`${changes.size}곡의 정보를 복구했습니다. ${unchanged}곡은 변경할 정보가 없습니다.${failed ? ` ${failed}곡은 읽기·저장에 실패해 기존 정보를 유지했습니다.` : ""}`, failed ? "error" : "ok");
    } finally { editBusy.current = false; setBusy(null); }
  }, [blobOf, legacyEncoding, selected, unsaved, say]);

  useEffect(() => { void estimateUsage().then(setUsage); }, [ready]);

  // 저장된 곡의 커버 이미지 불러오기
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    (async () => {
      for (const t of tracks) {
        if (cancelled) return;
        if (!t.hasCover || coverUrls[t.id]) continue;
        const blob = await getCover(db, t.id).catch(() => null);
        if (blob && !cancelled) setCoverUrls((c) => (c[t.id] ? c : { ...c, [t.id]: URL.createObjectURL(blob) }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, tracks]);
  useEffect(() => () => { Object.values(coverUrls).forEach((u) => URL.revokeObjectURL(u)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 삭제 ----
  const removeIds = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const e = live.current.engine;
    const cur = live.current.settings.currentId;
    if (cur && ids.includes(cur) && e) {
      e.audio.pause();
      e.audio.removeAttribute("src");
      e.audio.load();
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
      setSettings((s) => ({ ...s, currentId: null }));
      setTime(0);
      setDuration(0);
    }
    if (db) await deleteTracks(db, ids).catch(() => undefined);
    ids.forEach((id) => {
      blobCache.current.delete(id);
      setCoverUrls((c) => {
        if (!c[id]) return c;
        URL.revokeObjectURL(c[id]);
        const { [id]: _drop, ...rest } = c;
        void _drop;
        return rest;
      });
    });
    setTracks((t) => t.filter((x) => !ids.includes(x.id)));
    setSelected(new Set());
    setUnsaved((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
    say(`${ids.length}곡을 삭제했습니다.`);
    void estimateUsage().then(setUsage);
  }, [db, say]);

  const askRemove = (ids: string[], title: string) => {
    setConfirm({ title, message: `선택한 ${ids.length}곡을 목록에서 삭제합니다. 원본 파일은 지워지지 않고, 이 브라우저에 저장된 사본만 삭제됩니다.`, onOk: () => { setConfirm(null); void removeIds(ids); } });
  };

  const clearEverything = () => {
    setConfirm({
      title: "재생목록 전체 삭제",
      message: "이 브라우저에 저장된 모든 곡과 재생 기록을 삭제합니다. 원본 파일은 지워지지 않습니다.",
      onOk: async () => {
        setConfirm(null);
        await removeIds(tracks.map((t) => t.id));
        if (db) await clearAll(db).catch(() => undefined);
      },
    });
  };

  // ---- 단축키 ----
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const e = live.current.engine;
      const s = live.current.settings;
      switch (ev.key) {
        case " ": ev.preventDefault(); void togglePlay(); break;
        case "ArrowRight": if (e) { ev.preventDefault(); e.audio.currentTime = Math.min(e.audio.duration || 0, e.audio.currentTime + 5); } break;
        case "ArrowLeft": if (e) { ev.preventDefault(); e.audio.currentTime = Math.max(0, e.audio.currentTime - 5); } break;
        case "ArrowUp": ev.preventDefault(); patch({ volume: Math.min(1, +(s.volume + 0.05).toFixed(2)), muted: false }); break;
        case "ArrowDown": ev.preventDefault(); patch({ volume: Math.max(0, +(s.volume - 0.05).toFixed(2)) }); break;
        case "m": case "M": patch({ muted: !s.muted }); break;
        case "s": case "S": patch({ shuffle: !s.shuffle }); playedRef.current = []; break;
        case "r": case "R": patch({ repeat: REPEAT_NEXT[s.repeat] }); break;
        case "n": case "N": goNext(true); break;
        case "p": case "P": goPrev(); break;
        case "/": ev.preventDefault(); searchInput.current?.focus(); break;
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, patch, goNext, goPrev]);

  // ---- 미디어 키·잠금화면·이어폰 제어 (MP-02, Media Session API) ----
  const sessionCover = current ? coverUrls[current.id] : undefined;
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = current
      ? new MediaMetadata({
          title: current.name,
          artist: current.artist || "알 수 없는 아티스트",
          album: current.album,
          artwork: sessionCover ? [{ src: sessionCover }] : [],
        })
      : null;
  }, [current, sessionCover]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = current ? (playing ? "playing" : "paused") : "none";
  }, [current, playing]);

  // 진행 위치(잠금화면 진행 막대): 곡 길이·재생 상태·속도가 바뀔 때 갱신
  useEffect(() => {
    const a = engine?.audio;
    if (!("mediaSession" in navigator) || !a || !(duration > 0)) return;
    try { navigator.mediaSession.setPositionState({ duration, playbackRate: a.playbackRate || 1, position: Math.min(a.currentTime, duration) }); } catch { /* 지원 안 하는 브라우저 */ }
  }, [engine, duration, playing, settings.rate]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const seekTo = (t: number) => {
      const a = live.current.engine?.audio;
      if (!a || !Number.isFinite(a.duration)) return;
      a.currentTime = Math.max(0, Math.min(a.duration, t));
      setTime(a.currentTime);
      try { ms.setPositionState({ duration: a.duration, playbackRate: a.playbackRate || 1, position: a.currentTime }); } catch { /* 무시 */ }
    };
    // play/pause는 각각 멱등 처리 — 같은 키가 두 번 와도 상태가 뒤집히지 않게 toggle로 묶지 않는다
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => { if (live.current.engine?.audio.paused !== false) void togglePlay(); }],
      ["pause", () => { live.current.engine?.audio.pause(); }],
      ["previoustrack", () => goPrev()],
      ["nexttrack", () => goNext(true)],
      ["seekto", (d) => { if (d.seekTime != null) seekTo(d.seekTime); }],
      ["seekbackward", (d) => seekTo((live.current.engine?.audio.currentTime ?? 0) - (d.seekOffset ?? 10))],
      ["seekforward", (d) => seekTo((live.current.engine?.audio.currentTime ?? 0) + (d.seekOffset ?? 10))],
    ];
    for (const [action, fn] of handlers) {
      try { ms.setActionHandler(action, fn); } catch { /* 브라우저가 지원하지 않는 동작 */ }
    }
    return () => {
      for (const [action] of handlers) {
        try { ms.setActionHandler(action, null); } catch { /* 무시 */ }
      }
    };
  }, [togglePlay, goNext, goPrev]);

  // ---- 외부/사이드바 액션 연동 ----
  useEffect(() => {
    const handleAction = (action: string) => {
      if (action === "add-file") {
        fileInput.current?.click();
      } else if (action === "toggle-eq") {
        setEqOpen((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => {
              document.querySelector(".mp-eq")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 100);
          }
          return next;
        });
      } else if (action === "focus-search") {
        searchInput.current?.focus();
        document.querySelector(".mp-list")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };

    const onCustomAction = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail;
      handleAction(detail);
    };

    window.addEventListener("mp-action", onCustomAction);

    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setTimeout(() => handleAction(hash), 300);
      }
    }

    return () => window.removeEventListener("mp-action", onCustomAction);
  }, []);

  // ---- 끌어다 놓기 ----
  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    setDrag(false);
    void addFiles(Array.from(ev.dataTransfer.files));
  };

  const allVisibleSelected = visible.length > 0 && visible.every((t) => selected.has(t.id));
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allVisibleSelected) visible.forEach((t) => n.delete(t.id)); else visible.forEach((t) => n.add(t.id));
    return n;
  });
  const coverOf = current ? coverUrls[current.id] : undefined;
  const RepeatIcon = settings.repeat === "one" ? Repeat1 : Repeat;

  return (
    <div
      className={`mp ${drag ? "dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); if (!drag) setDrag(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }}
      onDrop={onDrop}
    >
      <input ref={fileInput} type="file" accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.opus,.aac" multiple hidden onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <input ref={folderInput} type="file" {...({ webkitdirectory: "" } as Record<string, string>)} multiple hidden onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />

      <section className="mp-main" aria-label="플레이어">
        <div className="mp-stage">
          {settings.showVisualizer ? (
            <Visualizer analyser={analyser} mode={settings.visualizerMode} active={playing} />
          ) : coverOf ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverOf} alt="앨범 커버" className="mp-cover-big" />
          ) : (
            <div className="mp-stage-empty"><Disc3 size={72} /><p>{tracks.length ? "재생할 곡을 선택하세요" : "음악 파일을 추가해 보세요"}</p></div>
          )}
          <div className="mp-now">
            <span className="mp-cover">
              {coverOf ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={coverOf} alt="" /> : <Music size={22} />}
            </span>
            <div>
              <strong>{current ? current.name : "재생 중인 곡이 없습니다"}</strong>
              <small>{current ? [current.artist || "알 수 없는 아티스트", current.album].filter(Boolean).join(" · ") : "오른쪽 목록에서 곡을 고르거나 파일을 추가하세요"}</small>
            </div>
          </div>
        </div>

        <div className="mp-seek">
          <span>{formatTime(time)}</span>
          <input
            type="range" min={0} max={duration || 0} step={0.1} value={Math.min(time, duration || 0)} disabled={!current}
            aria-label="재생 위치"
            onChange={(e) => { const v = Number(e.target.value); if (engine) engine.audio.currentTime = v; setTime(v); }}
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="mp-controls">
          <div className="mp-ctl-group">
            <button type="button" className={settings.shuffle ? "on" : ""} aria-pressed={settings.shuffle} title="무작위 재생 (S)" onClick={() => { patch({ shuffle: !settings.shuffle }); playedRef.current = []; }}><Shuffle size={18} /></button>
            <button type="button" className={settings.repeat !== "none" ? "on" : ""} title={`${REPEAT_LABEL[settings.repeat]} (R)`} onClick={() => patch({ repeat: REPEAT_NEXT[settings.repeat] })}>
              <RepeatIcon size={18} />
            </button>
          </div>
          <div className="mp-ctl-group">
            <button type="button" title="이전 곡 (P)" disabled={tracks.length === 0} onClick={goPrev}><SkipBack size={22} /></button>
            <button type="button" className="mp-play" title={playing ? "일시정지 (Space)" : "재생 (Space)"} disabled={tracks.length === 0} onClick={() => void togglePlay()}>
              {playing ? <Pause size={28} /> : <Play size={28} />}
            </button>
            <button type="button" title="다음 곡 (N)" disabled={tracks.length === 0} onClick={() => goNext(true)}><SkipForward size={22} /></button>
          </div>
          <div className="mp-ctl-group mp-vol">
            <button type="button" title="음소거 (M)" aria-pressed={settings.muted} onClick={() => patch({ muted: !settings.muted })}>
              {settings.muted || settings.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={settings.muted ? 0 : settings.volume} aria-label="볼륨"
              onChange={(e) => patch({ volume: Number(e.target.value), muted: false })} />
            <select value={settings.rate} aria-label="재생 속도" onChange={(e) => patch({ rate: Number(e.target.value) })}>
              {RATES.map((r) => <option key={r} value={r}>{r}x</option>)}
            </select>
          </div>
        </div>

        <div className="mp-toolbar">
          <div className="mp-ctl-group">
            <button type="button" disabled={!!busy} onClick={() => fileInput.current?.click()}><FilePlus size={15} />파일 추가</button>
            <button type="button" disabled={!!busy} onClick={() => folderInput.current?.click()}><FolderPlus size={15} />폴더 추가</button>
          </div>
          <div className="mp-ctl-group">
            <button type="button" className={settings.showVisualizer ? "on" : ""} aria-pressed={settings.showVisualizer} title="시각화 / 앨범 커버 전환" onClick={() => patch({ showVisualizer: !settings.showVisualizer })}>
              {settings.showVisualizer ? <AudioLines size={15} /> : <ImageIcon size={15} />}{settings.showVisualizer ? "시각화" : "커버"}
            </button>
            <select value={settings.visualizerMode} aria-label="시각화 모드" onChange={(e) => patch({ visualizerMode: e.target.value as VisualizerMode })}>
              {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button type="button" className={eqOpen ? "on" : ""} aria-pressed={eqOpen} onClick={() => setEqOpen((v) => !v)}><SlidersHorizontal size={15} />이퀄라이저</button>
            <button type="button" onClick={() => setHelpKeys((v) => !v)}>단축키</button>
          </div>
        </div>

        {helpKeys && (
          <div className="mp-keys" role="note">
            <b>단축키</b> <kbd>Space</kbd> 재생/정지 · <kbd>←</kbd><kbd>→</kbd> 5초 이동 · <kbd>↑</kbd><kbd>↓</kbd> 볼륨 · <kbd>M</kbd> 음소거 · <kbd>S</kbd> 셔플 · <kbd>R</kbd> 반복 · <kbd>N</kbd> 다음 · <kbd>P</kbd> 이전 · <kbd>/</kbd> 검색
          </div>
        )}

        {eqOpen && (
          <Equalizer
            gains={settings.eqGains} preamp={settings.preamp} customPresets={settings.customPresets}
            onGains={(g) => patch({ eqGains: g })} onPreamp={(p) => patch({ preamp: p })} onCustomPresets={(p) => patch({ customPresets: p })}
          />
        )}
      </section>

      <aside className="mp-list" aria-label="재생목록">
        <div className="mp-list-head">
          <h2><ListMusic size={16} />재생목록 <small>{tracks.length}곡</small></h2>
          <div className="mp-ctl-group">
            {selected.size > 0 && (
              <button type="button" className="danger" disabled={!!busy} onClick={() => askRemove(Array.from(selected), "선택한 곡 삭제")}><Trash2 size={14} />{selected.size}곡 삭제</button>
            )}
            <button type="button" title="정렬 바꾸기" onClick={() => { const n = nextSort(settings.sortKey, settings.sortDir); patch({ sortKey: n.key, sortDir: n.dir }); }}>
              <ArrowUpDown size={14} />{SORT_LABEL[settings.sortKey]}{settings.sortKey !== "added" || settings.sortDir === "desc" ? (settings.sortDir === "asc" ? " ↑" : " ↓") : ""}
            </button>
          </div>
        </div>
        <div className="mp-search">
          <Search size={14} />
          <input ref={searchInput} type="text" value={search} placeholder="제목·아티스트 검색 ( / )" aria-label="검색" onChange={(e) => setSearch(e.target.value)} />
          {search && <button type="button" className="mp-x" aria-label="검색어 지우기" onClick={() => setSearch("")}><X size={12} /></button>}
        </div>
        <div className="mp-tag-tools">
          <label>곡 정보 인코딩
            <select aria-label="곡 정보 인코딩" value={legacyEncoding} disabled={!!busy} onChange={(e) => setLegacyEncoding(e.target.value as LegacyTagEncoding)}>
              <option value="auto">자동 감지</option>
              <option value="korean">한국어 (CP949)</option>
              <option value="latin1">서유럽 (Latin-1)</option>
            </select>
          </label>
          <button type="button" disabled={!ready || !!busy || tracks.length === 0} onClick={() => void refreshTags()}>{selected.size ? `선택 ${selected.size}곡 정보 복구` : "전체 곡 정보 복구"}</button>
          <small>곡명이 깨졌다면 인코딩을 고른 뒤 복구하세요. 원본 음악은 바뀌지 않습니다.</small>
        </div>
        {visible.length > 0 && (
          <label className="mp-selall">
            <input type="checkbox" checked={allVisibleSelected} ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allVisibleSelected; }} onChange={toggleAll} />
            전체 선택
          </label>
        )}
        <div className="mp-rows" role="list">
          {!ready && <p className="mp-empty">불러오는 중…</p>}
          {ready && tracks.length === 0 && (
            <div className="mp-empty">
              <Music size={32} />
              <p>재생목록이 비어 있습니다.</p>
              <p>이 화면에 음악 파일을 끌어다 놓거나<br />[파일 추가]를 눌러 주세요.</p>
            </div>
          )}
          {ready && tracks.length > 0 && visible.length === 0 && <p className="mp-empty">검색 결과가 없습니다.</p>}
          {visible.map((t) => {
            const isCur = t.id === settings.currentId;
            return (
              <div key={t.id} role="listitem" className={`mp-row ${isCur ? "current" : ""} ${selected.has(t.id) ? "picked" : ""}`}>
                <input type="checkbox" aria-label={`${t.name} 선택`} checked={selected.has(t.id)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })} />
                <button type="button" className="mp-row-main" onClick={() => void selectTrack(t.id, true)} onDoubleClick={() => void selectTrack(t.id, true)}>
                  <span className="mp-thumb">
                    {coverUrls[t.id] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={coverUrls[t.id]} alt="" /> : isCur && playing ? <AudioLines size={16} /> : <Music size={16} />}
                  </span>
                  <span className="mp-row-text">
                    <strong>{t.name}</strong>
                    <small>{t.artist || "알 수 없는 아티스트"}{unsaved.has(t.id) && <CircleAlert size={11} aria-label="이번 접속에만 유지됨" />}</small>
                  </span>
                  <span className="mp-row-time">{t.duration ? formatTime(t.duration) : "--:--"}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="mp-list-foot">
          <small>
            {usage ? `브라우저 저장 ${formatBytes(usage.usage)} / ${formatBytes(usage.quota)}` : "오디오 파일은 이 기기에만 저장됩니다"}
          </small>
          {tracks.length > 0 && <button type="button" className="danger" disabled={!!busy} onClick={clearEverything}>전체 삭제</button>}
        </div>
      </aside>

      {drag && <div className="mp-drop"><FilePlus size={40} /><p>여기에 놓으면 재생목록에 추가됩니다</p></div>}
      {busy && <div className="mp-busy" role="status">{busy}</div>}

      {confirm && (
        <div className="mp-overlay" onClick={() => setConfirm(null)}>
          <div className="mp-modal" role="dialog" aria-modal="true" aria-label={confirm.title} onClick={(e) => e.stopPropagation()}>
            <h2>{confirm.title}</h2>
            <p>{confirm.message}</p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => void confirm.onOk()}>삭제</button>
              <button type="button" onClick={() => setConfirm(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`mp-toast ${toast.kind}`} role="status">{toast.text}</div>}
    </div>
  );
}
