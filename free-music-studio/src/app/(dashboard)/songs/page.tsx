"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Music2, Plus, Save, Trash2, Sparkles, AlertCircle, CheckCircle2, Mic, Piano, AudioLines, Wand2, ListMusic, Download } from "lucide-react";
import { DEFAULT_DURATION, DEFAULT_SFX_DURATION, LIMITS, MUSIC_DURATIONS, SFX_DURATIONS, isSfxLyrics, type Song } from "@/lib/songs";
import { DEFAULT_LYRIC_PROVIDER, LYRIC_PROVIDERS, type LyricProvider } from "@/lib/lyricModels";
import { INSTRUMENTAL_LYRICS, PLAN_MAX, SFX_LYRICS, isInstrumentalLyrics, parseBannedInput, planChunks, type PlannedTrack } from "@/lib/lyricRules";

/** 기획 곡 수 고르기 — 1~10, 그 뒤로 15·20·30·40(주인님 2026-11-06: 20곡씩 최대 40곡) */
const PLAN_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40];
import { GeneratePanel } from "@/components/engine/GeneratePanel";
import { PresetPicker } from "@/components/songs/PresetPicker";
import { presetsFor } from "@/lib/presets";
import { COLLECTIONS_CHANGED, type Collection } from "@/lib/collections";
import { ProjectTracks } from "@/components/songs/ProjectTracks";
import { QuickCoverPanel } from "@/components/songs/QuickCoverPanel";
import type { Track } from "@/lib/tracks";
import { LyricResultDialog, loadLyricResults, saveLyricResults, type LyricResult } from "@/components/songs/LyricResultDialog";
import { SongAlbumChooser } from "@/components/albums/SongAlbumChooser";
import { ALBUM_QUERY, type AlbumRead } from "@/lib/albumRead";
import { DEFAULT_LYRIC_LANGUAGE, LYRIC_LANGUAGES, isBestLanguage } from "@/lib/lyricLanguages";
import { LYRIC_GENRES, MAX_MOODS, MAX_VOCALS, MOOD_GROUPS, TEMPOS, VOCALS, lyricMoodPayload, moodConflict, toggleMany, toggleMood } from "@/lib/lyricTags";

type Draft = { id: string | null; title: string; style_prompt: string; lyrics: string; duration_sec: number; art_prompt: string; project_id: string | null };
/** 곡 만들기에서 보는 프로젝트 — 전체 / 프로젝트 없음 / 프로젝트 번호 */
type ProjectView = "all" | "none" | string;
const PROJECT_VIEW_KEY = "fms.songsProject";

const EMPTY: Draft = { id: null, title: "", style_prompt: "", lyrics: "", duration_sec: DEFAULT_DURATION, art_prompt: "", project_id: null };

const LYRIC_HINT = "[Verse]\n첫 번째 소절\n\n[Chorus]\n후렴 소절";
const BANNED_KEY = "fms.bannedWords";
const NEW_DRAFT_KEY = "fms.unsavedDraft"; // 아직 저장 안 한 새 곡(이 브라우저에만)

const field =
  "w-full rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400";

const durationLabel = (s: number) => (s < 60 ? `${s}초` : `${s / 60}분`);

