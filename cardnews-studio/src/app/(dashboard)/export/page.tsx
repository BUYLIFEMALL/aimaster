"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { renderCardToBlob } from "@/lib/cardnews/renderClient";
import { CardCanvas } from "@/components/studio/CardCanvas";
import { useStudio } from "@/components/studio/ProjectProvider";
import { BTN_PRIMARY, Card, ErrorNote, NeedPlan, StepHeader } from "@/components/studio/ui";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeName(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 40) || "cardnews";
}

export default function ExportPage() {
  const { project } = useStudio();
  const { plan, style, pages, title } = project;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!plan.topic.trim() || pages.length === 0) return <NeedPlan>먼저 1단계 기획과 2단계 문구를 마쳐주세요.</NeedPlan>;

  const noBg = pages.filter((p) => !p.imageUrl).length;
  const fileName = (i: number) => `${safeName(title)}-${String(i + 1).padStart(2, "0")}.png`;

  const downloadOne = async (i: number) => {
    setBusy(pages[i].id);
    setError(null);
    try {
      saveBlob(await renderCardToBlob(pages[i], style, plan.ratio, pages[i].imageUrl), fileName(i));
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setBusy("all");
    setError(null);
    try {
      for (let i = 0; i < pages.length; i++) {
        saveBlob(await renderCardToBlob(pages[i], style, plan.ratio, pages[i].imageUrl), fileName(i));
        // 브라우저가 연속 다운로드를 막지 않도록 잠깐 쉰다.
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <StepHeader step={5} title="내보내기" desc="완성된 카드를 PNG 파일로 저장합니다. 미리보기와 같은 모양으로 저장됩니다." />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy !== null} onClick={() => void downloadAll()} className={BTN_PRIMARY}>
            {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 전체 {pages.length}장 PNG 받기
          </button>
          <span className="text-xs text-gray-500">여러 파일이 연속으로 내려받아집니다. 브라우저가 &quot;여러 파일 다운로드&quot;를 물으면 허용해주세요.</span>
        </div>
        {noBg > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">배경이 없는 {noBg}장은 색 배경으로 저장됩니다. 4단계에서 배경을 만들면 더 좋은 결과가 나옵니다.</p>}
        {error && <ErrorNote message={error} />}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((p, i) => (
          <Card key={p.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                {i + 1} / {pages.length}
              </span>
              <button type="button" disabled={busy !== null} onClick={() => void downloadOne(i)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PNG
              </button>
            </div>
            <CardCanvas page={p} style={style} ratio={plan.ratio} />
          </Card>
        ))}
      </div>
    </div>
  );
}
