"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRemixAction } from "@/lib/actions/remix";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { VOCAL_GENDER_OPTIONS, LANG_OPTIONS } from "@/lib/constants";
import type { VocalGender } from "@/types/database.types";

const PROVIDER_LABELS: Record<string, string> = { openai: "OpenAI", suno: "Suno" };
const COUNT_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1); // 1~10

interface RemixSource {
  title: string;
  variantId?: string;
  sourceId?: string;
}

export function RemixForm({ source }: { source: RemixSource | null }) {
  const router = useRouter();
  const [instrumental, setInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState<VocalGender | "">("");
  const [lang, setLang] = useState("한국어");
  const [count, setCount] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [styleWeight, setStyleWeight] = useState(0.7);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.3);
  const [audioWeight, setAudioWeight] = useState(0.3);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (!source && !(formData.get("sourceFile") instanceof File && (formData.get("sourceFile") as File).size > 0)) {
      setError("리믹스할 원곡 오디오 파일을 업로드해주세요.");
      return;
    }

    setIsPending(true);
    try {
      const result = await createRemixAction(formData);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setError(result.error);
      } else {
        router.push(result.sourceId ? `/remix/${result.sourceId}` : "/remix");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        {source ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-blue-700 mb-0.5">🎵 원곡</p>
            <p className="text-sm font-bold text-gray-900">{source.title}</p>
            {source.sourceId ? (
              <input type="hidden" name="sourceId" value={source.sourceId} />
            ) : (
              <input type="hidden" name="sourceVariantId" value={source.variantId} />
            )}
            <input type="hidden" name="sourceTitle" value={source.title} />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">원곡 오디오 파일</label>
            <input
              type="file"
              name="sourceFile"
              accept="audio/*"
              required
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-1 text-xs text-gray-400">mp3/wav 등 오디오 파일 (최대 50MB)</p>
            <label className="mt-3 block text-sm font-semibold text-gray-700 mb-1">원곡 제목 (선택)</label>
            <input type="text" name="sourceTitle" placeholder="예: 여름밤" className="input w-full" />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">원하는 느낌/분위기</label>
          <textarea
            name="desiredFeel"
            required
            rows={3}
            placeholder="예: 원곡을 신나는 EDM 페스티벌 버전으로, 더 빠른 템포와 강한 베이스로"
            className="input w-full"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="instrumental"
            checked={instrumental}
            onChange={(e) => setInstrumental(e.target.checked)}
          />
          인스트루멘탈(BGM곡)으로 만들기 | (가사/보컬 없이 반주)
        </label>

        {!instrumental && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">가사 (선택 — 비워두면 원곡 가사를 그대로 반영)</label>
              <textarea name="lyrics" rows={6} className="input w-full font-mono text-sm whitespace-pre-wrap" />
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">보컬 성별 (선택)</label>
                <select
                  name="vocalGender"
                  value={vocalGender}
                  onChange={(e) => setVocalGender(e.target.value as VocalGender | "")}
                  className="input w-32"
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
                <label className="block text-xs font-semibold text-gray-500 mb-1">언어</label>
                <select name="lang" value={lang} onChange={(e) => setLang(e.target.value)} className="input w-28">
                  {LANG_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">
              가사를 직접 안 넣으면 이 언어로 불러달라고 AI에게 지시합니다. 직접 가사를 입력했다면
              그 가사의 언어가 우선됩니다.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">리믹스 개수(대량생성)</label>
          <select
            name="count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="input w-24"
          >
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}개
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          {showAdvanced ? "▲ 세부 옵션 닫기" : "▼ 세부 옵션 (원곡 반영 강도 등, 선택)"}
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            <SliderField
              label="스타일 강도 (styleWeight)"
              name="styleWeight"
              value={styleWeight}
              onChange={setStyleWeight}
              hint="높을수록 지정한 새 스타일이 강하게 반영됩니다"
            />
            <SliderField
              label="변형 정도 (weirdnessConstraint)"
              name="weirdnessConstraint"
              value={weirdnessConstraint}
              onChange={setWeirdnessConstraint}
              hint="높을수록 더 실험적이고 예측하기 어려운 결과가 나옵니다"
            />
            <SliderField
              label="원곡 반영도 (audioWeight)"
              name="audioWeight"
              value={audioWeight}
              onChange={setAudioWeight}
              hint="높을수록 업로드한 원곡의 멜로디/구조가 더 많이 유지됩니다"
            />
          </div>
        )}

        <p className="text-xs text-gray-400">
          선택한 개수만큼 매번 OpenAI(스타일 기획)/Suno(리믹스 생성) API가 호출되니 개수만큼 비용이
          늘어납니다{count > 1 && ` (이번에 총 ${count}개 생성)`}. 2개 이상이면 매번 겹치지 않는 새
          스타일로 만들어집니다.
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
        >
          {isPending ? "리믹스 요청 중..." : "리믹스 생성하기"}
        </button>
      </form>

      {missingProvider && (
        <ApiKeyRequiredModal
          missingLabels={[PROVIDER_LABELS[missingProvider] ?? missingProvider]}
          onClose={() => setMissingProvider(null)}
        />
      )}
    </>
  );
}

function SliderField({
  label,
  name,
  value,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center text-xs font-bold text-gray-700">
        <span>{label}</span>
        <span className="text-blue-600">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        name={name}
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <p className="text-[11px] text-gray-400">{hint}</p>
    </div>
  );
}
