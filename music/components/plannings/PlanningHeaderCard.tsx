"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlanningAction, deletePlanningAction } from "@/lib/actions/plannings";
import { LANG_OPTIONS, VOCAL_GENDER_OPTIONS } from "@/lib/constants";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import type { PlanningStatus, VocalGender } from "@/types/database.types";

export interface PlanningHeaderData {
  id: string;
  title: string | null;
  description: string | null;
  song_description: string;
  style_description: string | null;
  exclude_styles: string | null;
  vocal_gender: VocalGender | null;
  lang: string;
  status: PlanningStatus;
}

const STATUS_BADGE: Record<PlanningStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-[#20202e] text-zinc-400 border border-[#2b2b3d]" },
  planned: { label: "기획 완료", className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  generating: { label: "생성 중...", className: "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse" },
  completed: { label: "완료", className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  error: { label: "오류", className: "bg-rose-500/15 text-rose-400 border border-rose-500/30" },
};

export function PlanningHeaderCard({ planning }: { planning: PlanningHeaderData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [restyledNotice, setRestyledNotice] = useState(false);

  const [title, setTitle] = useState(planning.title ?? "");
  const [description, setDescription] = useState(planning.description ?? "");
  const [songDescription, setSongDescription] = useState(planning.song_description);
  const [styleDescription, setStyleDescription] = useState(planning.style_description ?? "");
  const [excludeStyles, setExcludeStyles] = useState(planning.exclude_styles ?? "");
  const [vocalGender, setVocalGender] = useState<VocalGender | "">(planning.vocal_gender ?? "");
  const [lang, setLang] = useState(planning.lang);

  function resetFields() {
    setTitle(planning.title ?? "");
    setDescription(planning.description ?? "");
    setSongDescription(planning.song_description);
    setStyleDescription(planning.style_description ?? "");
    setExcludeStyles(planning.exclude_styles ?? "");
    setVocalGender(planning.vocal_gender ?? "");
    setLang(planning.lang);
  }

  async function handleSave() {
    setError(null);
    setIsPending(true);
    try {
      const result = await updatePlanningAction(planning.id, {
        title,
        description,
        songDescription,
        styleDescription,
        excludeStyles,
        vocalGender: vocalGender || null,
        lang,
      });
      if (result.needsApiKey) {
        setNeedsApiKey(true);
      } else if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        if (result.restyled) {
          setRestyledNotice(true);
          setTimeout(() => setRestyledNotice(false), 5000);
        }
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  const badge = STATUS_BADGE[planning.status];

  if (editing) {
    return (
      <>
        <div className="rounded-2xl border border-[#272732] bg-[#14141b] p-6 shadow-xl shadow-black/40 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">곡 제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">곡 요약 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">상세 분위기 설명</label>
            <textarea
              value={songDescription}
              onChange={(e) => setSongDescription(e.target.value)}
              rows={3}
              className="input text-xs leading-relaxed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">Suno 음악 스타일 프롬프트</label>
            <textarea
              value={styleDescription}
              onChange={(e) => setStyleDescription(e.target.value)}
              rows={3}
              className="input text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">제외할 스타일 (Negative Prompt)</label>
            <textarea
              value={excludeStyles}
              onChange={(e) => setExcludeStyles(e.target.value)}
              rows={2}
              className="input text-xs font-mono"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">보컬 성별</label>
              <select
                value={vocalGender}
                onChange={(e) => setVocalGender(e.target.value as VocalGender | "")}
                className="input text-xs"
              >
                <option value="">미지정</option>
                {VOCAL_GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g === "혼성" ? "혼성(듀엣)" : g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">가사 언어</label>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className="input text-xs">
                {LANG_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 shadow-md shadow-orange-500/20"
            >
              {isPending ? "저장 중..." : "수정 내용 저장"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetFields();
                setError(null);
                setEditing(false);
              }}
              className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white border border-[#272738] bg-[#1a1926] hover:bg-[#222130]"
            >
              취소
            </button>
          </div>
        </div>
        {needsApiKey && (
          <ApiKeyRequiredModal missingLabels={["OpenAI"]} onClose={() => setNeedsApiKey(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[#272732] bg-[#14141b] p-6 sm:p-7 shadow-xl shadow-black/40">
        {restyledNotice && (
          <p className="mb-4 text-xs text-orange-300 bg-orange-950/40 border border-orange-500/30 rounded-xl px-4 py-2.5">
            ✨ 보컬 성별 변경에 맞춰 곡 설명과 스타일 프롬프트를 자동으로 업데이트했습니다.
          </p>
        )}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎼</span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {planning.title ?? "(제목 생성 전)"}
            </h1>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {planning.description && (
          <p className="text-xs sm:text-sm text-zinc-300 mb-5 leading-relaxed bg-[#1a1926] p-3 rounded-xl border border-[#272738]">
            {planning.description}
          </p>
        )}

        <dl className="space-y-3 text-xs">
          <div className="rounded-xl border border-[#222230] bg-[#101016] p-3.5">
            <dt className="font-bold text-orange-400 mb-1 flex items-center gap-1.5">
              <span>📝</span>
              <span>곡 컨셉 & 상세 설명</span>
            </dt>
            <dd className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{planning.song_description}</dd>
          </div>

          <div className="rounded-xl border border-[#222230] bg-[#101016] p-3.5">
            <dt className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
              <span>🎨</span>
              <span>Suno AI 스타일 프롬프트</span>
            </dt>
            <dd className="text-zinc-300 font-mono text-[11px] leading-relaxed break-all">
              {planning.style_description}
            </dd>
          </div>

          {planning.exclude_styles && (
            <div className="rounded-xl border border-[#222230] bg-[#101016] p-3.5">
              <dt className="font-bold text-zinc-400 mb-1 flex items-center gap-1.5">
                <span>🚫</span>
                <span>제외 스타일 (Negative)</span>
              </dt>
              <dd className="text-zinc-400 font-mono text-[11px]">{planning.exclude_styles}</dd>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-[#222230] bg-[#101016] p-3">
              <dt className="font-bold text-zinc-400 text-[11px] mb-0.5">보컬 성별</dt>
              <dd className="text-zinc-200 font-semibold">{planning.vocal_gender ?? "미지정"}</dd>
            </div>
            <div className="rounded-xl border border-[#222230] bg-[#101016] p-3">
              <dt className="font-bold text-zinc-400 text-[11px] mb-0.5">언어</dt>
              <dd className="text-zinc-200 font-semibold">{planning.lang}</dd>
            </div>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#232332] pt-4">
          <button
            type="button"
            onClick={() => {
              resetFields();
              setEditing(true);
            }}
            className="px-4 py-2 rounded-full text-xs font-bold text-zinc-300 border border-[#2d2d3e] bg-[#1a1926] hover:bg-[#242335] hover:text-white transition-colors"
          >
            ✏️ 기획 내용 수정
          </button>
          <form
            action={deletePlanningAction}
            onSubmit={(e) => {
              if (!confirm("이 기획과 생성된 모든 곡을 삭제합니다. 되돌릴 수 없습니다. 삭제할까요?")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="planningId" value={planning.id} />
            <button
              type="submit"
              className="px-4 py-2 rounded-full text-xs font-semibold text-rose-400 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
            >
              이 기획 삭제
            </button>
          </form>
        </div>
      </div>
      {needsApiKey && (
        <ApiKeyRequiredModal missingLabels={["OpenAI"]} onClose={() => setNeedsApiKey(false)} />
      )}
    </>
  );
}
