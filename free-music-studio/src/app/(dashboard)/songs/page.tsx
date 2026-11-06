"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Music2, Plus, Save, Trash2, Sparkles, AlertCircle, CheckCircle2, Mic, Piano, AudioLines, Wand2, ListMusic, Download } from "lucide-react";
import { DEFAULT_DURATION, DEFAULT_SFX_DURATION, LIMITS, MUSIC_DURATIONS, SFX_DURATIONS, isSfxLyrics, type Song } from "@/lib/songs";
import { DEFAULT_LYRIC_PROVIDER, LYRIC_PROVIDERS, type LyricProvider } from "@/lib/lyricModels";
import { INSTRUMENTAL_LYRICS, PLAN_MAX, SFX_LYRICS, isInstrumentalLyrics, parseBannedInput, type PlannedTrack } from "@/lib/lyricRules";
import { GeneratePanel } from "@/components/engine/GeneratePanel";
import { PresetPicker } from "@/components/songs/PresetPicker";
import { presetsFor } from "@/lib/presets";
import { AlbumArtPanel } from "@/components/songs/AlbumArtPanel";

type Draft = { id: string | null; title: string; style_prompt: string; lyrics: string; duration_sec: number; art_prompt: string };

const EMPTY: Draft = { id: null, title: "", style_prompt: "", lyrics: "", duration_sec: DEFAULT_DURATION, art_prompt: "" };

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
  const [mode, setMode] = useState<Mode>("vocal");
  const instrumental = mode === "instrumental";
  const sfx = mode === "sfx";
  const vocalLyrics = useRef("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; needKey?: boolean } | null>(null);

  const [theme, setTheme] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [language, setLanguage] = useState<"ko" | "en">("ko");
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
      const next = { id: data.song.id, title: data.song.title, style_prompt: data.song.style_prompt, lyrics: data.song.lyrics, duration_sec: data.song.duration_sec, art_prompt: data.song.art_prompt ?? "" };
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

  // 가사 채우기(create) 또는 지금 가사 다듬기(edit)
  const writeLyrics = async (mode: "create" | "edit") => {
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
          mood,
          refine,
          recent_titles: songs.slice(0, 10).map((s) => s.title),
          current: mode === "edit" ? { title: draft.title, style_prompt: draft.style_prompt, lyrics: draft.lyrics } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "가사를 만들지 못했습니다.", needKey: !!data.needApiKey });
        return;
      }
      // 화면 칸에만 채운다 — 회원이 고친 뒤 직접 저장한다.
      setDraft((d) => ({ ...d, title: data.title || d.title, style_prompt: data.style_prompt || d.style_prompt, lyrics: data.lyrics }));
      vocalLyrics.current = data.lyrics;
      setMessage({ type: "success", text: `${mode === "edit" ? "가사를 다듬었습니다" : "가사를 채웠습니다"}(AI 호출 ${data.calls}번). 확인한 뒤 [저장하기]를 눌러 주세요.` });
    } catch {
      setMessage({ type: "error", text: "가사를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setWriting("");
    }
  };

  const planTracks = async () => {
    setWriting("plan");
    setMessage(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ai, theme, style: draft.style_prompt, count: planCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "연주곡을 기획하지 못했습니다.", needKey: !!data.needApiKey });
        return;
      }
      setPlan(data.tracks);
      setMessage({ type: "success", text: `연주곡 ${data.tracks.length}곡을 기획했습니다(AI 호출 ${data.calls}번). 곡마다 [이 곡으로 생성하기]를 누르거나 [모두 내 곡에 저장]을 눌러 주세요.` });
    } catch {
      setMessage({ type: "error", text: "연주곡을 기획하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
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
    openDraft({ id: null, title: t.title, style_prompt: t.style, lyrics: INSTRUMENTAL_LYRICS, duration_sec: draft.duration_sec, art_prompt: t.art ?? "" });
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
        body: JSON.stringify({ title: t.title, style_prompt: t.style, lyrics: INSTRUMENTAL_LYRICS, duration_sec: draft.duration_sec, art_prompt: t.art ?? "" }),
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
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Music2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">🎵 곡 만들기</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              노래나 연주곡을 고르고 스타일을 정하면, 내 PC 엔진이 키 없이 음악을 만듭니다. 가사는 직접 쓰거나 AI 작사로 채울 수 있습니다.
            </p>
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

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* 내 곡 목록 */}
        <aside className="space-y-2 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4">
          <button
            type="button"
            onClick={() => openDraft({ ...EMPTY, lyrics: sfx ? SFX_LYRICS : instrumental ? INSTRUMENTAL_LYRICS : "", duration_sec: sfx ? DEFAULT_SFX_DURATION : DEFAULT_DURATION })}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-xs font-bold text-white hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> 새 곡
          </button>
          <p className="px-1 pt-2 text-[11px] font-semibold text-slate-400">
            내 곡 {songs.length}개 · {exempt ? "보관 기한 없음(관리자·시험 계정)" : "30일 보관"}
          </p>
          {loading ? (
            <p className="px-1 text-xs text-slate-500">불러오는 중…</p>
          ) : songs.length === 0 ? (
            <p className="px-1 text-xs text-slate-500">아직 저장한 곡이 없습니다.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {songs.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openDraft({ id: s.id, title: s.title, style_prompt: s.style_prompt, lyrics: s.lyrics, duration_sec: s.duration_sec, art_prompt: s.art_prompt ?? "" })}
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
              <div className="grid gap-2 sm:grid-cols-3">
                <input className={field} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="장르 예) 시티팝" maxLength={60} />
                <input className={field} value={mood} onChange={(e) => setMood(e.target.value)} placeholder="분위기 예) 따뜻한" maxLength={60} />
                <select className={field} value={language} onChange={(e) => setLanguage(e.target.value as "ko" | "en")}>
                  <option value="ko">한국어 가사</option>
                  <option value="en">영어 가사</option>
                </select>
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
                  {Array.from({ length: PLAN_MAX }, (_, i) => i + 1).map((n) => (
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
                  <ListMusic className="h-3.5 w-3.5" /> {writing === "plan" ? "기획하는 중… (최대 1분)" : "AI 작곡 기획"}
                </button>
                <span className="text-[11px] text-slate-500">스타일 칸에 적은 내용은 참고로 함께 보냅니다 · AI 호출 1번</span>
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
              </div>
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
            {!sfx && <PresetPicker mode={instrumental ? "instrumental" : "vocal"} style={draft.style_prompt} onPick={(p) => set("style_prompt", p)} />}
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
          {!sfx && <AlbumArtPanel title={draft.title} style={draft.style_prompt} art={draft.art_prompt} onArtChange={(v) => set("art_prompt", v)} />}

          {/* 내 PC 엔진으로 생성 — 지금 화면의 가사·스타일 그대로(저장 전에도 가능) */}
          <div id="generate-panel" className="scroll-mt-6">
            <GeneratePanel title={draft.title} songId={draft.id} song={{ style_prompt: draft.style_prompt, lyrics: draft.lyrics, duration_sec: draft.duration_sec }} />
          </div>
        </div>
      </div>
    </div>
  );
}
