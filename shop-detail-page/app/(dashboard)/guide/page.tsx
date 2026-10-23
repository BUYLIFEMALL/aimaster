import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { CommerceUsageGuide } from "@/components/guide/CommerceUsageGuide";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <span>← 대시보드로 돌아가기</span>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>📖</span>
              <span>AI 상세페이지 자동화 연동 & 사용 안내</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              15개 섹션 AI 맞춤 생성 파이프라인 및 고전환율 스마트스토어·쿠팡 상세페이지 제작 가이드북입니다.
            </p>
          </div>
        </div>
      </div>

      <CommerceUsageGuide />
    </div>
  );
}
