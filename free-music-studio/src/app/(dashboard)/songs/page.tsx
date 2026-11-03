"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Music2, Plus, Save, Trash2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { DEFAULT_DURATION, DURATIONS, LIMITS, type Song } from "@/lib/songs";
import { DEFAULT_LYRIC_PROVIDER, LYRIC_PROVIDERS, type LyricProvider } from "@/lib/lyricModels";
import { GeneratePanel } from "@/components/engine/GeneratePanel";

type Draft = { id: string | null; title: string; style_prompt: string; lyrics: string; duration_sec: number };

const EMPTY: Draft = { id: null, title: "", style_prompt: "", lyrics: "", duration_sec: DEFAULT_DURATION };

const LYRIC_HINT = "[Verse]\n첫 번째 소절\n\n[Chorus]\n후렴 소절";

const field =
  "w-full rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400";

const durationLabel = (s: number) => (s < 60 ? `${s}초` : `${s / 60}분`);

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; needKey?: boolean } | null>(null);

  const [theme, setTheme] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [language, setLanguage] = useState<"ko" | "en">("ko");
  const [provider, setProvider] = useState<LyricProvider>(DEFAULT_LYRIC_PROVIDER);
  const [model, setModel] = useState<string>(LYRIC_PROVIDERS.find((p) => p.id === DEFAULT_LYRIC_PROVIDER)!.defaultModel);
  const [keys, setKeys] = useState<Record<string, { registered: boolean }> | null>(null);

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
  const [writing, setWriting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/songs");
      const data = await res.json();
      if (res.ok) setSongs(data.songs ?? []);
      else setMessage({ type: "error", text: data.error || "곡 목록을 불러오지 못했습니다." });
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
      setDraft({ id: data.song.id, title: data.song.title, style_prompt: data.song.style_prompt, lyrics: data.song.lyrics, duration_sec: data.song.duration_sec });
      setMessage({ type: "success", text: "곡을 저장했습니다." });
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
      setDraft(EMPTY);
      setMessage({ type: "success", text: "곡을 삭제했습니다." });
      load();
    } else {
      setMessage({ type: "error", text: "삭제하지 못했습니다." });
    }
  };

  const writeLyrics = async () => {
    setWriting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, genre, mood, language, provider, model, duration_sec: draft.duration_sec }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "가사를 만들지 못했습니다.", needKey: !!data.needApiKey });
        return;
      }
      // 화면 칸에만 채운다 — 회원이 고친 뒤 직접 저장한다.
      setDraft((d) => ({ ...d, title: data.title || d.title, style_prompt: data.style_prompt, lyrics: data.lyrics }));
      setMessage({ type: "success", text: "가사를 채웠습니다. 다듬은 뒤 [저장하기]를 눌러 주세요." });
    } catch {
      setMessage({ type: "error", text: "가사를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setWriting(false);
    }
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
              가사와 스타일을 정리해 두면, 내 PC 엔진이 키 없이 노래를 만듭니다. 가사는 직접 쓰거나 AI 작사로 채울 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-xl p-4 text-xs font-semibold ${
            message.type === "success"
              ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
              : "border border-rose-500/30 bg-rose-950/40 text-rose-300"
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
            onClick={() => {
              setDraft(EMPTY);
              setMessage(null);
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-xs font-bold text-white hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> 새 곡
          </button>
          <p className="px-1 pt-2 text-[11px] font-semibold text-slate-400">내 곡 {songs.length}개 · 30일 보관</p>
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
                    onClick={() => {
                      setDraft({ id: s.id, title: s.title, style_prompt: s.style_prompt, lyrics: s.lyrics, duration_sec: s.duration_sec });
                      setMessage(null);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      draft.id === s.id ? "bg-emerald-950/50 text-emerald-200" : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <span className="block truncate font-semibold">{s.title}</span>
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
          {/* AI 작사 */}
          <section className="space-y-3 rounded-2xl border border-teal-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Sparkles className="h-4 w-4 text-teal-300" /> AI 작사 <span className="text-[11px] font-normal text-slate-400">(내 OpenAI·Claude·Gemini 키 중 골라 사용 · 선택)</span>
            </h2>
            <input className={field} value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="어떤 노래인가요? 예) 비 오는 오후, 쉬어 가도 괜찮다는 위로" maxLength={300} />
            <div className="grid gap-2 sm:grid-cols-3">
              <input className={field} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="장르 예) 시티팝" maxLength={60} />
              <input className={field} value={mood} onChange={(e) => setMood(e.target.value)} placeholder="분위기 예) 따뜻한" maxLength={60} />
              <select className={field} value={language} onChange={(e) => setLanguage(e.target.value as "ko" | "en")}>
                <option value="ko">한국어 가사</option>
                <option value="en">영어 가사</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-slate-700/60 bg-slate-950/80 p-1">
                {LYRIC_PROVIDERS.map((p) => {
                  const noKey = keys !== null && !keys[p.id]?.registered;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProvider(p.id);
                        setModel(p.defaultModel);
                      }}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        provider === p.id ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {p.label}
                      {noKey && <span className="ml-1 text-[10px] font-normal text-slate-400">키 없음</span>}
                    </button>
                  );
                })}
              </div>
              <select className={`${field} w-auto min-w-[16rem] flex-1`} value={model} onChange={(e) => setModel(e.target.value)}>
                {LYRIC_PROVIDERS.find((p) => p.id === provider)!.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={writeLyrics}
              disabled={writing || !theme.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/40 bg-teal-950/40 px-4 py-2 text-xs font-bold text-teal-200 hover:bg-teal-900/50 disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" /> {writing ? "가사 쓰는 중… (최대 1분)" : "가사 채우기"}
            </button>
          </section>

          {/* 곡 편집 */}
          <section className="space-y-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <input className={field} value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="곡 제목" maxLength={LIMITS.title} />
              <select className={field} value={draft.duration_sec} onChange={(e) => set("duration_sec", Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    길이 {durationLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className={`${field} min-h-[70px] font-mono text-xs`}
              value={draft.style_prompt}
              onChange={(e) => set("style_prompt", e.target.value)}
              placeholder="스타일(영어 태그) 예) warm Korean city pop, soft electric piano, female vocal, 92 BPM"
              maxLength={LIMITS.style}
            />
            <textarea
              className={`${field} min-h-[320px] leading-relaxed`}
              value={draft.lyrics}
              onChange={(e) => set("lyrics", e.target.value)}
              placeholder={LYRIC_HINT}
              maxLength={LIMITS.lyrics}
            />
            <p className="text-[11px] text-slate-500">
              💡 [Verse]·[Chorus]처럼 대괄호로 구간을 나누면 노래 구조가 또렷해집니다. 가사 {draft.lyrics.length}/{LIMITS.lyrics}자
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={save}
                disabled={saving || !draft.title.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> {saving ? "저장 중…" : "저장하기"}
              </button>
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

          {/* 내 PC 엔진으로 생성 — 지금 화면의 가사·스타일 그대로(저장 전에도 가능) */}
          <GeneratePanel
            title={draft.title}
            songId={draft.id}
            song={{ style_prompt: draft.style_prompt, lyrics: draft.lyrics, duration_sec: draft.duration_sec }}
          />
        </div>
      </div>
    </div>
  );
}
