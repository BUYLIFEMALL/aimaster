"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_DESIGN, normalizeDesign, type Design, type Preset } from "@/lib/design";
import { newId, timeline, type LyricLine } from "@/lib/lyrics";
import { toSource, type AudioSource } from "@/lib/render/spectrum";
import { decodeSong } from "@/lib/render/export";
import type { Scene } from "@/lib/render/draw";
import { api } from "@/components/ui/api";
import { fetchSunoMedia } from "@/lib/sunoClient";

// 작업 중인 가사 영상 하나의 상태. 메뉴(단계)를 옮겨 다녀도 유지되도록 작업 화면 전체를 감싼다.
// 음악·커버 파일은 회원 PC에만 있고(서버에 올리지 않음), 저장하면 가사 시간표·디자인·제목만 서버에 남는다.

export interface ProjectData {
  title: string; artist: string; lines: LyricLine[]; design: Design;
  audioName?: string; coverName?: string; duration?: number;
  sunoVariantId?: string; // v1.06 음악(SUNO) 자동화에서 가져온 곡이면 그 변주 번호 — 다시 열 때 음악·커버를 자동으로 다시 받는다
}
export interface SavedItem { id: string; title: string; data: ProjectData; updated_at: string }

interface AudioState { name: string; url: string; buffer: AudioBuffer; source: AudioSource }
interface CoverState { name: string; url: string; img: HTMLImageElement; key: string }

interface Studio {
  title: string; artist: string; lines: LyricLine[]; design: Design;
  setTitle(v: string): void; setArtist(v: string): void;
  setLines(next: LyricLine[] | ((prev: LyricLine[]) => LyricLine[])): void;
  setDesign(patch: Partial<Design>): void; applyPreset(p: Preset): void;
  audio: AudioState | null; audioBusy: string; loadAudio(file: File, sunoVariantId?: string | null): Promise<void>;
  sunoVariantId: string | null; restoreNote: string;
  cover: CoverState | null; loadCover(file: File): Promise<void>; clearCover(): void;
  player: HTMLAudioElement | null;
  projectId: string | null; dirty: boolean; savedNames: { audioName?: string; coverName?: string };
  save(): Promise<void>; open(item: SavedItem): void; reset(): void;
  scene: Scene;
}

const Ctx = createContext<Studio | null>(null);
export function useStudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("StudioProvider 안에서만 쓸 수 있습니다.");
  return v;
}

