import Link from "next/link";
import { Wrench, MessageSquare, Code, Paintbrush, ArrowRight, CheckCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";

export const metadata = {
  title: "커스텀 솔루션 | AI Master",
  description: "비즈니스에 맞춤화된 AI 마케팅 자동화 솔루션을 제작해드립니다",
};

const SERVICES = [
  {
    icon: Code,
    title: "맞춤형 자동화 개발",
    desc: "비즈니스 프로세스에 맞춘 AI 마케팅 자동화 도구를 개발합니다.",
    features: ["워크플로우 분석", "맞춤 봇 개발", "API 연동", "테스트 & 배포"],
  },
  {
    icon: Paintbrush,
    title: "브랜드 커스터마이징",
    desc: "기존 프로그램을 브랜드 아이덴티티에 맞게 커스터마이징합니다.",
    features: ["UI/UX 커스터마이징", "브랜드 색상 적용", "로고 & 문구 변경", "화이트라벨 지원"],
  },
  {
    icon: MessageSquare,
    title: "컨설팅 & 교육",
    desc: "AI 마케팅 자동화 전략 수립과 팀 교육을 지원합니다.",
    features: ["현황 진단", "전략 수립", "도구 교육", "성과 분석"],
  },
];

const PROCESS = [
  { step: "01", title: "상담 요청", desc: "고객지원 페이지에서 문의" },
  { step: "02", title: "요구사항 분석", desc: "비즈니스 목표와 니즈 파악" },
  { step: "03", title: "제안서 & 견적", desc: "맞춤 솔루션 제안 및 견적" },
  { step: "04", title: "개발 & 납품", desc: "개발 후 테스트 및 배포" },
];

export default function CustomPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-medium mb-6">
          <Wrench size={14} />
          맞춤 솔루션
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
          비즈니스에 맞춘 <GoldGradientText>커스텀</GoldGradientText> 솔루션
        </h1>
        <p className="text-subtext text-lg max-w-2xl mx-auto mb-8">
          표준 프로그램으로 부족하신가요?
          비즈니스에 최적화된 맞춤형 AI 마케팅 솔루션을 제작해드립니다.
        </p>
        <Link href="/support">
          <GoldButton size="lg">
            상담 요청하기 <ArrowRight size={18} />
          </GoldButton>
        </Link>
      </div>

      {/* Services */}
      <section className="mb-20">
        <div className="grid lg:grid-cols-3 gap-6">
          {SERVICES.map(({ icon: Icon, title, desc, features }) => (
            <GlassCard key={title} className="flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                <Icon size={22} className="text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-subtext text-sm mb-5">{desc}</p>
              <ul className="space-y-2 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-subtext">
                    <CheckCircle size={14} className="text-gold flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            진행 <GoldGradientText>프로세스</GoldGradientText>
          </h2>
          <p className="text-subtext">상담부터 납품까지 체계적으로 진행합니다</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {PROCESS.map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-gold font-black text-lg">{step}</span>
              </div>
              <h3 className="text-white font-bold mb-1">{title}</h3>
              <p className="text-subtext text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="text-center">
        <GlassCard glow className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">
            맞춤 솔루션이 필요하신가요?
          </h2>
          <p className="text-subtext mb-6">
            비즈니스 요구사항을 알려주시면 최적의 솔루션을 제안해드립니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/support">
              <GoldButton size="lg">상담 요청</GoldButton>
            </Link>
            <Link href="/programs">
              <GoldButton variant="outline" size="lg">기존 프로그램 보기</GoldButton>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
