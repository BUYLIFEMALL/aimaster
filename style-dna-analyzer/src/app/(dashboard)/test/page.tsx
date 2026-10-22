"use client";

import { useState } from "react";
import { Download, FlaskConical, Loader2, Maximize2, X, Image as ImageIcon, Sparkles } from "lucide-react";
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL } from "@/lib/ai/imageModels";
import { colorMatch, fileToResizedDataUrl } from "@/lib/dna/imageFile";
import { SUBJECT_PLACEHOLDER_EN } from "@/lib/dna/types";
import { useDna } from "@/components/dna/AnalysisProvider";
import { CompareSlider } from "@/components/dna/CompareSlider";
import { BTN_PRIMARY, Card, ErrorNote, Field, INPUT, NeedAnalysis, SELECT, StepHeader } from "@/components/dna/ui";

export default function TestPage() {
  const { record, keys } = useDna();
  const [subject, setSubject] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [attach, setAttach] = useState(true);
  const [customRefImage, setCustomRefImage] = useState<string | null>(null);
  const [imageModel, setImageModel] = useState(DEFAULT_IMAGE_MODEL);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ image: string; match: number | null } | null>(null);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [showSingles, setShowSingles] = useState(false);

  if (!record) return <NeedAnalysis>먼저 1단계에서 이미지를 분석하거나 보관함에서 분석을 불러와주세요.</NeedAnalysis>;

  const defaultPrompt = subject
    ? record.result.masterPromptEn.split(SUBJECT_PLACEHOLDER_EN).join(subject)
    : record.result.masterPromptEn;

  const needSubject = !isEditingPrompt && record.result.masterPromptEn.includes(SUBJECT_PLACEHOLDER_EN);

  const handleCustomRefUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setCustomRefImage(dataUrl);
      setAttach(true);
    } catch {
      // ignore
    }
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/test-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          subject,
          customPrompt: isEditingPrompt ? customPrompt : undefined,
          attachImage: attach,
          customReference: customRefImage || undefined,
          imageModel,
          ratio: record.aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "이미지를 만들지 못했습니다."), { needKey: !!data.needApiKey });
      let match: number | null = null;
      try {
        match = await colorMatch(record.imageUrl, data.image);
      } catch {
        match = null; // 비교에 실패해도 생성된 이미지는 보여 준다
      }
      setResult({ image: data.image as string, match });
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "이미지를 만들지 못했습니다.", needKey: (e as { needKey?: boolean }).needKey });
    } finally {
      setBusy(false);
    }
  };

  const geminiMissing = keys ? !keys.gemini : false;

  return (
    <div className="space-y-6">
      <StepHeader
        step={3}
        title="결과 테스트 및 이미지 합성"
        desc="마스터 프롬프트로 실제 이미지를 한 장 만들어 원본과 나란히 비교합니다. 대상 프롬프트를 자유롭게 수정하거나 참조 이미지를 연결할 수 있습니다."
      />

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* 컨트롤 패널 */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black uppercase text-slate-900 tracking-wider">추론 및 생성 설정</span>
            <button
              type="button"
              onClick={() => {
                if (!isEditingPrompt) {
                  setCustomPrompt(defaultPrompt);
                  setIsEditingPrompt(true);
                } else {
                  setIsEditingPrompt(false);
                }
              }}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-800 transition"
            >
              {isEditingPrompt ? "기본 프롬프트 모드로" : "프롬프트 직접 편집"}
            </button>
          </div>

          {!isEditingPrompt ? (
            <Field
              label={needSubject ? "피사체 대입 (필수)" : "피사체 대입 (선택)"}
              hint={
                needSubject
                  ? `프롬프트의 ${SUBJECT_PLACEHOLDER_EN} 자리에 들어갑니다. 예: a cybernetic cat sitting on a neon rooftop`
                  : "현재 프롬프트에 자리표시자가 없으므로 피사체 없이 생성되거나 직접 편집할 수 있습니다."
              }
            >
              <textarea
                className={`${INPUT} h-20 resize-y text-xs font-mono`}
                value={subject}
                maxLength={300}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="a young Korean woman in modern hanbok, cinematic lighting"
              />
            </Field>
          ) : (
            <Field label="대상 프롬프트 직접 편집 (Target Prompt)" hint="[주제 입력] 부분을 원하는 피사체로 바꾸거나 자유롭게 편집하세요.">
              <textarea
                className={`${INPUT} h-36 resize-y text-xs font-mono`}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter complete prompt..."
              />
            </Field>
          )}

          {/* 참조 이미지 연결 위젯 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-violet-600" />
                참조 이미지 (Visual DNA Anchor)
              </span>
              <button
                type="button"
                onClick={() => setAttach(!attach)}
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border transition ${
                  attach
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {attach ? "참조 이미지 연결됨" : "참조 이미지 없음"}
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-tight">
              이미지를 첨부하면 생성 모델이 원본의 색감과 시각적 DNA를 직접 참고하여 완성도를 높입니다.
            </p>
            {attach && (
              <div className="flex items-center gap-2 pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={customRefImage || record.imageUrl}
                  alt="참조 이미지"
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                />
                <label className="text-[11px] font-bold text-violet-600 hover:text-violet-800 cursor-pointer">
                  <span>참조 이미지 변경</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleCustomRefUpload(e.target.files?.[0])}
                  />
                </label>
                {customRefImage && (
                  <button
                    type="button"
                    onClick={() => setCustomRefImage(null)}
                    className="text-[11px] text-rose-500 hover:underline"
                  >
                    초기화
                  </button>
                )}
              </div>
            )}
          </div>

          <Field label="이미지 생성 모델">
            <select className={SELECT} value={imageModel} onChange={(e) => setImageModel(e.target.value)}>
              {IMAGE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="button"
            disabled={busy || (needSubject && !subject.trim()) || geminiMissing}
            onClick={() => void run()}
            className={`${BTN_PRIMARY} w-full`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            {busy ? "DNA 합성 시뮬레이션 중…" : "공정 시작 (이미지 1장 합성)"}
          </button>

          {geminiMissing && <ErrorNote message="이미지 생성에는 Google Gemini API 키가 필요합니다." needKey />}
          <p className="text-[11px] text-slate-500 leading-tight">
            생성 1회마다 회원 본인의 Gemini 이미지 호출 1건(유료)이 발생합니다.
          </p>
          {error && <ErrorNote message={error.message} needKey={error.needKey} />}
        </Card>

        {/* 결과 비교 패널 */}
        <div className="space-y-4">
          {/* v1.29: 결과가 나오면 개별 두 카드는 접고 아래 비교 상자를 크게 보여 준다 */}
          <div className={`grid gap-4 sm:grid-cols-2 ${result && !showSingles ? "hidden" : ""}`}>
            <Card className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">원본 레퍼런스</h2>
                <span className="text-[11px] font-mono font-bold text-slate-400">{record.aspectRatio}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.imageUrl}
                alt="원본 이미지"
                className="w-full max-h-80 rounded-xl border border-slate-200 bg-slate-100 object-contain shadow-2xs"
              />
            </Card>

            <Card className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">DNA 합성 미리보기</h2>
                {result && (
                  <button
                    type="button"
                    onClick={() => setZoomOpen(true)}
                    className="text-slate-400 hover:text-slate-700 transition"
                    title="확대 보기"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {result ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.image}
                  alt="생성된 이미지"
                  onClick={() => setZoomOpen(true)}
                  className="w-full max-h-80 rounded-xl border border-slate-200 bg-slate-100 object-contain cursor-zoom-in shadow-2xs hover:opacity-95 transition"
                />
              ) : (
                <div className="flex aspect-square max-h-80 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400 flex-col gap-1.5 p-6 text-center">
                  <Sparkles className="h-6 w-6 text-slate-300" />
                  <span>{busy ? "DNA 합성 시뮬레이션 중…" : "왼쪽에서 피사체를 입력하고 공정 시작을 눌러주세요."}</span>
                </div>
              )}
            </Card>
          </div>

          {/* F5(v1.27): 원본 ↔ 생성 겹쳐 비교 */}
          {result && (
            <Card className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">원본 ↔ 생성 비교</h2>
                <button type="button" onClick={() => setShowSingles((v) => !v)} className="text-[11px] font-bold text-violet-700 hover:underline" aria-expanded={showSingles}>
                  {showSingles ? "개별 이미지 접기 ▴" : "개별 이미지 보기 ▾"}
                </button>
              </div>
              <CompareSlider before={record.imageUrl} after={result.image} maxHeight={640} />
            </Card>
          )}

          {result && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-violet-100 bg-violet-50/40">
              <div>
                <p className="text-[11px] font-bold text-slate-500">색감 일치율 (실측 히스토그램 비교)</p>
                <p className="text-3xl font-black text-violet-900">{result.match === null ? "—" : `${result.match}%`}</p>
                <p className="text-[11px] text-slate-500">두 이미지의 실제 픽셀 색상 분포를 정밀 측정한 값입니다.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>확대 보기</span>
                </button>
                <a
                  href={result.image}
                  download={`style-dna-test.${result.image.startsWith("data:image/webp") ? "webp" : "png"}`}
                  className={`${BTN_PRIMARY} text-xs`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>이미지 다운로드</span>
                </a>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 확대 줌 모달 */}
      {zoomOpen && result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md cursor-zoom-out"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
            aria-label="닫기"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.image}
              alt="Zoomed DNA Test"
              className="max-h-[82vh] max-w-[88vw] rounded-xl object-contain shadow-2xl"
            />
            <a
              href={result.image}
              download="style-dna-result.png"
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
            >
              <Download className="h-4 w-4" />
              <span>고해상도 다운로드</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
