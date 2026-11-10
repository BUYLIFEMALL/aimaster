"use client";

// D29 첫 화면 「AI 초안 만들기」 — 업종 한 줄 → 블록 초안. 편집기에 올리기만 하고, 초안 저장·게시는 운영자가 누른다
import { useState, useTransition } from "react";
import { BLOCK_DEFS, MAX_BLOCKS, type Block } from "@/lib/blocks";
import { aiHomeDraftAction, type HomeDraftState } from "@/lib/ai-helper-actions";

export default function AiHome({ slug, count, onApply }: { slug: string; count: number; onApply: (blocks: Block[], mode: "replace" | "append") => void }) {
  const [industry, setIndustry] = useState("");
  const [result, setResult] = useState<HomeDraftState | null>(null);
  const [applied, setApplied] = useState("");
  const [pending, start] = useTransition();

  const ask = () =>
    start(async () => {
      setApplied("");
      setResult(await aiHomeDraftAction(slug, industry));
    });
  const apply = (mode: "replace" | "append") => {
    if (!result?.ok) return;
    onApply(result.blocks, mode);
    setApplied(mode === "replace" ? "지금 블록을 AI 초안으로 바꿨습니다." : "AI 초안을 지금 블록 뒤에 붙였습니다.");
  };

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/50 p-4" data-ai-home>
      <p className="text-sm font-semibold">🤖 AI 초안 만들기</p>
      <p className="mt-1 text-xs text-gray-600">업종·분위기를 한 줄 적으면 카테고리·상품을 보고 블록 배치 초안을 만듭니다(그림이 필요 없는 띠 문구·쇼윈도·탭·카테고리 바로가기·후기·공지만). 몰 대표 본인 키로 부르며, 손님 화면에는 「손님 화면에 게시」를 눌러야 보입니다.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input value={industry} onChange={(e) => setIndustry(e.target.value)} maxLength={200} placeholder="예: 사무용품 도매, 깔끔하고 신뢰감 있게" className="min-w-0 flex-1 rounded border bg-white px-3 py-2 text-sm" />
        <button type="button" onClick={ask} disabled={pending || industry.trim().length < 2} className="min-h-11 rounded bg-violet-700 px-4 py-2 text-sm text-white disabled:opacity-50">
          {pending ? "만드는 중…" : "AI 초안 받기"}
        </button>
      </div>
      {result && !result.ok && (
        <p className="mt-2 text-sm text-red-600" data-ai-error>
          {result.error}
          {result.needKey && <> — <a href={`/s/${slug}/admin/settings#ai`} className="underline">키 등록하러 가기</a></>}
        </p>
      )}
      {result?.ok && (
        <div className="mt-3 rounded border bg-white p-3 text-sm" data-ai-home-draft>
          <ol className="list-decimal pl-5">
            {result.blocks.map((b) => (
              <li key={b.id}>
                {BLOCK_DEFS[b.type].label}
                {"title" in (b.settings as object) && (b.settings as { title: string }).title ? ` — ${(b.settings as { title: string }).title}` : ""}
              </li>
            ))}
          </ol>
          {result.note && <p className="mt-2 text-gray-600">{result.note}</p>}
          {result.dropped > 0 && <p className="mt-1 text-xs text-amber-800">형식이 맞지 않아 뺀 블록 {result.dropped}개</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => apply("replace")} className="min-h-11 rounded bg-gray-900 px-4 py-2 text-white">지금 블록을 이걸로 바꾸기</button>
            {count + result.blocks.length <= MAX_BLOCKS && (
              <button type="button" onClick={() => apply("append")} className="min-h-11 rounded border px-4 py-2">뒤에 붙이기</button>
            )}
            <span className="text-xs text-gray-500">{result.cost.model} · 약 {result.cost.krw.toLocaleString()}원</span>
          </div>
          {applied && <p className="mt-2 text-green-700">{applied} 마음에 들면 「초안 저장」 또는 「손님 화면에 게시」를 눌러 주세요.</p>}
        </div>
      )}
    </section>
  );
}
