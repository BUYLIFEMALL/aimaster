"use client";

import { useState } from "react";
import { Download, FlaskConical, Loader2 } from "lucide-react";
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL } from "@/lib/ai/imageModels";
import { colorMatch } from "@/lib/dna/imageFile";
import { SUBJECT_PLACEHOLDER_EN } from "@/lib/dna/types";
import { useDna } from "@/components/dna/AnalysisProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, Field, INPUT, NeedAnalysis, SELECT, StepHeader } from "@/components/dna/ui";

export default function TestPage() {
  const { record, keys } = useDna();
  const [subject, setSubject] = useState("");
  const [attach, setAttach] = useState(false);
  const [imageModel, setImageModel] = useState(DEFAULT_IMAGE_MODEL);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ image: string; match: number | null } | null>(null);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);

  if (!record) return <NeedAnalysis>먼저 1단계에서 이미지를 분석하거나 보관함에서 분석을 불러와주세요.</NeedAnalysis>;
  const needSubject = record.result.masterPromptEn.includes(SUBJECT_PLACEHOLDER_EN);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/test-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, subject, attachImage: attach, imageModel }),
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
      <StepHeader step={3} title="결과 테스트" desc="마스터 프롬프트로 실제 이미지를 한 장 만들어 원본과 나란히 비교합니다. 색감 일치율은 두 이미지의 색 분포를 직접 측정한 값입니다." />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="space-y-4">
          <Field label={needSubject ? "피사체 (필수)" : "피사체 (선택)"} hint={needSubject ? `프롬프트의 ${SUBJECT_PLACEHOLDER_EN} 자리에 들어갑니다. 영어가 가장 정확합니다. 예: a young woman in a hanbok` : "이 프롬프트에는 자리표시자가 없어 그대로 생성합니다."}>
            <textarea className={`${INPUT} h-24 resize-y`} value={subject} maxLength={300} onChange={(e) => setSubject(e.target.value)} placeholder="a young woman in a hanbok" />
          </Field>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="mt-0.5" />
            <span>
              <b>원본 이미지를 스타일 참고로 함께 보내기</b>
              <br />
              색감·질감이 더 비슷해지지만 원본 구도를 따라갈 수 있습니다.
            </span>
          </label>

          <Field label="이미지 모델">
            <select className={SELECT} value={imageModel} onChange={(e) => setImageModel(e.target.value)}>
              {IMAGE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <button type="button" disabled={busy || (needSubject && !subject.trim()) || geminiMissing} onClick={() => void run()} className={`${BTN_PRIMARY} w-full`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} {busy ? "이미지 생성 중…" : "결과 테스트 (이미지 1장 생성)"}
          </button>
          {geminiMissing && <ErrorNote message="이미지 생성에는 Google Gemini API 키가 필요합니다." needKey />}
          <p className="text-[11px] text-gray-500">생성 1회마다 Gemini 이미지 호출 1건(유료)이 발생하며 요금은 회원님 Gemini 계정에 청구됩니다. 생성 이미지는 저장되지 않으니 마음에 들면 바로 내려받으세요.</p>
          {error && <ErrorNote message={error.message} needKey={error.needKey} />}
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="space-y-2">
              <h2 className="text-sm font-bold text-gray-900">원본</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={record.imageUrl} alt="원본 이미지" className="w-full rounded-xl border border-gray-200 bg-gray-100 object-contain" />
            </Card>
            <Card className="space-y-2">
              <h2 className="text-sm font-bold text-gray-900">생성 결과</h2>
              {result ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.image} alt="생성된 이미지" className="w-full rounded-xl border border-gray-200 bg-gray-100 object-contain" />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">{busy ? "생성 중…" : "아직 생성한 이미지가 없습니다."}</div>
              )}
            </Card>
          </div>

          {result && (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-gray-500">색감 일치율 (측정)</p>
                <p className="text-3xl font-extrabold text-cyan-800">{result.match === null ? "—" : `${result.match}%`}</p>
                <p className="text-[11px] text-gray-500">색 분포만 비교한 값이며 구도·형태·인물 닮음은 반영하지 않습니다.</p>
              </div>
              <a href={result.image} download={`style-dna-test.${result.image.startsWith("data:image/webp") ? "webp" : "png"}`} className={BTN_GHOST}>
                <Download className="h-4 w-4" /> 이미지 내려받기
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
