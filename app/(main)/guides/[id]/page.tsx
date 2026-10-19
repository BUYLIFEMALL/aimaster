import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import { getGuideMeta } from "@/lib/guideMeta";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_guides").select("title, category").eq("id", id).single();
  return {
    title: data ? `${data.title} | AIMaster 가이드북` : "API생성 · 플랫폼연동",
  };
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: guide } = await supabase
    .from("platform_guides")
    .select("id, category, title, content")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!guide) notFound();

  // 같은 카테고리의 연관 가이드 3개 조회
  const { data: relatedGuides } = await supabase
    .from("platform_guides")
    .select("id, category, title")
    .eq("category", guide.category)
    .eq("is_active", true)
    .neq("id", id)
    .limit(3);

  const meta = getGuideMeta(guide.title, guide.category);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 1. 상단 내비게이션 바 */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <Link
          href="/guides"
          className="inline-flex items-center gap-2 text-subtext hover:text-white text-xs sm:text-sm font-semibold transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10"
        >
          <ArrowLeft size={15} />
          <span>가이드 목록으로</span>
        </Link>

        {meta.consoleUrl && (
          <a
            href={meta.consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 font-bold text-xs border border-amber-400/30 transition-all hover:scale-105 shadow-sm"
          >
            <span>{meta.consoleLabel || "공식 콘솔 바로가기"}</span>
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* 2. 가이드 상세 메인 카드 */}
      <GlassCard className="p-6 sm:p-10 mb-8 border-white/15 shadow-2xl">
        {/* 상단 메타 정보 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
              {meta.icon}
            </span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${meta.badgeTone}`}>
                  {guide.category}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${meta.difficultyTone}`}>
                  {meta.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-subtext">
                <Clock size={12} className="text-amber-400" />
                <span>예상 소요 시간: <strong className="text-white">{meta.estimatedTime}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/api-settings">
              <GoldButton size="sm" className="flex items-center gap-1.5 text-xs">
                <KeyRound size={13} className="text-slate-950" />
                <span>API키 등록하기</span>
              </GoldButton>
            </Link>
          </div>
        </div>

        {/* 대형 제목 */}
        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-6 tracking-tight">
          {guide.title}
        </h1>

        {/* 최상위 보안 안내 배너 */}
        <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200 leading-relaxed">
            <strong className="font-bold text-emerald-300 block mb-0.5">AIMaster 보안 격리 원칙</strong>
            AIMaster는 회원의 계정이나 비밀번호를 절대 보관하지 않으며, 회원 본인이 직접 발급한 API 키를 암호화하여 회원별 독립 DB에 안전하게 격리 보관합니다.
          </div>
        </div>

        {/* 3. 가이드 본문 HTML 컨테이너 */}
        <div
          className="prose-editor text-subtext leading-relaxed text-sm sm:text-base space-y-4"
          dangerouslySetInnerHTML={{ __html: guide.content }}
        />

        {/* 하단 완료 체크 박스 */}
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <CheckCircle2 size={16} className="text-amber-400" />
            <span>키 발급이 완료되었으면 <strong>[API키등록·플랫폼연동]</strong> 화면에 저장해 주세요.</span>
          </div>

          <Link href="/api-settings">
            <GoldButton size="md" className="w-full sm:w-auto">
              <span>내 계정에 키 등록하러 가기 →</span>
            </GoldButton>
          </Link>
        </div>
      </GlassCard>

      {/* 4. 같은 카테고리의 연관 가이드 추천 */}
      {relatedGuides && relatedGuides.length > 0 && (
        <div className="mt-12">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles size={15} className="text-amber-400" />
            <span>{guide.category} 분야의 다른 가이드</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {relatedGuides.map((rel) => {
              const relMeta = getGuideMeta(rel.title, rel.category);
              return (
                <Link key={rel.id} href={`/guides/${rel.id}`} className="group block">
                  <GlassCard hover className="p-4 h-full flex flex-col justify-between group-hover:border-gold/40">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{relMeta.icon}</span>
                      <span className="text-[10px] font-bold text-gold/80">{rel.category}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                      {rel.title}
                    </h4>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
