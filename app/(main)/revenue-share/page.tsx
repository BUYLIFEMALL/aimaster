import Link from "next/link";
import { Share2, DollarSign, BarChart3, Users, ArrowRight, CheckCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";

export const metadata = {
  title: "수익 공유 프로그램 | AI Master",
  description: "추천 링크로 프로그램을 소개하고 판매 수수료를 받으세요",
};

const STEPS = [
  {
    num: "01",
    icon: Users,
    title: "무료 회원가입",
    desc: "AI Master에 가입하면 자동으로 추천 코드가 발급됩니다.",
  },
  {
    num: "02",
    icon: Share2,
    title: "추천 링크 공유",
    desc: "블로그, SNS, 커뮤니티 등에 추천 링크를 공유하세요.",
  },
  {
    num: "03",
    icon: DollarSign,
    title: "수수료 자동 적립",
    desc: "추천 링크로 결제가 발생하면 수수료가 자동 적립됩니다.",
  },
  {
    num: "04",
    icon: BarChart3,
    title: "정산 요청",
    desc: "적립된 수수료를 원하는 때에 정산 요청하세요.",
  },
];

const BENEFITS = [
  "가입 즉시 추천 코드 자동 발급",
  "프로그램별 수수료율 투명 공개",
  "실시간 수익 현황 대시보드",
  "추천인 쿠키 30일 유지",
  "매월 정산 가능",
  "수수료 무제한 적립",
];

const FAQ = [
  {
    q: "수수료율은 어떻게 되나요?",
    a: "프로그램별로 상이하며, 평균 10~30%의 수수료가 제공됩니다. 각 프로그램 상세 페이지에서 확인 가능합니다.",
  },
  {
    q: "정산은 어떻게 받나요?",
    a: "어필리에이트 대시보드에서 정산 요청 시 입력한 계좌로 입금됩니다. 최소 정산 금액은 10,000원입니다.",
  },
  {
    q: "추천 링크 유효 기간은?",
    a: "방문자가 추천 링크를 클릭하면 30일간 쿠키가 유지됩니다. 30일 내 결제 시 수수료가 적립됩니다.",
  },
  {
    q: "누구나 참여할 수 있나요?",
    a: "네, AI Master에 가입한 모든 회원이 참여할 수 있습니다. 별도의 승인 절차 없이 바로 시작 가능합니다.",
  },
];

export default function RevenueSharePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-medium mb-6">
          <DollarSign size={14} />
          어필리에이트 프로그램
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
          추천하고 <GoldGradientText>수익</GoldGradientText>을 만드세요
        </h1>
        <p className="text-subtext text-lg max-w-2xl mx-auto mb-8">
          AI Master 프로그램을 추천 링크로 소개하면
          판매 금액의 일부를 수수료로 받을 수 있습니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <GoldButton size="lg">
              무료로 시작하기 <ArrowRight size={18} />
            </GoldButton>
          </Link>
          <Link href="/affiliate">
            <GoldButton variant="outline" size="lg">
              내 어필리에이트 현황
            </GoldButton>
          </Link>
        </div>
      </div>

      {/* How It Works */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            어떻게 <GoldGradientText>작동</GoldGradientText>하나요?
          </h2>
          <p className="text-subtext">4단계로 간단하게 시작</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(({ num, icon: Icon, title, desc }) => (
            <GlassCard key={num} className="text-center relative">
              <span className="absolute top-4 right-4 text-gold/20 text-3xl font-black">
                {num}
              </span>
              <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <Icon size={24} className="text-gold" />
              </div>
              <h3 className="text-white font-bold mb-2">{title}</h3>
              <p className="text-subtext text-sm">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="mb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              수익 공유의 <GoldGradientText>장점</GoldGradientText>
            </h2>
            <ul className="space-y-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-gold flex-shrink-0" />
                  <span className="text-subtext">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <GlassCard glow className="text-center">
            <p className="text-subtext text-sm mb-2">평균 수수료율</p>
            <div className="text-6xl font-black gold-text mb-2">10~30%</div>
            <p className="text-subtext text-sm mb-6">프로그램별 상이</p>
            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <div className="text-2xl font-bold text-white">30일</div>
                <div className="text-subtext text-xs">쿠키 유지</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">실시간</div>
                <div className="text-subtext text-xs">수익 추적</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">매월</div>
                <div className="text-subtext text-xs">정산 가능</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            자주 묻는 <GoldGradientText>질문</GoldGradientText>
          </h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ.map(({ q, a }) => (
            <GlassCard key={q} className="p-5">
              <h3 className="text-white font-semibold mb-2">{q}</h3>
              <p className="text-subtext text-sm leading-relaxed">{a}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="text-center">
        <GlassCard glow className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">
            지금 바로 시작하세요
          </h2>
          <p className="text-subtext mb-6">
            가입 즉시 추천 코드가 발급됩니다. 수익 창출을 시작하세요.
          </p>
          <Link href="/register">
            <GoldButton size="lg">무료 회원가입</GoldButton>
          </Link>
        </GlassCard>
      </div>
    </div>
  );
}
