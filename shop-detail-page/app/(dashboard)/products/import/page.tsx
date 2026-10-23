import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { LegacyImportForm } from "@/components/products/LegacyImportForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.16(이커머스 병합 E1): AI 12단 상세페이지 자료 옮기기
export default async function ImportLegacyPage() {
  await requireProgramAccess();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6"
      >
        <span>←</span>
        <span>상품 목록으로 돌아가기</span>
      </Link>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 text-3xl mb-3 shadow-xs">
          📦
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">12단 자료 가져오기</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          AI 12단 상세페이지 자동화가 이 프로그램으로 합쳐졌습니다. 12단에서 만든 상세페이지를 옮겨 와 서버에 안전하게 보관하고,
          쿠팡 12단·스마트스토어 9단 규격으로 이어서 다듬을 수 있습니다.
        </p>
      </div>

      <LegacyImportForm />
    </div>
  );
}