const blankLines = (): LyricLine[] => [];

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitleRaw] = useState(""), [artist, setArtistRaw] = useState("");
  const [lines, setLinesRaw] = useState<LyricLine[]>(blankLines), [design, setDesignRaw] = useState<Design>(DEFAULT_DESIGN);
  const [audio, setAudio] = useState<AudioState | null>(null), [audioBusy, setAudioBusy] = useState("");
  const [cover, setCover] = useState<CoverState | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null), [dirty, setDirty] = useState(false);
  const [savedNames, setSavedNames] = useState<{ audioName?: string; coverName?: string }>({});
  const [player, setPlayer] = useState<HTMLAudioElement | null>(null);
  const [sunoVariantId, setSunoVariantId] = useState<string | null>(null), [restoreNote, setRestoreNote] = useState("");
  const openSeq = useRef(0); // 다시 받는 도중 다른 작업을 열면 늦게 끝난 결과를 버린다
  const urls = useRef<string[]>([]);

  useEffect(() => { // 단계를 옮겨도 이어서 재생되도록 소리 요소는 하나만 둔다
    const el = new Audio(); el.preload = "auto"; setPlayer(el);
    const created = urls.current;
    return () => { el.pause(); created.forEach((u) => URL.revokeObjectURL(u)); };
  }, []);
  useEffect(() => { // 저장하지 않고 창을 닫으려 하면 한 번 묻는다
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const touch = () => setDirty(true);
  const setTitle = (v: string) => { setTitleRaw(v); touch(); };
  const setArtist = (v: string) => { setArtistRaw(v); touch(); };
  const setLines = useCallback((next: LyricLine[] | ((prev: LyricLine[]) => LyricLine[])) => { setLinesRaw(next); setDirty(true); }, []);
  const setDesign = useCallback((patch: Partial<Design>) => { setDesignRaw((d) => normalizeDesign({ ...d, ...patch })); setDirty(true); }, []);
  // 프리셋을 바꿔도 회원이 정한 글자 크기·프레임레이트는 그대로 둔다
  const applyPreset = useCallback((p: Preset) => { setDesignRaw((d) => ({ ...p.design, size: d.size, fps: d.fps })); setDirty(true); }, []);

  const loadAudio = useCallback(async (file: File, sunoId: string | null = null) => {
    setAudioBusy("음악을 읽는 중…");
    try {
      const buffer = await decodeSong(file);
      const url = URL.createObjectURL(file); urls.current.push(url);
      setAudio({ name: file.name, url, buffer, source: toSource(buffer) });
      setSunoVariantId(sunoId); setRestoreNote(""); // 직접 고른 파일이면 Suno 연결을 끊는다
      if (player) { player.pause(); player.src = url; player.load(); }
      setTitleRaw((t) => t || file.name.replace(/\.[^.]+$/, "").replace(/^\d{1,3}[\s._-]+/, ""));
      setDirty(true);
    } finally { setAudioBusy(""); }
  }, [player]);

  const loadCover = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file); urls.current.push(url);
    const img = new Image();
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error("이미지를 읽지 못했습니다. jpg·png·webp 파일인지 확인해 주세요.")); img.src = url; });
    setCover({ name: file.name, url, img, key: `${file.name}:${file.size}:${file.lastModified}` }); setDirty(true);
  }, []);
  const clearCover = () => { setCover(null); touch(); };

  const data = (): ProjectData => ({ title, artist, lines, design, audioName: audio?.name ?? savedNames.audioName, coverName: cover?.name ?? savedNames.coverName, duration: audio?.buffer.duration, sunoVariantId: sunoVariantId ?? undefined });

  const save = async () => {
    const body = data();
    const name = title.trim() || "제목 없는 가사 영상";
    if (projectId) await api("/api/items", { method: "PATCH", body: { id: projectId, title: name, data: body } });
    else { const r = await api<{ item: { id: string } }>("/api/items", { body: { kind: "project", title: name, data: body } }); setProjectId(r.item.id); }
    setDirty(false);
  };

  const open = (item: SavedItem) => {
    const d = item.data;
    setTitleRaw(d.title ?? item.title); setArtistRaw(d.artist ?? "");
    setLinesRaw(Array.isArray(d.lines) ? d.lines.filter((l) => l && typeof l.text === "string").map((l) => ({ id: l.id || newId(), start: Number(l.start), end: Number(l.end), text: l.text })) : []);
    setDesignRaw(normalizeDesign(d.design)); setProjectId(item.id); setSavedNames({ audioName: d.audioName, coverName: d.coverName });
    setAudio(null); setCover(null); player?.pause(); setDirty(false);
    const sid = typeof d.sunoVariantId === "string" && /^[0-9a-f-]{36}$/i.test(d.sunoVariantId) ? d.sunoVariantId : null;
    setSunoVariantId(sid); setRestoreNote("");
    const seq = ++openSeq.current;
    if (sid) void (async () => { // Suno 곡이면 음악·커버를 다시 받는다(가사 시간표는 저장된 것 — Suno 조회 없음)
      try {
        const { audioFile, coverFile } = await fetchSunoMedia(sid, (t) => { if (seq === openSeq.current) setAudioBusy(t); });
        if (seq !== openSeq.current) return;
        await loadAudio(audioFile, sid);
        if (coverFile && seq === openSeq.current) await loadCover(coverFile).catch(() => {});
        if (seq === openSeq.current) setDirty(false);
      } catch (e) {
        if (seq === openSeq.current) setRestoreNote(`Suno 곡을 다시 받지 못했습니다(${e instanceof Error ? e.message : "알 수 없는 오류"}). 음악 파일을 직접 넣어 주세요.`);
      } finally { if (seq === openSeq.current) setAudioBusy(""); }
    })();
  };

  const reset = () => { ++openSeq.current; setSunoVariantId(null); setRestoreNote(""); setTitleRaw(""); setArtistRaw(""); setLinesRaw([]); setDesignRaw(DEFAULT_DESIGN); setProjectId(null); setSavedNames({}); setAudio(null); setCover(null); player?.pause(); setDirty(false); };

  const scene = useMemo<Scene>(() => ({
    title, artist, lines: timeline(lines, audio?.buffer.duration ?? Infinity), duration: audio?.buffer.duration ?? 0, design,
    cover: cover?.img ?? null, coverKey: cover?.key ?? "", audio: audio?.source ?? null,
  }), [title, artist, lines, design, audio, cover]);

  const value: Studio = { title, artist, lines, design, setTitle, setArtist, setLines, setDesign, applyPreset, audio, audioBusy, loadAudio, sunoVariantId, restoreNote, cover, loadCover, clearCover, player, projectId, dirty, savedNames, save, open, reset, scene };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
