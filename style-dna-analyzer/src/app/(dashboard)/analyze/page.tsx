"use client";

import { useRef, useState } from "react";
import { Loader2, Microscope, Upload, HelpCircle, Sliders, Layers } from "lucide-react";
import { MODES, TARGET_IMAGE_MODELS, type AnalysisRecord, type DnaMode, type TargetImageModel } from "@/lib/dna/types";
import { ACCEPT_ATTR, fileToResizedDataUrl } from "@/lib/dna/imageFile";
import { useDna } from "@/components/dna/AnalysisProvider";
import { ResultView } from "@/components/dna/ResultView";
import { HelpGuideModal } from "@/components/dna/HelpGuideModal";
import { BTN_PRIMARY, Card, EnginePicker, ErrorNote, Field, INPUT, StepHeader } from "@/components/dna/ui";

export default function AnalyzePage() {
  const { record, setRecord, engine } = useDna();
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<DnaMode>("replicate");
  const [mutationLevel, setMutationLevel] = useState<number>(30);
  const [includeImageTag, setIncludeImageTag] = useState<boolean>(false);
  const [targetModel, setTargetModel] = useState<TargetImageModel>("gemini-3.1-flash-image-preview");
  const [guidance, setGuidance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const [drag, setDrag] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setImage(await fileToResizedDataUrl(file));
      setFileName(file.name);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "이미지를 읽지 못했습니다." });
    }
  };

  const analyze = async (overrideGuidance?: string, overrideMutation?: number) => {
    if (!image && !record?.imageUrl) return;
    const effectiveImage = image || record?.imageUrl;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: effectiveImage,
          mode,
          guidance: overrideGuidance !== undefined ? overrideGuidance : guidance,
          mutationLevel: overrideMutation !== undefined ? overrideMutation : mutationLevel,
          includeImageTag,
          targetModel,
          engine,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "분석하지 못했습니다."), { needKey: !!data.needApiKey });
      setRecord(data.record as AnalysisRecord);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "분석하지 못했습니다.", needKey: (e as { needKey?: boolean }).needKey });
    } finally {
      setBusy(false);
    }
  };

  const shown = image ?? record?.imageUrl ?? null;

  const mutationStage =
    mutationLevel <= 30
      ? { label: "Stable (보수적 재현)", desc: "원본 DNA 엄격 보존, 미세 질감 개선만", color: "text-blue-600 bg-blue-50 border-blue-200" }
      : mutationLevel <= 70
        ? { label: "Hybrid (구조 하이브리드)", desc: "구도 유지, 아트스타일·조명 적극 변이", color: "text-purple-600 bg-purple-50 border-purple-200" }
        : { label: "Chaotic (유전체 카오스)", desc: "핵심 축만 유지, 파격적/추상적 재해석", color: "text-rose-600 bg-rose-50 border-rose-200" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <StepHeader
          step={1}
          title="이미지 분석"
          desc="이미지를 올리면 카메라·조명·색상·스타일을 정밀 해독해 재현용 마스터 프레임워크를 만듭니다."
        />
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
        >
          <HelpCircle className="h-3.5 w-3.5 text-violet-600" />
          <span>도움말 및 가이드</span>
        </button>
      </div>

      <HelpGuideModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="space-y-4">
        <Card className="grid gap-5 lg:grid-cols-2">
          {/* 좌측 패널: 업로드 & 모드 & 변이 슬라이더 */}
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                void pick(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
                drag ? "border-violet-500 bg-violet-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="올린 이미지 미리보기" className="max-h-56 rounded-lg object-contain shadow-xs" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">클릭하거나 이미지를 끌어다 놓기</p>
                  <p className="text-[11px] text-slate-500">JPG · PNG · WebP (자동 12종 비율 감지)</p>
                </>
              )}
              {image && <p className="max-w-full truncate text-[11px] text-slate-500 font-mono">{fileName}</p>}
              <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold text-slate-700">분석 모드 선택</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
                      mode === m.value ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">{MODES.find((m) => m.value === mode)?.desc}</p>
            </div>

            {/* 돌연변이 레벨 슬라이더 (변이 모드일 때만 활성화) */}
            {mode === "mutate" && (
              <div className="rounded-xl border border-purple-200/80 bg-purple-50/50 p-3.5 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-purple-900">
                    <Sliders className="h-3.5 w-3.5 text-purple-600" />
                    돌연변이 레벨
                  </span>
                  <span className="font-mono text-sm font-extrabold text-purple-700">{mutationLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mutationLevel}
                  onChange={(e) => setMutationLevel(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-purple-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${mutationStage.color}`}>
                    {mutationStage.label}
                  </span>
                  <span className="text-[10px] text-purple-700/80">{mutationStage.desc}</span>
                </div>
              </div>
            )}

            {/* [첨부 이미지] 제공 토글 스위치 */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Layers className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span>첨부 이미지 제공 ([첨부 이미지] 스타일 앵커)</span>
                </div>
                <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                  켜면 프롬프트에 [첨부 이미지] 태그가 들어가 이미지를 직접 스타일 앵커로 참조합니다.
                </p>
              </div>
              <input
                type="checkbox"
                id="includeImageTagToggle"
                checked={includeImageTag}
                onChange={(e) => setIncludeImageTag(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer shrink-0"
              />
            </div>
          </div>

          {/* 우측 패널: 모델 선택 & 시스템 지침 & 시작 버튼 */}
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-bold text-slate-700">타겟 이미지 생성 모델</p>
              <select
                className={`${INPUT} text-xs font-medium`}
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value as TargetImageModel)}
              >
                {TARGET_IMAGE_MODELS.map((tm) => (
                  <option key={tm.value} value={tm.value}>
                    {tm.label} — {tm.desc}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="시스템 지침 (선택)"
              hint={
                mode === "mutate"
                  ? "어떤 방향으로 변형할지 적어주세요. 예: 겨울 눈 내리는 밤 분위기로, 사이버펑크 네온으로"
                  : "추가로 강조할 점이 있으면 적어주세요. 예: 옷감 질감을 더 자세히, 영화적 조명 강조"
              }
            >
              <textarea
                className={`${INPUT} h-24 resize-y text-xs font-mono`}
                value={guidance}
                maxLength={800}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder=">> System guidance override..."
              />
            </Field>

            <EnginePicker />

            <button
              type="button"
              disabled={(!image && !record?.imageUrl) || busy}
              onClick={() => void analyze()}
              className={`${BTN_PRIMARY} w-full`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Microscope className="h-4 w-4" />}
              {busy ? "DNA 시퀀싱 해독 중… (수십 초 소요)" : "이미지 시퀀싱 시작"}
            </button>
            <p className="text-[11px] text-slate-500 leading-tight">
              회원 본인의 API 키로 정밀 분석됩니다. 올린 이미지는 보관함에서 언제든 다시 불러올 수 있도록 안전하게 보관됩니다.
            </p>
            {error && <ErrorNote message={error.message} needKey={error.needKey} />}
          </div>
        </Card>

        {/* 결과 표시 섹션 */}
        <div className="min-w-0">
          {record ? (
            <ResultView
              record={record}
              onMutateQuick={(newLevel) => {
                setMode("mutate");
                setMutationLevel(newLevel);
                void analyze(`변이 강도 ${newLevel}% 적용`, newLevel);
              }}
            />
          ) : (
            <Card className="flex min-h-80 flex-col items-center justify-center gap-2 text-center text-slate-500">
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shown} alt="" className="max-h-72 rounded-lg object-contain opacity-70" />
              ) : (
                <Microscope className="h-10 w-10 text-slate-300" />
              )}
              <p className="text-sm font-bold">{busy ? "AI가 이미지의 시각적 DNA를 해독하고 있습니다…" : "분석된 DNA가 없습니다."}</p>
              <p className="text-xs">위에서 이미지를 올리고 시퀀싱을 시작해주세요.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
