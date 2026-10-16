import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { MusicUsageGuide } from "@/components/guide/MusicUsageGuide";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      {/* 상단 네비게이션 & 헤더 */}
      <div className="mb-8">
        <Link
          href="/plannings"
          className="text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 mb-4"
        >
          <span>← 곡 목록으로 돌아가기</span>
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-9 w-9 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xl shadow-md shadow-orange-500/10">
              📚
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Suno AI 음악 자동화 사용 가이드북
            </h1>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
            Cyber Suno Studio Guide
          </span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
          주제 기획부터 Suno 최신 엔진 음원 생성, 곡 연장(Extend), MR/보컬 분리, 방송용 WAV 추출,
          Remix 스튜디오까지 한눈에 마스터할 수 있는 완벽 실전 가이드입니다.
        </p>
      </div>

      {/* 3대 탭 인터랙티브 가이드 컴포넌트 */}
      <MusicUsageGuide />
    </div>
  );
}
