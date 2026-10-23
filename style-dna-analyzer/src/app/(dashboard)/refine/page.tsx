"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import type { AnalysisRecord } from "@/lib/dna/types";
import { useDna } from "@/components/dna/AnalysisProvider";
import { PromptBox } from "@/components/dna/ResultView";
import { BTN_GHOST, BTN_PRIMARY, Card, EnginePicker, ErrorNote, INPUT, NeedAnalysis, StepHeader } from "@/components/dna/ui";

const QUICK = [
  "색감을 더 따뜻하게",
  "조명을 더 부드럽게",
  "배경을 단순하게",
  "질감과 디테일을 더 강조",
  "더 시네마틱한 분위기로",
  "변이 강도 50% 적용 (Hybrid)",
  "변이 강도 80% 적용 (Chaotic)",
  "사이버네틱 네온 질감 주입",
  "브루탈리즘 건축 미학 적용",
];

export default function RefinePage() {
  const { record, setRecord, engine } = useDna();
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);

  if (!record) return <NeedAnalysis>먼저 1단계에서 이미지를 분석하거나 보관함에서 분석을 불러와주세요.</NeedAnalysis>;

  const refine = async () => {
    if (!feedback.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, feedback, engine }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "보정하지 못했습니다."), { needKey: !!data.needApiKey });
      setRecord(data.record as AnalysisRecord);
      setFeedback("");
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "보정하지 못했습니다.", needKey: (e as { needKey?: boolean }).needKey });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <StepHeader step={2} title="프롬프트 보정" desc="결과가 마음에 들지 않는 부분을 말로 적으면 AI가 마스터 프롬프트를 미세하게 고칩니다. 고친 결과는 보관함에 바로 저장됩니다." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={record.imageUrl} alt="" className="h-14 w-14 rounded-lg border border-gray-200 object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">{record.result.titleKo || record.title}</p>
              <p className="truncate text-xs text-gray-500">{record.result.titleEn}</p>
            </div>
          </div>
          <PromptBox label="마스터 프롬프트 (EN)" text={record.result.masterPromptEn} />
          <PromptBox label="마스터 프롬프트 (KO)" text={record.result.masterPromptKo} />
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900">추론 인터페이스</h2>
            <textarea className={`${INPUT} h-28 resize-y`} value={feedback} maxLength={600} onChange={(e) => setFeedback(e.target.value)} placeholder="DNA 보정을 위한 피드백 입력... 예: 배경 한옥을 더 흐리게, 색감은 더 따뜻하게" />
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => setFeedback((f) => (f ? `${f}, ${q}` : q))} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100">
                  {q}
                </button>
              ))}
            </div>
            <EnginePicker label="보정 AI" />
            <button type="button" disabled={!feedback.trim() || busy} onClick={() => void refine()} className={`${BTN_PRIMARY} w-full`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} 미세 보정 요청
            </button>
            <p className="text-[11px] text-gray-500">보정 1회마다 AI 호출 1건(유료)이 발생합니다. 영어·한국어 프롬프트가 함께 고쳐집니다.</p>
            {error && <ErrorNote message={error.message} needKey={error.needKey} />}
          </Card>

          <Card className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">보정 기록 ({record.history.length})</h2>
            {record.history.length === 0 ? (
              <p className="text-xs text-gray-500">아직 보정한 적이 없습니다.</p>
            ) : (
              <ol className="space-y-2">
                {[...record.history].reverse().map((h, i) => (
                  <li key={h.at + i} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-xs">
                    <p className="font-bold text-gray-800">요청: {h.feedback}</p>
                    {h.note && <p className="mt-0.5 text-gray-600">→ {h.note}</p>}
                    <p className="mt-0.5 text-[10px] text-gray-400">{new Date(h.at).toLocaleString("ko-KR")}</p>
                  </li>
                ))}
              </ol>
            )}
            <button type="button" className={BTN_GHOST} onClick={() => setFeedback("")}>
              입력 지우기
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
