"use client";

import { useRef, useState } from "react";
import { Loader2, Microscope, Upload } from "lucide-react";
import { MODES, type AnalysisRecord, type DnaMode } from "@/lib/dna/types";
import { ACCEPT_ATTR, fileToResizedDataUrl } from "@/lib/dna/imageFile";
import { useDna } from "@/components/dna/AnalysisProvider";
import { ResultView } from "@/components/dna/ResultView";
import { BTN_PRIMARY, Card, EnginePicker, ErrorNote, Field, INPUT, StepHeader } from "@/components/dna/ui";

export default function AnalyzePage() {
  const { record, setRecord, engine } = useDna();
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<DnaMode>("replicate");
  const [guidance, setGuidance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const [drag, setDrag] = useState(false);
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

  const analyze = async () => {
    if (!image) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mode, guidance, engine }),
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

  return (
    <div className="space-y-6">
      <StepHeader step={1} title="이미지 분석" desc="이미지를 올리면 카메라·조명·색상·스타일을 분석해 재현용 마스터 프롬프트를 만듭니다. 결과는 자동으로 보관함에 저장됩니다." />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="space-y-4">
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
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${drag ? "border-cyan-500 bg-cyan-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="올린 이미지 미리보기" className="max-h-56 rounded-lg object-contain" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-gray-400" />
                <p className="text-sm font-bold text-gray-700">클릭하거나 이미지를 끌어다 놓기</p>
                <p className="text-[11px] text-gray-500">JPG · PNG · WebP</p>
              </>
            )}
            {image && <p className="max-w-full truncate text-[11px] text-gray-500">{fileName}</p>}
            <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold text-gray-700">분석 모드</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`rounded-lg px-2 py-2 text-xs font-bold transition ${mode === m.value ? "bg-cyan-600 text-white shadow-xs" : "text-gray-600 hover:bg-white"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">{MODES.find((m) => m.value === mode)?.desc}</p>
          </div>

          <Field label="시스템 지침 (선택)" hint={mode === "mutate" ? "어떤 방향으로 변형할지 적어주세요. 예: 겨울 눈 내리는 밤 분위기로" : "추가로 강조할 점이 있으면 적어주세요. 예: 옷감 질감을 더 자세히"}>
            <textarea className={`${INPUT} h-24 resize-y`} value={guidance} maxLength={800} onChange={(e) => setGuidance(e.target.value)} placeholder=">> System guidance override..." />
          </Field>

          <EnginePicker />

          <button type="button" disabled={!image || busy} onClick={() => void analyze()} className={`${BTN_PRIMARY} w-full`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Microscope className="h-4 w-4" />} {busy ? "DNA 해독 중… (수십 초 걸립니다)" : "이미지 시퀀싱 시작"}
          </button>
          <p className="text-[11px] text-gray-500">분석 1회마다 AI 호출 1건(유료)이 발생합니다. 올린 이미지는 보관함에서 다시 불러 쓸 수 있도록 회원님 계정에만 저장됩니다.</p>
          {error && <ErrorNote message={error.message} needKey={error.needKey} />}
        </Card>

        <div className="min-w-0">
          {record ? (
            <ResultView record={record} />
          ) : (
            <Card className="flex min-h-80 flex-col items-center justify-center gap-2 text-center text-gray-500">
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shown} alt="" className="max-h-72 rounded-lg object-contain opacity-70" />
              ) : (
                <Microscope className="h-10 w-10 text-gray-300" />
              )}
              <p className="text-sm font-bold">{busy ? "AI가 이미지를 분석하고 있습니다…" : "분석된 DNA가 없습니다."}</p>
              <p className="text-xs">왼쪽에서 이미지를 올리고 시작해주세요.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
