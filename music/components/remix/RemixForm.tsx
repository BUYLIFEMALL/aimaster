"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRemixAction } from "@/lib/actions/remix";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { VOCAL_GENDER_OPTIONS, LANG_OPTIONS } from "@/lib/constants";
import type { RemixMode, VocalGender } from "@/types/database.types";

const PROVIDER_LABELS: Record<string, string> = { openai: "OpenAI", suno: "Suno" };
const COUNT_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1); // 1~10

// 2026-10-21 Suno V6 3차 ⑤⑥: 같은 화면에서 방식 4가지를 고른다.
export const REMIX_MODE_OPTIONS: { value: RemixMode; icon: string; label: string; hint: string }[] = [
  { value: "cover", icon: "🎨", label: "스타일 커버", hint: "원곡을 새 장르·분위기로 다시 만듭니다." },
  { value: "add_vocals", icon: "🎤", label: "보컬 추가", hint: "연주곡·MR 반주 위에 AI 보컬을 입힙니다." },
  { value: "add_instrumental", icon: "🎹", label: "반주 추가", hint: "목소리·멜로디 녹음에 어울리는 반주를 붙입니다." },
  { value: "mashup", icon: "🔀", label: "매시업", hint: "두 곡을 섞어 새 곡을 만듭니다." },
];

interface RemixSource {
  title: string;
  variantId?: string;
  sourceId?: string;
  mrId?: string;
  mrPart?: "instrumental" | "vocal";
}

export interface MashupCandidate {
  variantId: string;
  label: string;
}

