import { shortsProductUrl, type ShortsProduct } from "@/lib/shortsLink";

// 상품 → AI 쇼츠 원스톱 「상품 홍보 쇼츠」로 넘기기(새 창). 비용은 쇼츠 쪽에서 회원이 대본을 만들 때만 든다.
export function ShortsHandoffCard({ product }: { product: ShortsProduct }) {
  const href = shortsProductUrl(product);
  if (!href) return null;
  return (
    <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="min-w-0">
        <h3 className="text-base font-black text-slate-900">🎬 이 상품으로 홍보 쇼츠 만들기</h3>
        <p className="mt-1 text-xs text-slate-500">
          상품명·핵심 특징(최대 3줄)·할인가가 있을 때만 가격을 AI 쇼츠 원스톱으로 넘깁니다. 상품 사진은 쇼츠 화면의 「📷 상품 사진」에서 올려 주세요.
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-rose-400 hover:text-rose-600"
      >
        🎬 쇼츠로 만들기 ↗
      </a>
    </section>
  );
}
