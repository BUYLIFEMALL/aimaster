"use client";

// D29 상품 등록 도우미 — 메모(+대표 사진) → 이름·한 줄 소개·설명 초안 → 「칸에 채우기」. 저장은 아래 「저장」 단추로 운영자가 한다.
import { useRef, useState, useTransition } from "react";
import { aiProductDraftAction, type ProductDraftState } from "@/lib/ai-helper-actions";

export default function AiFill({ slug }: { slug: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [memo, setMemo] = useState("");
  const [withImage, setWithImage] = useState(true);
  const [result, setResult] = useState<ProductDraftState | null>(null);
  const [filled, setFilled] = useState(false);
  const [pending, start] = useTransition();

  const form = () => box.current?.closest("form") ?? null;
  const firstImage = () => {
    const raw = (form()?.elements.namedItem("images") as HTMLInputElement | null)?.value;
    try {
      const list = JSON.parse(raw ?? "[]") as { url: string }[];
      return list[0]?.url ?? null;
    } catch {
      return null;
    }
  };

  const ask = () =>
    start(async () => {
      setFilled(false);
      setResult(await aiProductDraftAction(slug, { memo, imageUrl: withImage ? firstImage() : null }));
    });

  const fill = () => {
    if (!result?.ok) return;
    const f = form();
    if (!f) return;
    const set = (name: string, value: string) => {
      const el = f.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && value) el.value = value;
    };
    set("name", result.draft.name);
    set("summary", result.draft.summary);
    set("description", result.draft.description);
    setFilled(true);
  };

  return (
    <div ref={box} className="rounded-lg border border-violet-200 bg-violet-50/50 p-4" data-ai-fill>
      <p className="text-sm font-semibold">🤖 AI로 채우기</p>
      <p className="mt-1 text-xs text-gray-600">무엇인지·특징·규격을 몇 줄 적으면 상품 이름·한 줄 소개·설명 초안을 만듭니다. 몰 대표 본인 키로 부르며(누를 때만), 저장은 아래 「저장」을 눌러야 됩니다.</p>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="예: A4 복사지 80g 500매, 한 박스 5권, 잉크젯·레이저 겸용, 사무실 대량 구매용"
        className="mt-2 w-full rounded border bg-white px-3 py-2 text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} /> 대표 사진도 함께 보내기(올린 첫 사진)
        </label>
        <button type="button" onClick={ask} disabled={pending || memo.trim().length < 2} className="min-h-11 rounded bg-violet-700 px-4 py-2 text-sm text-white disabled:opacity-50">
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
        <div className="mt-3 space-y-2 rounded border bg-white p-3 text-sm" data-ai-draft>
          <p><b>이름</b> {result.draft.name}</p>
          <p><b>한 줄 소개</b> {result.draft.summary}</p>
          <p className="whitespace-pre-line"><b>설명</b>{"\n"}{result.draft.description}</p>
          {result.draft.options.length > 0 && (
            <p><b>옵션 후보</b> {result.draft.options.map((g) => `${g.name}: ${g.values.join("/")}`).join(" · ")} <span className="text-xs text-gray-500">(옵션은 저장 뒤 「옵션」 칸에서 직접 만듭니다)</span></p>
          )}
          {result.draft.cautions.length > 0 && (
            <ul className="list-disc pl-5 text-amber-800">
              {result.draft.cautions.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={fill} className="min-h-11 rounded bg-gray-900 px-4 py-2 text-white">칸에 채우기</button>
            {filled && <span className="text-green-700">채웠습니다. 확인·수정한 뒤 「저장」을 눌러 주세요.</span>}
            <span className="text-xs text-gray-500">{result.cost.model} · 약 {result.cost.krw.toLocaleString()}원</span>
          </div>
        </div>
      )}
    </div>
  );
}
