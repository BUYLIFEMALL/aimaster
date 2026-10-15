import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Play, Lock, Zap, ShieldCheck, Clock, TrendingUp, CheckCircle2, HelpCircle, ArrowRight, BookOpen, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import GoldGradientText from "@/components/ui/GoldGradientText";
import PaymentController from "@/components/payment/PaymentController";
import HeroSubscribeButton from "@/components/programs/HeroSubscribeButton";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { PHONE_REQUIRED_MESSAGE } from "@/lib/utils/phone";
import { PREMIUM_NOTICE_TITLE, PREMIUM_NOTICE_BODY } from "@/lib/programs/premium";
import type { MemberGrade } from "@/types/database.types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("name, short_desc, thumbnail_url")
    .eq("slug", slug)
    .single();
  if (!data) return { title: "Not Found" };

  const title = data.name;
  const description = data.short_desc || `${data.name} - AI Master 마케팅 자동화 프로그램`;

  return {
    title,
    description,
    openGraph: {
      title: `${data.name} | AI Master`,
      description,
      ...(data.thumbnail_url && { images: [{ url: data.thumbnail_url, width: 1200, height: 630 }] }),
    },
  };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*, category:categories(*), pricing_plans(*), required_grade:member_grades!required_grade_id(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!program) notFound();

  // 필요 등급 정보 (계층적)
  const requiredGrade: MemberGrade | null = program.required_grade
    ? (Array.isArray(program.required_grade) ? program.required_grade[0] : program.required_grade)
    : null;
  const hasGradeRestriction = !!requiredGrade;

  // 현재 사용자 등급 확인
  let userGrade: MemberGrade | null = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("grade_id, grade:member_grades(*)")
      .eq("id", user.id)
      .single();
    if (profile?.grade) {
      userGrade = Array.isArray(profile.grade) ? profile.grade[0] : profile.grade;
    }
  }

  // 접근 판정(구독 -> 개별부여 -> 등급)은 lib/access/checkProgramAccess.ts로 통일 —
  // 이 페이지가 예전에 자체 등급 비교만 하고 구독 여부를 아예 안 봤던 것과 같은 재발을
  // 막기 위해 화면마다 새로 짜지 않고 이 공용 함수를 재사용한다.
  const accessResult = user ? await checkProgramAccess(supabase, user.id, slug) : null;

  // 수량 제한 체크 (프로그램별 접근 판정과는 별개 개념이라 여기서 따로 계산)
  let reachedLimit = false;
  let maxPrograms: number | null = null;
  if (user && userGrade) {
    maxPrograms = userGrade.max_programs;
    if (maxPrograms != null) {
      const { count } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");
      reachedLimit = (count ?? 0) >= maxPrograms;
    }
  }

  const isAccessAllowed = !!accessResult?.allowed && !reachedLimit;

  const activePlans = (program.pricing_plans ?? []).filter((p: { is_active: boolean }) => p.is_active);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {accessResult?.reason === "phone_required" && (
        <div role="alert" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-5 py-4 text-sm text-gold-light">
          <p className="font-bold">{PHONE_REQUIRED_MESSAGE}</p>
          <Link href="/settings?need_phone=1" className="mt-1 inline-block underline">
            핸드폰 번호 등록하러 가기 →
          </Link>
        </div>
      )}
      {(program.badges ?? []).includes("premium") && (
        <div role="note" className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/10 px-5 py-4 text-sm text-amber-200">
          <p className="font-bold">{PREMIUM_NOTICE_TITLE}</p>
          <p className="mt-1 leading-relaxed">{PREMIUM_NOTICE_BODY}</p>
        </div>
      )}
      {/* Back */}
      <Link
        href="/programs"
        className="inline-flex items-center gap-2 text-subtext hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        프로그램 목록으로
      </Link>

      {/* Hero */}
      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        {/* Media */}
        <div className="space-y-4">
          {program.video_url ? (
            <div className="aspect-video rounded-2xl overflow-hidden bg-black">
              <iframe
                src={program.video_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : program.thumbnail_url ? (
            <div className="aspect-video rounded-2xl overflow-hidden relative">
              <Image
                src={program.thumbnail_url}
                alt={program.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-2xl bg-white/5 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center">
                <Play size={36} className="text-gold ml-1" />
              </div>
            </div>
          )}

          {/* Gallery */}
          {program.images && program.images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {program.images.slice(0, 3).map((img: string, i: number) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden relative">
                  <Image src={img} alt={`${program.name} ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {program.category && (
              <span className="text-gold/70 text-sm font-medium">{program.category.name}</span>
            )}
            {requiredGrade && (
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: requiredGrade.color ?? "#d4af37", color: requiredGrade.color ?? "#d4af37" }}
              >
                {requiredGrade.name} 이상
              </span>
            )}
            {program.version && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-white/15 text-subtext">
                {program.version}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-2 mb-4">
            {program.name}
          </h1>
          {program.short_desc && (
            <p className="text-subtext text-lg leading-relaxed mb-6">{program.short_desc}</p>
          )}

          {/* Quick pricing summary */}
          {activePlans.length > 0 && (
            <div className="glass-card rounded-xl p-5 mb-6">
              <p className="text-sm text-subtext mb-3">이용 요금</p>
              <div className="flex flex-wrap gap-3">
                {activePlans.map((plan: { id: string; name: string; price: number; billing_type: string }) => (
                  <div key={plan.id} className="text-center">
                    <div className="text-xs text-subtext mb-0.5">
                      {plan.billing_type === "monthly" ? "1개월"
                        : plan.billing_type === "bimonthly" ? "2개월"
                        : plan.billing_type === "quarterly" ? "3개월"
                        : plan.billing_type === "biannual" ? "6개월"
                        : plan.billing_type === "annual" ? "12개월"
                        : "평생"}
                    </div>
                    <div className="gold-text font-bold">
                      {new Intl.NumberFormat("ko-KR").format(plan.price)}원
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAccessAllowed && program.app_url ? (
            <a href={program.app_url} target="_blank" rel="noopener noreferrer" className="block">
              <button
                type="button"
                className="btn-gold w-full py-4 text-lg rounded-xl font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                지금 바로 이용하기
              </button>
            </a>
          ) : (
            <HeroSubscribeButton />
          )}

          {/* 크롬 확장 다운로드 (이용 권한이 있는 회원에게만, https 주소일 때만) */}
          {isAccessAllowed && program.extension_download_url && /^https:\/\//i.test(program.extension_download_url) && (
            <div className="glass-card rounded-xl p-5 mt-4">
              <p className="text-sm font-semibold text-white mb-1">
                크롬 확장 프로그램{program.extension_version ? ` · ${program.extension_version}` : ""}
              </p>
              <p className="text-xs text-subtext mb-3 leading-relaxed">
                ZIP을 받아 압축을 풀고, 크롬 주소창에 chrome://extensions 를 열어 개발자 모드를 켠 뒤 &quot;압축해제된 확장 프로그램을 로드합니다&quot;로 설치하세요.
                새 버전은 같은 폴더에 덮어쓰고 확장 관리 화면에서 새로고침합니다.
              </p>
              <a
                href={program.extension_download_url}
                rel="noopener noreferrer"
                className="block text-center w-full py-3 rounded-xl border border-gold/40 text-gold font-bold hover:bg-gold/10 transition-colors"
              >
                크롬 확장 ZIP 다운로드
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-6">
          프로그램 <GoldGradientText>상세 소개</GoldGradientText>
        </h2>
        {program.description ? (
          <div
            className="prose prose-invert prose-gold max-w-none text-subtext leading-relaxed mb-8 [&_p]:my-2"
            dangerouslySetInnerHTML={{ __html: program.description }}
          />
        ) : (
          <p className="text-subtext text-base leading-relaxed mb-8">
            {program.name}은(는) 인공지능 기반의 고성능 엔진을 탑재하여 일상적인 반복 작업과 마케팅 운영을 획기적으로 자동화하는 전문 도구입니다. 회원 본인의 인증 정보와 API 키를 안전하게 연동하여 계정 제재 위험 없이 신뢰할 수 있는 자동화 환경을 제공합니다.
          </p>
        )}

        {/* 4대 핵심 특장점 (Key Features Grid) */}
        <div className="grid sm:grid-cols-2 gap-6 mt-8">
          <div className="glass-card rounded-2xl p-6 border border-white/10 hover:border-gold/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">실시간 AI 알고리즘 엔진</h3>
            <p className="text-subtext text-sm leading-relaxed">
              최신 인공지능 모델과 연동하여 고품질 콘텐츠 생성, 데이터 분석, 키워드 발굴을 사람의 개입 없이 원클릭으로 처리합니다.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 hover:border-gold/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">본인 계정 · API 직접 연동</h3>
            <p className="text-subtext text-sm leading-relaxed">
              공용 키를 공유하지 않고 회원 본인의 인증 세션과 독립 API 키를 사용하므로, 플랫폼 정책을 준수하며 계정 정지 위험 없이 안전합니다.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 hover:border-gold/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4">
              <Clock size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">운영 시간 90% 이상 절감</h3>
            <p className="text-subtext text-sm leading-relaxed">
              매일 수 시간씩 소요되던 자료 조사, 대본 작성, 태그 추출 및 업로드 프로세스를 수 초 단위로 단축하여 핵심 비즈니스에 집중할 수 있습니다.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 hover:border-gold/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">성과 기반 바이럴 최적화</h3>
            <p className="text-subtext text-sm leading-relaxed">
              단순 복사 생성이 아닌 플랫폼별 떡상 지표(VPH, 조회수 배수, 검색 알고리즘 노출도)를 실시간 반영하여 도달률을 극대화합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 사용 순서 및 워크플로우 가이드 (How it Works) */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-2">
          실제 <GoldGradientText>사용 순서</GoldGradientText>
        </h2>
        <p className="text-subtext mb-8">누구나 4단계로 간편하게 자동화를 시작할 수 있습니다</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10 relative">
            <div className="text-gold font-black text-2xl mb-3">01</div>
            <h3 className="text-base font-bold text-white mb-2">계정 및 API 연동</h3>
            <p className="text-subtext text-xs leading-relaxed">
              프로그램 설정 화면에서 사용할 플랫폼 계정 또는 AI API 키를 직접 등록합니다. (가이드 제공)
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 relative">
            <div className="text-gold font-black text-2xl mb-3">02</div>
            <h3 className="text-base font-bold text-white mb-2">키워드 · 조건 설정</h3>
            <p className="text-subtext text-xs leading-relaxed">
              타겟팅할 키워드, 카테고리, 문체 톤앤매너, 주기 및 필터 조건을 원하는 대로 설정합니다.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 relative">
            <div className="text-gold font-black text-2xl mb-3">03</div>
            <h3 className="text-base font-bold text-white mb-2">원클릭 AI 실행 · 검수</h3>
            <p className="text-subtext text-xs leading-relaxed">
              실행 버튼 클릭 시 인공지능 엔진이 분석 및 생성을 진행하며, 완성된 결과물을 미리보기로 확인합니다.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 relative">
            <div className="text-gold font-black text-2xl mb-3">04</div>
            <h3 className="text-base font-bold text-white mb-2">자동 발행 및 성과 추적</h3>
            <p className="text-subtext text-xs leading-relaxed">
              즉시 발행 또는 원하는 시간에 맞춰 예약 배포하며, 누적된 성과와 반응을 실시간으로 확인합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 추천 대상 및 활용 시나리오 (Use Cases) */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-2">
          추천 <GoldGradientText>활용 대상</GoldGradientText>
        </h2>
        <p className="text-subtext mb-8">이런 분들께 가장 높은 생산성 향상 효과를 제공합니다</p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gold mb-4">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">1인 창업가 · 크리에이터</h3>
            <p className="text-subtext text-sm leading-relaxed mb-4">
              콘텐츠 기획부터 제작, 업로드까지 혼자 감당하기 벅찬 분들에게 24시간 일하는 AI 전담 팀원 역할을 해드립니다.
            </p>
            <ul className="text-xs text-subtext/80 space-y-1.5">
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gold" /> 매일 끊이지 않는 글감 및 숏폼 대본 수급</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gold" /> 톤앤매너를 유지하는 균일한 퀄리티 보장</li>
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gold mb-4">
              <Sparkles size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">이커머스 셀러 · 제휴마케터</h3>
            <p className="text-subtext text-sm leading-relaxed mb-4">
              상품 상세페이지 기획, 쿠팡 파트너스·스마트스토어 홍보 채널 확장을 빠르게 대량화하고 싶은 셀러에게 최적입니다.
            </p>
            <ul className="text-xs text-subtext/80 space-y-1.5">
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gold" /> 상품 키워드 기반 바이럴 포스팅 자동화</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gold" /> 다중 소셜 채널 분산 유입 파이프라인 구축</li>
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gold mb-4">
              <BookOpen size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">마케팅 대행사 · 브랜드 실무자</h3>
            <p className="text-subtext text-sm leading-relaxed mb-4">
              다수의 브랜드 계정을 효율적으로 관리하고 최신 검색 알고리즘에 맞춘 맞춤형 포스팅 전략을 전개할 수 있습니다.
            </p>
            <ul className="text-xs text-subtext/80 space-y-1.5">
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gold" /> 표준화된 운영 프로세스로 업무 인계 간소화</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gold" /> 지속적인 검색 노출 및 잠재 고객 확보</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 자주 묻는 질문 FAQ */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-2">
          자주 묻는 <GoldGradientText>질문 (FAQ)</GoldGradientText>
        </h2>
        <p className="text-subtext mb-8">프로그램 이용과 관련해 궁금하신 점을 확인하세요</p>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <HelpCircle size={18} className="text-gold shrink-0" />
              외부 플랫폼(네이버, 인스타그램, 유튜브 등) 계정 제재 위험은 없나요?
            </h3>
            <p className="text-subtext text-sm leading-relaxed pl-6">
              AI Master의 모든 자동화 도구는 플랫폼의 공식 정책과 API 표준을 준수합니다. 무차별적인 매크로 트래픽을 유발하지 않으며, 각 회원이 본인의 계정 인증을 통해 안전하게 동작하도록 분리 설계되어 있어 안심하고 사용하실 수 있습니다.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <HelpCircle size={18} className="text-gold shrink-0" />
              API 키나 계정 연동은 어떻게 진행하나요?
            </h3>
            <p className="text-subtext text-sm leading-relaxed pl-6">
              상단의 <Link href="/guides" className="text-gold hover:underline font-semibold">이용 가이드</Link> 메뉴에서 OpenAI, Google Gemini, Anthropic Claude, Meta Threads, YouTube Data API 등 서비스별 발급 절차를 초보자도 쉽게 따라 할 수 있도록 스크린샷과 함께 로그인 없이 제공하고 있습니다.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <HelpCircle size={18} className="text-gold shrink-0" />
              무료로도 체험해볼 수 있나요?
            </h3>
            <p className="text-subtext text-sm leading-relaxed pl-6">
              카탈로그에서 [FREE] 배지가 표시된 프로그램은 회원가입만 하시면 등급이나 결제와 무관하게 즉시 무료로 이용하실 수 있습니다. 유료 프로그램은 필요에 따라 1개월/2개월/3개월 단위로 유연하게 구독하실 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 가이드 센터 바로가기 배너 */}
      <section className="mb-16">
        <div className="glass-card rounded-2xl p-8 border border-gold/30 bg-gradient-to-r from-gold/5 via-surface/40 to-surface/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-semibold">
              <BookOpen size={13} />
              공식 연동 가이드
            </span>
            <h3 className="text-xl font-bold text-white">API 발급 및 플랫폼 연동이 처음이신가요?</h3>
            <p className="text-subtext text-sm">
              누구나 1분 만에 따라 할 수 있는 상세 매뉴얼을 무료로 확인해보세요.
            </p>
          </div>
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-gold text-sm font-bold shrink-0 hover:scale-105 transition-all shadow-md"
          >
            가이드 센터 바로가기
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Pricing */}
      {activePlans.length > 0 && (
        <section id="pricing" className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">
            요금 <GoldGradientText>플랜</GoldGradientText>
          </h2>
          <p className="text-subtext mb-8">필요에 맞는 플랜을 선택하세요</p>

          {!user ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Lock size={40} className="text-gold mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">로그인 후 구독할 수 있습니다</h3>
              <p className="text-subtext mb-4">로그인하면 원하는 요금제를 선택해 바로 구독할 수 있습니다.</p>
              <Link href="/login" className="text-gold hover:underline text-sm">
                로그인하기
              </Link>
            </div>
          ) : reachedLimit ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Lock size={40} className="text-gold mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">이용 한도 초과</h3>
              <p className="text-subtext mb-4">
                현재 등급(<span className="text-gold font-semibold">{userGrade?.name}</span>)은
                최대 <span className="text-gold font-semibold">{maxPrograms}개</span> 프로그램까지 이용 가능합니다.
                더 많은 프로그램을 이용하려면 등급을 업그레이드하세요.
              </p>
            </div>
          ) : (
            <PaymentController plans={activePlans} programName={program.name} programId={program.id} />
          )}
        </section>
      )}
    </div>
  );
}
