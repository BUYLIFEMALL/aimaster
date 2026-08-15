"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlanningAction, deletePlanningAction } from "@/lib/actions/plannings";
import { LANG_OPTIONS, VOCAL_GENDER_OPTIONS } from "@/lib/constants";
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
  draft: { label: "초안", className: "bg-gray-100 text-gray-600" },
  planned: { label: "기획 완료", className: "bg-blue-100 text-blue-700" },
  generating: { label: "생성 중", className: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", className: "bg-green-100 text-green-700" },
  error: { label: "오류", className: "bg-red-100 text-red-700" },
};

export function PlanningHeaderCard({ planning }: { planning: PlanningHeaderData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

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
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  const badge = STATUS_BADGE[planning.status];

  if (editing) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">제목</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">곡 설명</label>
          <textarea
            value={songDescription}
            onChange={(e) => setSongDescription(e.target.value)}
            rows={3}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">스타일</label>
          <textarea
            value={styleDescription}
            onChange={(e) => setStyleDescription(e.target.value)}
            rows={3}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">제외 스타일</label>
          <textarea
            value={excludeStyles}
            onChange={(e) => setExcludeStyles(e.target.value)}
            rows={2}
            className="input w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">보컬 성별</label>
            <select
              value={vocalGender}
              onChange={(e) => setVocalGender(e.target.value as VocalGender | "")}
              className="input w-full"
            >
              <option value="">미지정</option>
              {VOCAL_GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">언어</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="input w-full">
              {LANG_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetFields();
              setError(null);
              setEditing(false);
            }}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h1 className="text-2xl font-black text-gray-900">{planning.title ?? "(제목 생성 전)"}</h1>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-4">{planning.description}</p>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-semibold text-gray-500">곡 설명</dt>
          <dd className="text-gray-700 whitespace-pre-wrap">{planning.song_description}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-500">스타일</dt>
          <dd className="text-gray-700">{planning.style_description}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-500">제외 스타일</dt>
          <dd className="text-gray-700">{planning.exclude_styles}</dd>
        </div>
        <div className="flex gap-6">
          <div>
            <dt className="font-semibold text-gray-500">보컬 성별</dt>
            <dd className="text-gray-700">{planning.vocal_gender ?? "미지정"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-500">언어</dt>
            <dd className="text-gray-700">{planning.lang}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          수정
        </button>
        <form action={deletePlanningAction}>
          <input type="hidden" name="planningId" value={planning.id} />
          <button type="submit" className="text-xs text-red-500 hover:text-red-700">
            이 기획 삭제
          </button>
        </form>
      </div>
    </div>
  );
}
