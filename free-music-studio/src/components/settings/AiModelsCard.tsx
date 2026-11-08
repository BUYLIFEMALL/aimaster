"use client";

// 글 AI 플랫폼별 모델 고르기·저장(2026-11-08 주인님 「여기서 플랫폼별 모델을 선택 저장하게」) — 기준: naver-blog-agent 「기본 모델 설정」.
// 곡 만들기 AI 작사·앨범 그림 영어 설명이 이 모델을 쓴다. 키가 없는 플랫폼은 「API 미등록」으로 표시(고를 수는 있음).
import { useEffect, useState } from "react";
import { Bot, Loader2, Save } from "lucide-react";
import { LYRIC_PROVIDERS, type LyricProvider } from "@/lib/lyricModels";
import { loadAiPrefs, saveAiPrefs, type AiPrefs } from "@/lib/aiModelChoice";

export function AiModelsCard({ keys }: { keys: Record<string, { registered: boolean }> }) {
  const [prefs, setPrefs] = useState<AiPrefs | null>(null);
  const [draft, setDraft] = useState<Record<LyricProvider, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    void loadAiPrefs().then((p) => {
      setPrefs(p);
      setDraft(p.models);
    });
  }, []);
  const changed = !!(prefs && draft && LYRIC_PROVIDERS.some((p) => prefs.models[p.id] !== draft[p.id]));

  const save = async () => {
    if (!prefs || !draft) return;
    setBusy(true);
    setNote(null);
    try {
      const next = await saveAiPrefs(prefs, { models: draft });
      setPrefs(next);
      setDraft(next.models);
      setNote({ ok: true, text: "저장했습니다. 곡 만들기 AI 작사와 앨범 그림 영어 설명이 이 모델을 씁니다." });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "저장하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="ai-models" className="scroll-mt-6 space-y-4 rounded-2xl border border-sky-500/25 bg-[#0a0f1d] p-5">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
          <Bot className="h-4 w-4 text-sky-300" /> AI 글 모델 (플랫폼별)
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          플랫폼마다 쓸 모델을 골라 저장합니다. 곡 만들기 AI 작사와 앨범 그림 영어 설명이 이 모델을 씁니다. 각 화면에서는 플랫폼만 고르면 됩니다. 요금은 고른 모델 기준으로 회원님 계정에 청구됩니다.
        </p>
      </div>
      {!draft ? (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 설정을 불러오는 중…
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {LYRIC_PROVIDERS.map((p) => {
            const noKey = !keys[p.id]?.registered;
            return (
              <label key={p.id} className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <span className="flex items-center justify-between text-xs font-bold text-slate-200">
                  {p.label}
                  {noKey ? <span className="font-normal text-rose-300">API 미등록</span> : <span className="font-normal text-emerald-300">연동됨</span>}
                </span>
                <select
                  value={draft[p.id]}
                  onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 focus:border-sky-400 focus:outline-hidden"
                  aria-label={`${p.label} 모델`}
                >
                  {p.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !changed}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 모델 저장
        </button>
        {note && <span className={`text-xs ${note.ok ? "text-emerald-300" : "text-rose-300"}`}>{note.text}</span>}
      </div>
    </section>
  );
}