/** 곡 종류 — 노래 / 연주곡([Instrumental]) / 효과음([SFX], Stable Audio 3 전용, 2026-11-05) */
type Mode = "vocal" | "instrumental" | "sfx";
const modeOf = (lyrics: string): Mode => (isSfxLyrics(lyrics) ? "sfx" : isInstrumentalLyrics(lyrics) ? "instrumental" : "vocal");

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [exempt, setExempt] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [coverSrc, setCoverSrc] = useState<Track | null>(null); // C-3 오른쪽 곡 카드 「커버」로 고른 원곡
  const openCover = (t: Track) => {
    setCoverSrc(t);
    setTimeout(() => document.getElementById("quick-cover")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const [mode, setMode] = useState<Mode>("vocal");
  const instrumental = mode === "instrumental";
  const sfx = mode === "sfx";
  const vocalLyrics = useRef("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; needKey?: boolean } | null>(null);

  const [theme, setTheme] = useState("");
  const [genre, setGenre] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [tempo, setTempo] = useState("");
  const [vocals, setVocals] = useState<string[]>([]);
  const moodTags = lyricMoodPayload({ moods, tempo, vocals }).tags;
  const [language, setLanguage] = useState<string>(DEFAULT_LYRIC_LANGUAGE);
  const [refine, setRefine] = useState(true);
  const [banned, setBanned] = useState("");
  const [planCount, setPlanCount] = useState(3);
  const [plan, setPlan] = useState<PlannedTrack[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [provider, setProvider] = useState<LyricProvider>(DEFAULT_LYRIC_PROVIDER);
  const [model, setModel] = useState<string>(LYRIC_PROVIDERS.find((p) => p.id === DEFAULT_LYRIC_PROVIDER)!.defaultModel);
  const [keys, setKeys] = useState<Record<string, { registered: boolean }> | null>(null);
  const [writing, setWriting] = useState<"" | "create" | "edit" | "plan" | "sound">("");

  // 어느 AI에 본인 키가 있는지 — 키가 있는 곳 중 첫 번째(OpenAI → Claude → Gemini)를 기본으로 고른다.
  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.keys) return;
        setKeys(d.keys);
        if (!d.keys[DEFAULT_LYRIC_PROVIDER]?.registered) {
          const first = LYRIC_PROVIDERS.find((p) => d.keys[p.id]?.registered);
          if (first) {
            setProvider(first.id);
            setModel(first.defaultModel);
          }
        }
      })
      .catch(() => {});
  }, []);

  // 금지어는 이 브라우저에 기억해 둔다(다음에 와도 그대로).
  useEffect(() => {
    try {
      setBanned(localStorage.getItem(BANNED_KEY) ?? "");
    } catch {}
  }, []);
  const changeBanned = (v: string) => {
    setBanned(v);
    try {
      localStorage.setItem(BANNED_KEY, v);
    } catch {}
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/songs");
      const data = await res.json();
      if (res.ok) {
        setSongs(data.songs ?? []);
        setExempt(!!data.retentionExempt);
      } else setMessage({ type: "error", text: data.error || "곡 목록을 불러오지 못했습니다." });
    } catch {
      setMessage({ type: "error", text: "곡 목록을 불러오지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // ── 프로젝트 안에서 만들기(원본 boks-music App.tsx, MIT) ─────────────
  // 위에서 프로젝트를 고르면 그 프로젝트의 초안만 보이고, 새 곡·기획 저장은 그 프로젝트로, 만든 곡도 서버가 그 프로젝트로 넣는다.
  const [projects, setProjects] = useState<Collection[]>([]);
  const [projectView, setProjectViewState] = useState<ProjectView>("all");
  const viewProjectId = projectView !== "all" && projectView !== "none" ? projectView : null;
  const setProjectView = (v: ProjectView) => {
    setProjectViewState(v);
    try {
      sessionStorage.setItem(PROJECT_VIEW_KEY, v);
    } catch {}
  };
  useEffect(() => {
    const loadProjects = () =>
      fetch("/api/collections")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { projects?: Collection[] } | null) => d && setProjects(d.projects ?? []))
        .catch(() => {});
    loadProjects();
    // 좌측 메뉴에서 순서를 바꾸거나 여기서 새로 만들면 다시 읽는다(v1.31)
    window.addEventListener(COLLECTIONS_CHANGED, loadProjects);
    const linked = new URLSearchParams(window.location.search).get("project");
    try {
      const v = linked && /^[0-9a-f-]{36}$/.test(linked) ? linked : sessionStorage.getItem(PROJECT_VIEW_KEY);
      if (v) setProjectViewState(v);
      if (linked) window.history.replaceState(null, "", "/songs");
    } catch {}
    return () => window.removeEventListener(COLLECTIONS_CHANGED, loadProjects);
  }, []);
  // 곡 만들기에서 바로 새 프로젝트(백로그 C-5) — 만들면 그 프로젝트를 고른 상태가 된다
  const [newProject, setNewProject] = useState<string | null>(null);
  const [projectError, setProjectError] = useState("");
  const createProject = async () => {
    const name = newProject?.trim();
    if (!name) return;
    setProjectError("");
    const res = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "project", name }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.collection) return setProjectError(data?.error || "프로젝트를 만들지 못했습니다.");
    setProjects((list) => [...list, data.collection]);
    setProjectView(data.collection.id);
    setNewProject(null);
    window.dispatchEvent(new Event(COLLECTIONS_CHANGED));
  };
  const shownSongs = songs.filter((s) => (projectView === "all" ? true : projectView === "none" ? !s.project_id : s.project_id === projectView));
  const projectName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.name ?? "지운 프로젝트" : "프로젝트 없음");

  // ── 자동 저장(원본 boks-music App.tsx, MIT: 입력이 멈추고 1.2초 뒤 저장) ─────────
  // 저장해 둔 곡은 서버에 조용히 고쳐 쓰고, 아직 저장 안 한 새 곡은 이 브라우저에 임시로 두었다가 다시 오면 되살린다.
  const savedSnap = useRef(JSON.stringify(EMPTY));
  const [autoSaved, setAutoSaved] = useState<{ at: Date; ok: boolean } | null>(null);
  const restoredNew = useRef(false);
  useEffect(() => {
    if (restoredNew.current) return;
    restoredNew.current = true;
    try {
      const d = JSON.parse(localStorage.getItem(NEW_DRAFT_KEY) ?? "null") as Draft | null;
      if (d && !d.id && (d.title || d.style_prompt || d.lyrics)) {
        setDraft({ ...EMPTY, ...d, id: null });
        setMode(modeOf(d.lyrics ?? ""));
        setMessage({ type: "success", text: "저장하지 않은 채 두고 간 새 곡을 되살렸습니다." });
      }
    } catch {}
  }, []);
  useEffect(() => {
    const snap = JSON.stringify(draft);
    if (snap === savedSnap.current) return;
    const t = window.setTimeout(async () => {
      if (!draft.id) {
        try {
          if (draft.title || draft.style_prompt || draft.lyrics.trim()) localStorage.setItem(NEW_DRAFT_KEY, snap);
        } catch {}
        return;
      }
      if (!draft.title.trim()) return; // 제목이 빈 동안은 저장하지 않는다(서버 검사에 걸림)
      const { id, ...body } = draft;
      const res = await fetch(`/api/songs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
      if (res?.ok) {
        savedSnap.current = snap;
        setSongs((list) => list.map((s) => (s.id === id ? { ...s, title: draft.title } : s)));
      }
      setAutoSaved({ at: new Date(), ok: !!res?.ok });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [draft]);

  const openDraft = (d: Draft) => {
    savedSnap.current = JSON.stringify(d);
    setAutoSaved(null);
    if (!d.id) {
      try {
        localStorage.removeItem(NEW_DRAFT_KEY);
      } catch {}
    }
    setDraft(d);
    setMode(modeOf(d.lyrics));
    vocalLyrics.current = modeOf(d.lyrics) === "vocal" ? d.lyrics : "";
    setMessage(null);
  };

  // 연주곡·효과음으로 바꾸면 가사 칸을 표시 글자로, 노래로 돌아오면 쓰던 가사를 되돌린다. 길이는 그 종류의 목록 안으로 맞춘다.
  const changeMode = (next: Mode) => {
    if (next === mode) return;
    const from = mode;
    setMode(next);
    // 원본 boks-music(MIT) 규칙: 다른 종류 전용 프리셋 문장을 그대로 둔 스타일은 비우고, 직접 고친 스타일은 남긴다
    const presetLeft = from !== "sfx" && presetsFor(from, []).some((p) => p.prompt === draft.style_prompt.trim());
    if (presetLeft) setMessage({ type: "success", text: `${from === "vocal" ? "노래" : "연주곡"}용 프리셋 스타일을 비웠습니다. ${next === "sfx" ? "소리 설명" : "새 프리셋"}을 골라 주세요.` });
    setDraft((d) => {
      if (from === "vocal") vocalLyrics.current = d.lyrics;
      const lyrics = next === "vocal" ? vocalLyrics.current : next === "sfx" ? SFX_LYRICS : INSTRUMENTAL_LYRICS;
      const list: readonly number[] = next === "sfx" ? SFX_DURATIONS : MUSIC_DURATIONS;
      const duration_sec = list.includes(d.duration_sec) ? d.duration_sec : next === "sfx" ? DEFAULT_SFX_DURATION : DEFAULT_DURATION;
      return { ...d, lyrics, duration_sec, ...(presetLeft ? { style_prompt: "" } : {}) };
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { id, ...body } = draft;
      const res = await fetch(id ? `/api/songs/${id}` : "/api/songs", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "저장하지 못했습니다." });
        return;
      }
      const next = { id: data.song.id, title: data.song.title, style_prompt: data.song.style_prompt, lyrics: data.song.lyrics, duration_sec: data.song.duration_sec, art_prompt: data.song.art_prompt ?? "", project_id: data.song.project_id ?? null };
      savedSnap.current = JSON.stringify(next);
      try {
        localStorage.removeItem(NEW_DRAFT_KEY);
      } catch {}
      setDraft(next);
      setMessage({ type: "success", text: draft.id ? "곡을 저장했습니다." : "곡을 저장했습니다. 이제부터는 고칠 때마다 자동으로 저장됩니다." });
      load();
    } catch {
      setMessage({ type: "error", text: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.id || !confirm("이 곡을 삭제할까요? 삭제하면 되돌릴 수 없습니다.")) return;
    const res = await fetch(`/api/songs/${draft.id}`, { method: "DELETE" });
    if (res.ok) {
      openDraft(EMPTY);
      setMessage({ type: "success", text: "곡을 삭제했습니다." });
      load();
    } else {
      setMessage({ type: "error", text: "삭제하지 못했습니다." });
    }
  };

  const ai = { provider, model, language, banned_words: parseBannedInput(banned), duration_sec: draft.duration_sec };

  // 앨범 2단계(v1.36): 그림에서 읽은 값으로 곡 칸을 채운다 — 이미 적어 둔 제목·스타일은 덮지 않는다
  const fillFromAlbum = (r: AlbumRead) => {
    if (r.theme) setTheme(r.theme);
    if (r.genre) setGenre(r.genre);
    if (r.moods.length) setMoods(r.moods);
    if (r.tempo) setTempo(r.tempo);
    if (r.vocals.length && !instrumental) setVocals(r.vocals);
    setDraft((d) => ({ ...d, title: d.title.trim() ? d.title : r.title, style_prompt: d.style_prompt.trim() ? d.style_prompt : r.style_prompt }));
  };
  // 앨범 화면 「이 그림으로 곡 만들기」로 왔을 때(?album=<번호>&name=<이름>) — 한 번 읽고 주소에서 지운다
  const [startAlbum, setStartAlbum] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get(ALBUM_QUERY);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    setStartAlbum({ id, name: (q.get("name") ?? "").slice(0, 60) || "앨범" });
    q.delete(ALBUM_QUERY);
    q.delete("name");
    window.history.replaceState(null, "", `${window.location.pathname}${q.toString() ? `?${q}` : ""}`);
  }, []);

  // AI 가사 결과 창(원본 boks-music, MIT) — 결과는 바로 덮어쓰지 않고 창에서 고른다. 최근 20개는 이 브라우저에.
  const [lyricResults, setLyricResults] = useState<LyricResult[]>([]);
  const [shownResult, setShownResult] = useState<LyricResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  useEffect(() => setLyricResults(loadLyricResults()), []);
  const keepResults = (list: LyricResult[]) => {
    setLyricResults(list);
    saveLyricResults(list);
  };

  // 가사 채우기(create) 또는 다듬기(edit) — base를 주면 그 결과를 다듬는다(결과 창 「AI 수정」)
  const writeLyrics = async (mode: "create" | "edit", base?: { title: string; style_prompt: string; lyrics: string }) => {
    setWriting(mode);
    setMessage(null);
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ai,
          mode,
          theme,
          genre,
          ...lyricMoodPayload({ moods, tempo, vocals }),
          fixed_style: draft.style_prompt.trim() || undefined,
          refine,
          recent_titles: songs.slice(0, 10).map((s) => s.title),
          current: mode === "edit" ? base ?? { title: draft.title, style_prompt: draft.style_prompt, lyrics: draft.lyrics } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "가사를 만들지 못했습니다.", needKey: !!data.needApiKey });
        return;
      }
      // 결과 창에 띄운다 — 회원이 [현재 가사 적용]을 눌러야 입력 칸이 바뀐다.
      const r: LyricResult = { id: crypto.randomUUID(), at: new Date().toISOString(), mode, title: data.title || base?.title || draft.title, style_prompt: data.style_prompt || base?.style_prompt || "", lyrics: data.lyrics, calls: data.calls ?? 1 };
      keepResults([r, ...loadLyricResults().filter((x) => x.id !== r.id)]);
      setShownResult(r);
      setResultOpen(true);
    } catch {
      setMessage({ type: "error", text: "가사를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setWriting("");
    }
  };

  // 원본 boks-music `instrumental-plan.mjs`(MIT)처럼 20곡씩 나눠 기획하고, 앞 묶음 제목을 넘겨 겹치지 않게 한다(최대 40곡).
  // 서버 한 번 호출의 시간 한도 때문에 나누는 일은 화면이 하고, 중간에 취소할 수 있다(이미 받은 곡은 남긴다).
  const planStop = useRef<AbortController | null>(null);
  const [planStage, setPlanStage] = useState("");
  const planTracks = async () => {
    setWriting("plan");
    setMessage(null);
    const stop = (planStop.current = new AbortController());
    const chunks = planChunks(planCount);
    const got: PlannedTrack[] = [];
    let calls = 0;
    try {
      for (const size of chunks) {
        const from = got.length + 1;
        setPlanStage(chunks.length > 1 ? `기획 중 (${from}~${from + size - 1} / ${planCount}곡)` : `${size}곡 기획 중`);
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: stop.signal,
          body: JSON.stringify({
            ...ai,
            theme,
            style: draft.style_prompt,
            count: size,
            used: got.map((t) => t.title),
            ...(chunks.length > 1 ? { batch: `tracks ${from}-${from + size - 1} of ${planCount}` } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage({ type: "error", text: `${data.error || "연주곡을 기획하지 못했습니다."}${got.length ? ` (앞서 받은 ${got.length}곡은 남겼습니다)` : ""}`, needKey: !!data.needApiKey });
          return;
        }
        got.push(...data.tracks);
        calls += data.calls ?? 1;
        setPlan([...got]);
      }
      setMessage({ type: "success", text: `연주곡 ${got.length}곡을 기획했습니다(AI 호출 ${calls}번). 곡마다 [이 곡으로 생성하기]를 누르거나 [모두 내 곡에 저장]을 눌러 주세요.` });
    } catch (e) {
      const aborted = (e as Error).name === "AbortError";
      setMessage({ type: aborted ? "success" : "error", text: aborted ? `기획을 멈췄습니다${got.length ? ` — 받은 ${got.length}곡은 남겼습니다` : ""}.` : "연주곡을 기획하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      planStop.current = null;
      setPlanStage("");
      setWriting("");
    }
  };

  // 한국어로 적은 효과음·연주곡 설명을 Stable Audio 3용 영어 설명으로(회원 본인 키, 고른 AI·모델, 2026-11-05)
  const makeSoundPrompt = async (text: string) => {
    if (!text.trim()) return;
    setWriting("sound");
    setMessage(null);
    try {
      const res = await fetch("/api/sound-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, text, kind: sfx ? "sfx" : "music", duration_sec: draft.duration_sec }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "영어 설명을 만들지 못했습니다.", needKey: !!data.needApiKey });
        return;
      }
      set("style_prompt", data.prompt);
      setMessage({ type: "success", text: `영어 설명을 만들어 아래 칸에 넣었습니다(AI 호출 ${data.calls}번). 고칠 곳이 있으면 고친 뒤 저장해 주세요.` });
    } catch {
      setMessage({ type: "error", text: "영어 설명을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setWriting("");
    }
  };

  const loadPlanned = (t: PlannedTrack) => {
    openDraft({ id: null, title: t.title, style_prompt: t.style, lyrics: INSTRUMENTAL_LYRICS, duration_sec: draft.duration_sec, art_prompt: t.art ?? "", project_id: viewProjectId });
    setMessage({ type: "success", text: `「${t.title}」을 넣었습니다 — 아래 「내 PC로 노래 만들기」에서 엔진을 고르고 [대기열에 넣기]를 눌러 주세요.` });
    // 「이 곡으로 생성하기」(주인님 2026-11-05) — 만들기 칸으로 바로 내려간다
    setTimeout(() => document.getElementById("generate-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const savePlan = async () => {
    setSavingPlan(true);
    setMessage(null);
    let done = 0;
    for (const t of plan) {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t.title, style_prompt: t.style, lyrics: INSTRUMENTAL_LYRICS, duration_sec: draft.duration_sec, art_prompt: t.art ?? "", project_id: viewProjectId }),
      }).catch(() => null);
      if (res?.ok) done++;
    }
    setSavingPlan(false);
    await load();
    setMessage(
      done === plan.length
        ? { type: "success", text: `연주곡 ${done}곡을 내 곡에 저장했습니다. 왼쪽 목록에서 골라 [노래 만들기]를 눌러 주세요.` }
        : { type: "error", text: `${plan.length}곡 중 ${done}곡만 저장했습니다. 다시 눌러 주세요.` }
    );
    if (done === plan.length) setPlan([]);
  };

  const keyBtn = (p: (typeof LYRIC_PROVIDERS)[number]) => {
    const noKey = keys !== null && !keys[p.id]?.registered;
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => {
          setProvider(p.id);
          setModel(p.defaultModel);
        }}
        className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${provider === p.id ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
      >
        {p.label}
        {noKey && <span className="ml-1 text-[10px] font-normal text-slate-400">키 없음</span>}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* 6단계 DAW 트랙 파이프라인 인디케이터 배너 (63. 사이버 DAW 네온 스튜디오 덱 스타일) */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-[#0a0f1d] via-[#0c1626] to-[#070b14] p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-2.5 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.35)]">
              <Music2 className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-100">🎵 곡 만들기 — DAW 스튜디오</h1>
                <span className="rounded-full bg-emerald-950/80 border border-emerald-500/35 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400">
                  CYBER DAW PRO
                </span>
                <span className="rounded-md bg-slate-900 border border-slate-700/80 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  24-TRACK
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                내 PC 로컬 GPU 100% 무료 무제한 연산 · 24트랙 DAW 스템 믹싱 & 마스터링 콘솔
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
              로컬 GPU 무제한 연산중
            </span>
            <span className="rounded-full bg-amber-950/50 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
              무손실 24bit FLAC 지원
            </span>
          </div>
        </div>

        {/* 6단계 파이프라인 스텝퍼 */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-3 py-2 text-emerald-300 font-extrabold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-slate-950">1</span>
            <span className="truncate">01. 곡 기획·스타일</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">2</span>
            <span className="truncate">02. 내 PC 로컬 엔진</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">3</span>
            <span className="truncate">03. 작업 대기열 (GPU)</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">4</span>
            <span className="truncate">04. 24트랙 믹싱</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">5</span>
            <span className="truncate">05. AI 가사/마스터링</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">6</span>
            <span className="truncate">06. 4K 비디오 렌더</span>
          </div>
        </div>

        {/* 24트랙 스테레오 오디오 파형 뷰파인더 덱 목업 */}
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-[#060911]/90 p-3.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-extrabold">실시간 24트랙 스테레오 오디오 뷰파인더</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono">
              <span>00:03:42</span>
              <span>•</span>
              <span className="text-emerald-400">48kHz 24bit FLAC</span>
              <span>•</span>
              <span className="text-amber-400">-14.0 LUFS</span>
            </div>
          </div>
          <div className="flex items-center gap-1 h-8 px-1">
            {Array.from({ length: 64 }).map((_, i) => {
              const h = 20 + Math.sin(i * 0.25) * 45 + Math.cos(i * 0.6) * 20;
              const isCurrent = i >= 24 && i <= 26;
              return (
                <div
                  key={i}
                  style={{ height: `${Math.max(12, Math.min(100, h))}%` }}
                  className={`flex-1 rounded-sm transition-all ${isCurrent ? "bg-white shadow-[0_0_8px_#fff]" : i < 24 ? "bg-emerald-400" : "bg-emerald-800/40"}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-xl p-4 text-xs font-semibold ${
            message.type === "success" ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300" : "border border-rose-500/30 bg-rose-950/40 text-rose-300"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
          {message.needKey && (
            <Link href="/settings" className="ml-auto shrink-0 rounded-lg border border-rose-400/40 px-3 py-1 hover:bg-rose-900/40">
              키 등록하러 가기
            </Link>
          )}
        </div>
      )}

      {/* 프로젝트 고르기 — 원본처럼 프로젝트를 열고 그 안에서 만든다 */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#0a0f1d] px-4 py-3 text-xs">
        <span className="font-bold text-slate-200">📁 프로젝트</span>
        <select
          value={projectView}
          onChange={(e) => setProjectView(e.target.value)}
          aria-label="볼 프로젝트"
          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-hidden"
        >
          <option value="all">전체 초안</option>
          <option value="none">프로젝트 없음</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {newProject === null ? (
          <button
            type="button"
            onClick={() => (setNewProject(""), setProjectError(""))}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-950/40"
          >
            <Plus className="h-3.5 w-3.5" /> 새 프로젝트
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <input
              autoFocus
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) void createProject();
                if (e.key === "Escape") setNewProject(null);
              }}
              maxLength={40}
              placeholder="새 프로젝트 이름"
              aria-label="새 프로젝트 이름"
              className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden"
            />
            <button type="button" onClick={() => void createProject()} disabled={!newProject.trim()} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40">
              만들기
            </button>
            <button type="button" onClick={() => setNewProject(null)} className="text-[11px] text-slate-400 underline">
              취소
            </button>
          </span>
        )}
        {projectError && <span className="text-[11px] font-semibold text-rose-300">{projectError}</span>}
        <span className="text-[11px] text-slate-500">
          {viewProjectId ? "새 곡·기획 저장은 이 프로젝트로, 만든 곡도 이 프로젝트의 「모든 음악」에 들어갑니다." : "프로젝트를 고르면 그 안에서 바로 만들 수 있습니다."}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr] 2xl:grid-cols-[240px_1fr_300px]">
        {/* 내 곡 목록 */}
        <aside className="space-y-2 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4">
          <button
            type="button"
            onClick={() => openDraft({ ...EMPTY, project_id: viewProjectId, lyrics: sfx ? SFX_LYRICS : instrumental ? INSTRUMENTAL_LYRICS : "", duration_sec: sfx ? DEFAULT_SFX_DURATION : DEFAULT_DURATION })}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-xs font-bold text-white hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> 새 곡
          </button>
          <p className="px-1 pt-2 text-[11px] font-semibold text-slate-400">
            {projectView === "all" ? "내 곡" : projectName(viewProjectId)} {shownSongs.length}개 · {exempt ? "보관 기한 없음(관리자·시험 계정)" : "30일 보관"}
          </p>
          {loading ? (
            <p className="px-1 text-xs text-slate-500">불러오는 중…</p>
          ) : shownSongs.length === 0 ? (
            <p className="px-1 text-xs text-slate-500">{songs.length ? "이 프로젝트에 저장한 곡이 없습니다. 「새 곡」으로 시작하세요." : "아직 저장한 곡이 없습니다."}</p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {shownSongs.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openDraft({ id: s.id, title: s.title, style_prompt: s.style_prompt, lyrics: s.lyrics, duration_sec: s.duration_sec, art_prompt: s.art_prompt ?? "", project_id: s.project_id ?? null })}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      draft.id === s.id ? "bg-emerald-950/50 text-emerald-200" : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <span className="block truncate font-semibold">
                      {isInstrumentalLyrics(s.lyrics) ? "🎹 " : ""}
                      {s.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {durationLabel(s.duration_sec)} · {new Date(s.updated_at).toLocaleDateString("ko-KR")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="space-y-6">
          {/* 노래 / 연주곡 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-slate-700/60 bg-slate-950/80 p-1" role="tablist" aria-label="곡 종류">
              {(
                [
                  { m: "vocal", label: "노래", Icon: Mic },
                  { m: "instrumental", label: "연주곡", Icon: Piano },
                  { m: "sfx", label: "효과음", Icon: AudioLines },
                ] as const
              ).map(({ m, label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => changeMode(m)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                    mode === m ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              {sfx
                ? "박수·문소리·자연음 같은 짧은 효과음(3~30초)을 만듭니다. Stable Audio 3 엔진에서만 만들 수 있습니다."
                : instrumental
                  ? "보컬 없이 악기만으로 만듭니다. AI 작곡 기획으로 곡마다 다른 제목·스타일을 한 번에 받을 수 있습니다."
                  : "가사가 있는 노래를 만듭니다."}
            </p>
          </div>

          {/* 효과음: 한국어로 적으면 고른 AI·모델이 영어 설명으로 바꿔 준다 */}
          {sfx && (
            <section className="space-y-3 rounded-2xl border border-teal-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
                <Sparkles className="h-4 w-4 text-teal-300" /> AI 효과음 설명 만들기{" "}
                <span className="text-[11px] font-normal text-slate-400">(내 OpenAI·Claude·Gemini 키 중 골라 사용 · 선택)</span>
              </h2>
              <input
                className={field}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="어떤 소리인가요?(한국어로) 예) 넓은 빈 강당에서 무거운 나무 문이 쾅 닫히는 소리, 짧은 울림"
                maxLength={400}
              />
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl border border-slate-700/60 bg-slate-950/80 p-1">{LYRIC_PROVIDERS.map(keyBtn)}</div>
                <select className={`${field} w-auto min-w-[16rem] flex-1`} value={model} onChange={(e) => setModel(e.target.value)} aria-label="AI 모델">
                  {LYRIC_PROVIDERS.find((p) => p.id === provider)!.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => makeSoundPrompt(theme.trim() || draft.title)}
                  disabled={!!writing || !(theme.trim() || draft.title.trim())}
                  title={theme.trim() ? undefined : "설명 칸이 비어 있으면 곡 제목으로 만듭니다"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/40 bg-teal-950/40 px-4 py-2 text-xs font-bold text-teal-200 hover:bg-teal-900/50 disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" /> {writing === "sound" ? "영어로 쓰는 중…" : "영어 설명 만들기"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">이 칸이 비어 있으면 곡 제목(예: 계곡물 소리)으로 만듭니다. Stable Audio 3는 영어 설명으로 학습된 모델이라, 한국어로 적은 내용을 소리 나는 것·끝나는 모양·공간까지 담은 영어 설명으로 바꿔 아래 칸에 넣습니다 · AI 호출 1번</p>
            </section>
          )}

          {/* AI 작사 / AI 작곡 기획 — 효과음은 위 칸을 씀 */}
          {!sfx && (
          <section className="space-y-3 rounded-2xl border border-teal-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Sparkles className="h-4 w-4 text-teal-300" /> {instrumental ? "AI 작곡 기획" : "AI 작사"}{" "}
              <span className="text-[11px] font-normal text-slate-400">(내 OpenAI·Claude·Gemini 키 중 골라 사용 · 선택)</span>
            </h2>
            <input
              className={field}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={instrumental ? "어떤 연주곡인가요? 예) 비 오는 밤 카페에서 듣는 잔잔한 재즈 피아노" : "어떤 노래인가요? 예) 비 오는 오후, 쉬어 가도 괜찮다는 위로"}
              maxLength={300}
            />
            {!instrumental && (
              <div className="space-y-3">
                {/* 장르 — 하나만(다시 누르면 해제) */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-300">
                    장르 <span className="font-normal text-slate-500">하나 고르기 · 아래 스타일 프리셋도 이 장르만 보입니다 · 다시 누르면 해제</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="장르">
                    {LYRIC_GENRES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        role="radio"
                        aria-checked={genre === g}
                        onClick={() => setGenre(genre === g ? "" : g)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${genre === g ? "border-emerald-400 bg-emerald-600 text-white" : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-emerald-500/60"}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 분위기 — 여러 개(최대 3개) */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-300">
                    분위기{" "}
                    <span className="font-normal text-slate-500">
                      여러 개 고르기 · 최대 {MAX_MOODS}개{moods.length ? ` (${moods.length}/${MAX_MOODS})` : ""}
                    </span>
                  </p>
                  <div className="space-y-1.5" aria-label="분위기">
                    {MOOD_GROUPS.map((g) => (
                      <div key={g.id} className="flex flex-wrap items-center gap-1.5">
                        <span className="w-28 shrink-0 text-[11px] text-slate-400">{g.label}</span>
                        {g.moods.map(({ ko: m, en }) => {
                          const on = moods.includes(m);
                          const full = !on && moods.length >= MAX_MOODS;
                          return (
                            <button
                              key={m}
                              type="button"
                              aria-pressed={on}
                              disabled={full}
                              title={en}
                              onClick={() => setMoods((v) => toggleMood(v, m))}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-35 ${on ? "border-sky-400 bg-sky-600 text-white" : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-sky-500/60"}`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {moodConflict(moods) && <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[11px] leading-relaxed text-amber-200">⚠️ {moodConflict(moods)}</p>}
                </div>
                {/* 빠르기·리듬(하나) */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-300">
                    빠르기·리듬 <span className="font-normal text-slate-500">하나 고르기 · 다시 누르면 해제</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="빠르기">
                    {TEMPOS.map(({ ko: t, en }) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={tempo === t}
                        title={en}
                        onClick={() => setTempo(tempo === t ? "" : t)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${tempo === t ? "border-violet-400 bg-violet-600 text-white" : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-violet-500/60"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 목소리(최대 2개) */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-300">
                    목소리 <span className="font-normal text-slate-500">최대 {MAX_VOCALS}개 · 예) 여성 보컬 + 숨소리 섞인</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5" aria-label="목소리">
                    {VOCALS.map(({ ko: v, en }) => {
                      const on = vocals.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={on}
                          disabled={!on && vocals.length >= MAX_VOCALS}
                          title={en}
                          onClick={() => setVocals((s) => toggleMany(s, v, MAX_VOCALS))}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-35 ${on ? "border-rose-400 bg-rose-600 text-white" : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-rose-500/60"}`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {moodTags && (
                  <p className="text-[11px] text-slate-400">
                    AI에게 함께 보낼 영어 태그: <span className="font-mono text-teal-300/80">{moodTags}</span>
                    {draft.style_prompt.trim() ? " · 스타일 칸이 이미 있어 가사 분위기에만 반영합니다" : " · 스타일 칸에도 들어갑니다"}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <select className={`${field} sm:w-60`} value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="가사 언어">
                    <optgroup label="잘 부르는 언어(추천)">
                      {LYRIC_LANGUAGES.filter((l) => l.best).map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.ko} 가사
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="그 밖의 언어(발음이 덜 자연스러울 수 있음)">
                      {LYRIC_LANGUAGES.filter((l) => !l.best).map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.ko} 가사
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <span className="text-[11px] text-slate-500">
                    {isBestLanguage(language) ? "음악 엔진(ACE-Step)이 잘 부르는 언어입니다." : "엔진이 지원하지만 발음·음정이 덜 자연스러울 수 있어요. 짧게 먼저 들어 보세요."} 50개 언어 지원 · 노래를 만들 때 가사 글자로 언어를 알아냅니다
                  </span>
                </div>
              </div>
            )}
            <input
              className={field}
              value={banned}
              onChange={(e) => changeBanned(e.target.value)}
              placeholder="금지어(쉼표로 구분, 선택) 예) 사랑, 눈물 — 제목·가사에 넣지 않습니다"
              maxLength={600}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-slate-700/60 bg-slate-950/80 p-1">{LYRIC_PROVIDERS.map(keyBtn)}</div>
              <select className={`${field} w-auto min-w-[16rem] flex-1`} value={model} onChange={(e) => setModel(e.target.value)}>
                {LYRIC_PROVIDERS.find((p) => p.id === provider)!.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {instrumental ? (
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${field} w-auto`} value={planCount} onChange={(e) => setPlanCount(Number(e.target.value))} aria-label="기획할 곡 수">
                  {PLAN_COUNTS.map((n) => (
                    <option key={n} value={n}>
                      {n}곡 기획
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={planTracks}
                  disabled={!!writing || !theme.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/40 bg-teal-950/40 px-4 py-2 text-xs font-bold text-teal-200 hover:bg-teal-900/50 disabled:opacity-40"
                >
                  <ListMusic className="h-3.5 w-3.5" /> {writing === "plan" ? `${planStage || "기획하는 중"}…` : "AI 작곡 기획"}
                </button>
                {writing === "plan" && (
                  <button type="button" onClick={() => planStop.current?.abort()} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900">
                    멈추기
                  </button>
                )}
                <span className="text-[11px] text-slate-500">
                  스타일 칸에 적은 내용은 참고로 함께 보냅니다 · 회원님 키로 AI 호출 {planChunks(planCount).length}번{planCount > PLAN_MAX ? "(20곡씩 나눠서)" : ""}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => writeLyrics("create")}
                  disabled={!!writing || !theme.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/40 bg-teal-950/40 px-4 py-2 text-xs font-bold text-teal-200 hover:bg-teal-900/50 disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5" /> {writing === "create" ? `가사 쓰는 중… (최대 ${refine ? 2 : 1}분)` : "가사 채우기"}
                </button>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
                  <input type="checkbox" checked={refine} onChange={(e) => setRefine(e.target.checked)} className="accent-teal-500" />
                  초안 뒤 한 번 더 다듬기(AI 호출 2번)
                </label>
                <button
                  type="button"
                  onClick={() => writeLyrics("edit")}
                  disabled={!!writing || !draft.lyrics.trim()}
                  title="지금 가사 칸의 가사를 노래로 부르기 좋게 다듬습니다. 주제 칸에 고칠 방향을 적으면 반영합니다."
                  className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" /> {writing === "edit" ? "다듬는 중…" : "지금 가사 다듬기"}
                </button>
                {lyricResults.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShownResult(lyricResults[0]);
                      setResultOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900"
                  >
                    최근 AI 가사 {lyricResults.length}
                  </button>
                )}
              </div>
            )}
            {resultOpen && (
              <LyricResultDialog
                result={shownResult}
                history={lyricResults}
                busy={!!writing}
                onApply={(r) => {
                  // 스타일 칸이 이미 있으면(프리셋을 골랐거나 직접 씀) 그대로 두고 가사·제목만 — 장르·스타일은 아래 프리셋이 정한다(2026-11-06)
                  setDraft((d) => ({ ...d, title: r.title || d.title, style_prompt: d.style_prompt.trim() ? d.style_prompt : r.style_prompt || d.style_prompt, lyrics: r.lyrics }));
                  vocalLyrics.current = r.lyrics;
                  setResultOpen(false);
                  setMessage({ type: "success", text: draft.id ? "가사를 적용했습니다. 자동으로 저장됩니다." : "가사를 적용했습니다. 확인한 뒤 [저장하기]를 눌러 주세요." });
                }}
                onRefine={(r) => void writeLyrics("edit", r)}
                onRedo={(r) => {
                  keepResults(lyricResults.filter((x) => x.id !== r.id));
                  void writeLyrics("create");
                }}
                onLater={() => setResultOpen(false)}
                onPick={setShownResult}
                onDelete={(r) => {
                  const rest = lyricResults.filter((x) => x.id !== r.id);
                  keepResults(rest);
                  if (shownResult?.id === r.id) setShownResult(rest[0] ?? null);
                }}
              />
            )}

            {instrumental && plan.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-slate-200">기획한 연주곡 {plan.length}곡</p>
                  <button
                    type="button"
                    onClick={savePlan}
                    disabled={savingPlan}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:brightness-110 disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" /> {savingPlan ? "저장 중…" : `${plan.length}곡 모두 내 곡에 저장(${durationLabel(draft.duration_sec)})`}
                  </button>
                </div>
                <ol className="space-y-1.5">
                  {plan.map((t, i) => (
                    <li key={`${t.title}-${i}`} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-slate-500">{i + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-100">{t.title}</p>
                          <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-400">{t.style}</p>
                          {t.art && <p className="mt-1 text-[10px] leading-relaxed text-slate-500">🖼 앨범 그림 설명: {t.art}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => loadPlanned(t)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-teal-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-teal-200 hover:bg-teal-950/50"
                        >
                          <Download className="h-3 w-3" /> 이 곡으로 생성하기
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
          )}

          {/* 곡 편집 */}
          <section className="space-y-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
            {projects.length > 0 && (
              <label className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                📁 이 곡의 프로젝트
                <select
                  value={draft.project_id ?? ""}
                  onChange={(e) => set("project_id", e.target.value || null)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-emerald-400 focus:outline-hidden"
                >
                  <option value="">없음</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <input className={field} value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="곡 제목" maxLength={LIMITS.title} />
              <select className={field} value={draft.duration_sec} onChange={(e) => set("duration_sec", Number(e.target.value))} aria-label="목표 길이">
                {(sfx ? SFX_DURATIONS : MUSIC_DURATIONS).map((d) => (
                  <option key={d} value={d}>
                    길이 {durationLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            {!sfx && <PresetPicker mode={instrumental ? "instrumental" : "vocal"} style={draft.style_prompt} onPick={(p) => set("style_prompt", p)} genre={instrumental ? "" : genre} onGenre={instrumental ? undefined : setGenre} />}
            <textarea
              className={`${field} min-h-[70px] font-mono text-xs`}
              value={draft.style_prompt}
              onChange={(e) => set("style_prompt", e.target.value)}
              placeholder={
                sfx
                  ? "어떤 소리인가요?(영어로) 예) A heavy wooden door slamming shut in a large empty hall, short reverb tail"
                  : instrumental
                    ? "스타일(영어 태그) 예) instrumental, lo-fi jazz piano, soft brushed drums, upright bass, 80 BPM"
                    : "스타일(영어 태그) 예) warm Korean city pop, soft electric piano, female vocal, 92 BPM"
              }
              maxLength={LIMITS.style}
            />
            {draft.style_prompt.length > LIMITS.style * 0.8 && (
              <p className={`text-[11px] ${draft.style_prompt.length >= LIMITS.style ? "text-amber-300" : "text-slate-500"}`}>
                스타일 {draft.style_prompt.length}/{LIMITS.style}자 — {draft.style_prompt.length >= LIMITS.style ? "한도에 닿아 더 쓰면 잘립니다. 줄이면 생성할 수 있습니다." : "한도에 가까워졌습니다."}
              </p>
            )}
            {mode !== "vocal" && /[가-힣]/.test(draft.style_prompt) && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/90">
                🔤 설명에 한글이 있습니다. Stable Audio 3는 영어 설명으로 학습돼 영어로 바꾸면 더 잘 나옵니다.
                <button
                  type="button"
                  onClick={() => makeSoundPrompt(draft.style_prompt)}
                  disabled={!!writing}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-amber-400/50 px-2.5 py-1 font-bold text-amber-100 hover:bg-amber-500/10 disabled:opacity-40"
                >
                  <Wand2 className="h-3 w-3" /> {writing === "sound" ? "바꾸는 중…" : `영어로 바꾸기(${LYRIC_PROVIDERS.find((p) => p.id === provider)!.label})`}
                </button>
              </div>
            )}
            {sfx ? (
              <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
                🔊 효과음은 <b className="text-slate-300">무엇이 · 어떻게 · 어디서</b> 나는 소리인지 영어로 적으면 잘 나옵니다(Stable Audio 3는 영어 설명으로 학습됨). 예) 소리 나는 물건, 세기·끝나는 모양(fast decay), 공간(small room, outdoor). 「TrackType: SFX」는 엔진이 알아서 붙입니다.
              </p>
            ) : instrumental ? (
              <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
                🎹 연주곡은 가사 없이 만듭니다(가사 칸에 <code className="text-slate-300">{INSTRUMENTAL_LYRICS}</code>로 저장). 악기·템포·분위기는 위 스타일 칸에 적어 주세요.
              </p>
            ) : (
              <>
                <textarea
                  className={`${field} min-h-[320px] leading-relaxed`}
                  value={draft.lyrics}
                  onChange={(e) => {
                    set("lyrics", e.target.value);
                    vocalLyrics.current = e.target.value;
                  }}
                  placeholder={LYRIC_HINT}
                  maxLength={LIMITS.lyrics}
                />
                <p className="text-[11px] text-slate-500">
                  💡 [Verse]·[Chorus]처럼 대괄호로 구간을 나누면 노래 구조가 또렷해집니다. 가사 {draft.lyrics.length}/{LIMITS.lyrics}자
                </p>
              </>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={save}
                disabled={saving || !draft.title.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> {saving ? "저장 중…" : draft.id ? "지금 저장" : "저장하기"}
              </button>
              <span className="text-[11px] text-slate-500" aria-live="polite">
                {draft.id
                  ? autoSaved
                    ? autoSaved.ok
                      ? `자동 저장됨 ${autoSaved.at.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                      : "자동 저장 실패 — 「지금 저장」을 눌러 주세요"
                    : "고치면 자동으로 저장됩니다"
                  : "처음 한 번 저장하면 그 뒤로는 자동 저장 · 저장 전 내용도 이 브라우저에 임시 보관"}
              </span>
              {draft.id && (
                <button
                  type="button"
                  onClick={remove}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 삭제
                </button>
              )}
            </div>
          </section>

          {/* 앨범 그림(노래·연주곡만 — 효과음은 표지가 필요 없음) */}
          {/* 앨범 그림 만들기는 좌측 「음악앨범」 메뉴로(v1.35) — 여기서는 만들어 둔 앨범에서 고르기 */}
          {!sfx && <SongAlbumChooser title={draft.title} art={draft.art_prompt} style={draft.style_prompt} lyrics={instrumental ? "" : draft.lyrics} ai={{ provider, model }} onRead={fillFromAlbum} start={startAlbum} />}

          {/* 내 PC 엔진으로 생성 — 지금 화면의 가사·스타일 그대로(저장 전에도 가능) */}
          {coverSrc && (
            <div id="quick-cover" className="scroll-mt-6">
              <QuickCoverPanel source={coverSrc} onClose={() => setCoverSrc(null)} />
            </div>
          )}
          <div id="generate-panel" className="scroll-mt-6">
            <GeneratePanel title={draft.title} songId={draft.id} song={{ style_prompt: draft.style_prompt, lyrics: draft.lyrics, duration_sec: draft.duration_sec }} />
          </div>
        </div>

        {/* 오른쪽 — 이 프로젝트의 곡 카드(원본 곡 만들기 2단의 오른쪽). 좁은 화면에서는 아래로 */}
        <div className="lg:col-span-2 2xl:col-span-1">
          <ProjectTracks projectId={viewProjectId} view={projectView} label={projectView === "all" ? "최근 만든 곡" : projectName(viewProjectId)} onCover={openCover} />
        </div>
      </div>
    </div>
  );
}
