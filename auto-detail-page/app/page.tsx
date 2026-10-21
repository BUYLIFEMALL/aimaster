import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

// v1.21(2026-10-21, 이커머스 병합 E2): 「상세페이지 자동화(15p)」의 「🧾 HTML 상세페이지로 내보내기」로 합쳐졌다.
// 이 프로그램으로 저장된 페이지(detail_pages)는 0건이라 옮길 자료가 없어 이동 안내만 남긴다(주소는 유지).
export default function Home() {
  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-4 text-center">
        <div className="text-4xl">🧾</div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">상세페이지 자동생성기 v1이 「상세페이지 자동화」로 합쳐졌습니다</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          쿠팡·스마트스토어·프리미엄 HTML 상세페이지는 이제 상세페이지 자동화의 상품 화면에서 「🧾 HTML 상세페이지로 내보내기」로 만드실 수 있습니다.
          만든 섹션 이미지를 그대로 쓰고, Claude 키 없이 등록해 둔 Gemini 키로 동작합니다.
        </p>
        <a
          href="https://shop-detail-page.buylife.xyz/products"
          className="inline-block w-full sm:w-auto text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-6 py-3"
        >
          상세페이지 자동화 열기 →
        </a>
        <p className="text-[11px] text-slate-400">{APP_VERSION}</p>
      </div>
    </main>
  );
}