export function RemixForm({
  source,
  initialMode = "cover",
  mashupCandidates = [],
}: {
  source: RemixSource | null;
  initialMode?: RemixMode;
  mashupCandidates?: MashupCandidate[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<RemixMode>(initialMode);
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
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-[#272732] bg-[#14141b] p-6 sm:p-8 shadow-xl shadow-black/40 backdrop-blur-md"
      >
        {source ? (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3.5">
            <p className="text-xs font-bold text-orange-400 mb-0.5 flex items-center gap-1.5">
              <span>🎵</span>
              <span>선택된 원곡 소스</span>
            </p>
            <p className="text-sm font-bold text-white">{source.title}</p>
            {source.sourceId ? (
              <input type="hidden" name="sourceId" value={source.sourceId} />
            ) : source.mrId ? (
              <>
                <input type="hidden" name="sourceMrId" value={source.mrId} />
                <input type="hidden" name="mrPart" value={source.mrPart ?? "instrumental"} />
              </>
            ) : (
              <input type="hidden" name="sourceVariantId" value={source.variantId} />
            )}
            <input type="hidden" name="sourceTitle" value={source.title} />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">원곡 오디오 파일 (.mp3, .wav 등)</label>
              <input
                type="file"
                name="sourceFile"
                accept="audio/*"
                required
                className="block w-full text-xs text-zinc-300 rounded-xl border border-[#272738] bg-[#1a1926] p-2 file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-orange-500 file:to-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:from-orange-600 hover:file:to-amber-600 cursor-pointer"
              />
              <p className="mt-1 text-[11px] text-zinc-400">최대 50MB 고음질 오디오 파일 지원</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">원곡 제목 (선택)</label>
              <input
                type="text"
                name="sourceTitle"
                placeholder="예: 비 내리는 오후의 커피"
                className="input text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <p className="block text-xs font-bold text-zinc-300 mb-1.5">리믹스 방식</p>
          <input type="hidden" name="mode" value={mode} />
          <div className="grid grid-cols-2 gap-2">
            {REMIX_MODE_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                aria-pressed={mode === m.value}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  mode === m.value
                    ? "border-orange-500/60 bg-orange-500/10"
                    : "border-[#272738] bg-[#1a1926] hover:border-orange-500/30"
                }`}
              >
                <p className="text-xs font-bold text-white">
                  {m.icon} {m.label}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400 leading-snug">{m.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {mode === "mashup" && (
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              섞을 두 번째 곡 <span className="text-orange-400">*</span>
            </label>
            {mashupCandidates.length > 0 ? (
              <select name="secondVariantId" required defaultValue="" className="input text-xs">
                <option value="" disabled>
                  내 곡에서 고르기
                </option>
                {mashupCandidates.map((c) => (
                  <option key={c.variantId} value={c.variantId}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] text-zinc-400">완성된 내 곡이 있어야 두 번째 곡을 고를 수 있습니다.</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1.5">
            {mode === "cover" ? "원하는 리믹스 스타일 & 분위기" : mode === "add_instrumental" ? "원하는 반주 스타일 & 악기" : "원하는 스타일 & 분위기"}{" "}
            <span className="text-orange-400">*</span>
          </label>
          <textarea
            name="desiredFeel"
            required
            rows={3}
            placeholder="예: 원곡 멜로디를 경쾌한 시티팝 스타일로, 레트로 신디사이저와 그루브한 베이스라인 추가"
            className="input text-sm leading-relaxed"
          />
        </div>

        {/* 인스트루멘탈 BGM 토글 — 스타일 커버에서만 */}
        {mode === "cover" && (
        <div className="rounded-xl border border-[#272738] bg-[#1a1926] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-200">인스트루멘탈(BGM)으로 만들기</p>
            <p className="text-[11px] text-zinc-400">보컬 없이 세련된 악기 연주곡으로 리믹스합니다.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="instrumental"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#2b2b3b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-amber-500"></div>
          </label>
        </div>
        )}

        {!(mode === "cover" && instrumental) && mode !== "add_instrumental" && (
          <div className="space-y-4 rounded-xl border border-[#272738] bg-[#1a1926] p-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                가사 (선택 — 비워두면 원곡 가사를 자연스럽게 계승)
              </label>
              <textarea
                name="lyrics"
                rows={5}
                placeholder="가사를 새로 작성하거나 비워두세요."
                className="input text-xs font-mono whitespace-pre-wrap leading-relaxed"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">보컬 성별</label>
                <select
                  name="vocalGender"
                  value={vocalGender}
                  onChange={(e) => setVocalGender(e.target.value as VocalGender | "")}
                  className="input text-xs w-32"
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
                <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">가사 언어</label>
                <select
                  name="lang"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="input text-xs w-32"
                >
                  {LANG_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-[#272738] bg-[#1a1926] p-3 px-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300">리믹스 생성 개수 (대량생성)</label>
            <p className="text-[11px] text-zinc-400">선택한 개수만큼 독립적인 변주곡이 함께 생성됩니다.</p>
          </div>
          <select
            name="count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="input text-xs w-24 text-center font-bold"
          >
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}개 세트
              </option>
            ))}
          </select>
        </div>

        {/* 고급 설정 토글 버튼 */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5 transition-colors"
          >
            <span>{showAdvanced ? "▲ 세부 파라미터 닫기" : "▼ 세부 파라미터 조절 (스타일 강도 / 원곡 유지율)"}</span>
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4 rounded-xl border border-[#2a2a3c] bg-[#12121a] p-4 animate-in fade-in duration-200">
            <SliderField
              label="새 스타일 반영 강도 (styleWeight)"
              name="styleWeight"
              value={styleWeight}
              onChange={setStyleWeight}
              hint="높을수록 입력한 새로운 장르/무드 특성이 강하게 드러납니다."
            />
            <SliderField
              label="실험적 변형 정도 (weirdnessConstraint)"
              name="weirdnessConstraint"
              value={weirdnessConstraint}
              onChange={setWeirdnessConstraint}
              hint="높을수록 파격적이고 독창적인 사운드 텍스처가 연출됩니다."
            />
            <SliderField
              label="원곡 멜로디 유지율 (audioWeight)"
              name="audioWeight"
              value={audioWeight}
              onChange={setAudioWeight}
              hint="높을수록 원곡의 핵심 선율과 악기 구성이 충실히 보존됩니다."
            />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 text-white font-black py-4 px-6 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-sm tracking-wide"
        >
          {isPending ? "⚡ Suno AI 리믹스 엔진 가동 중..." : "🎛️ Suno AI 리믹스 생성 시작"}
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
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
        <span>{label}</span>
        <span className="text-orange-400 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        name={name}
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-[#272738] rounded-lg appearance-none cursor-pointer accent-orange-500"
      />
      <p className="text-[11px] text-zinc-400">{hint}</p>
    </div>
  );
}
