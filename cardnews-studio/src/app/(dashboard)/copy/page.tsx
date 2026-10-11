"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Wand2 } from "lucide-react";
import { newPageId } from "@/lib/cardnews/defaults";
import { useStudio } from "@/components/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, EnginePicker, ErrorNote, INPUT, NeedPlan, StepHeader } from "@/components/studio/ui";

export default function CopyPage() {
  const { project, update, keys } = useStudio();
  const { plan, pages } = project;
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);

  if (!plan.topic.trim()) return <NeedPlan>먼저 1단계에서 분야와 핵심 주제를 입력해주세요.</NeedPlan>;

  const engineReady = keys ? keys[project.engine.provider] : true;

  const generate = async () => {
    setConfirm(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cardnews/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, engine: project.engine }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "문구를 만들지 못했습니다.", needKey: data.needApiKey });
        return;
      }
      const made = data.pages as { headline: string; sub: string }[];
      update((d) => ({
        ...d,
        // 장 수가 같으면 이미 만든 배경 이미지는 그대로 둔다(장 번호 기준).
        pages: made.map((p, i) => ({
          id: newPageId(),
          headline: p.headline,
          sub: p.sub,
          imageUrl: d.pages.length === made.length ? d.pages[i]?.imageUrl : undefined,
          imageUrls: d.pages.length === made.length ? d.pages[i]?.imageUrls : undefined,
        })),
      }));
    } catch {
      setError({ message: "네트워크 오류로 문구를 만들지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  };

  const setPage = (i: number, patch: { headline?: string; sub?: string }) =>
    update((d) => ({ ...d, pages: d.pages.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));

  return (
    <div className="space-y-6">
      <StepHeader step={2} title="문구" desc={`"${plan.topic}" 주제로 ${plan.pageCount}장의 문구를 AI가 쓰고, 직접 다듬습니다.`} />

      <Card className="space-y-4">
        <EnginePicker />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={loading || !engineReady}
            onClick={() => (pages.length > 0 ? setConfirm(true) : void generate())}
            className={BTN_PRIMARY}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {pages.length > 0 ? "문구 다시 기획" : "문구 기획"}
          </button>
          {loading && <span className="text-xs text-gray-500">AI가 문구를 쓰는 중입니다. 잠시만 기다려주세요…</span>}
        </div>
        {confirm && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>지금 쓴 문구가 새 문구로 바뀝니다. 직접 고친 내용은 사라집니다. 계속할까요?</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void generate()} className={BTN_PRIMARY}>
                다시 기획
              </button>
              <button type="button" onClick={() => setConfirm(false)} className={BTN_GHOST}>
                취소
              </button>
            </div>
          </div>
        )}
        {error && <ErrorNote message={error.message} needKey={error.needKey} />}
      </Card>

      {pages.length > 0 && (
        <div className="space-y-3">
          {pages.map((p, i) => (
            <Card key={p.id}>
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                  {i + 1} / {pages.length}
                  {i === 0 ? " · 표지" : i === pages.length - 1 ? " · 마무리" : ""}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex justify-between text-xs font-bold text-gray-700">
                    제목(헤드라인) <span className={p.headline.length > 18 ? "text-amber-600" : "text-gray-400"}>{p.headline.length}/18자 권장</span>
                  </label>
                  <textarea className={`${INPUT} min-h-20`} value={p.headline} maxLength={60} onChange={(e) => setPage(i, { headline: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-xs font-bold text-gray-700">
                    보조 문구 <span className={p.sub.length > 70 ? "text-amber-600" : "text-gray-400"}>{p.sub.length}/70자 권장</span>
                  </label>
                  <textarea className={`${INPUT} min-h-20`} value={p.sub} maxLength={160} onChange={(e) => setPage(i, { sub: e.target.value })} />
                </div>
              </div>
            </Card>
          ))}
          <div className="flex justify-end">
            <Link href="/design" className={BTN_PRIMARY}>
              다음: 디자인 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
