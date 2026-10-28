import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Sparkles, Crown, ArrowRight, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "이용권 — 프로그램을 골라 한 달 사용",
  description:
    "원하는 프로그램을 개수만큼 골라 한 달 동안 사용하는 이용권입니다. 10개·30개·50개·전체 중에서 선택하세요.",
};

type Pass = {
  name: string;
  count: string;
  price: string;
  premium: boolean;
  highlight?: boolean;
  all?: boolean;
  desc: string;
};

const PASSES: Pass[] = [
  {
    name: "10개 이용권",
    count: "프로그램 10개",
    price: "월 20,000원",
    premium: false,
    desc: "자주 쓰는 프로그램 10개를 직접 골라 한 달 동안 사용합니다.",
  },
  {
    name: "30개 이용권",
    count: "프로그램 30개",
    price: "월 30,000원",
    premium: false,
    desc: "여러 분야를 넓게 쓰는 분께 맞는 30개 묶음입니다.",
  },
  {
    name: "50개 이용권",
    count: "프로그램 50개",
    price: "월 49,000원",
    premium: true,
    highlight: true,
    desc: "프리미엄 배지 프로그램까지 골라 담을 수 있는 50개 묶음입니다.",
  },
  {
    name: "전체 이용권",
    count: "모든 프로그램",
    price: "월 79,000원",
    premium: true,
    all: true,
    desc: "프리미엄 포함 모든 프로그램을 제한 없이 사용합니다.",
  },
];

export default function PassPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 히어로 */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-semibold mb-4">
          <Sparkles size={13} />
          이용권 안내
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          원하는 프로그램을 골라, 한 달 동안
        </h1>
        <p className="text-subtext text-lg max-w-2xl mx-auto">
          이용권을 구매하면 원하는 프로그램을 개수만큼 직접 골라 한 달(결제 주기) 동안 사용할 수 있습니다.
          프로그램마다 따로 결제할 필요 없이 묶음으로 편하게 쓰세요.
        </p>
      </div>

      {/* 곧 오픈 배너 */}
      <div className="mb-12 glass-card rounded-2xl p-5 border border-gold/30 bg-gradient-to-r from-gold/5 via-surface/40 to-surface/80 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 text-gold text-xs font-bold">
          <Info size={13} />
          결제 연동 준비 중
        </span>
        <p className="text-white text-sm">
          이용권 결제는 곧 오픈됩니다. 오픈 전까지는 프로그램별 개별 이용이나 회원 등급 혜택을 이용해 주세요.
        </p>
      </div>

      {/* 이용권 카드 4종 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {PASSES.map((pass) => (
          <div
            key={pass.name}
            className={`glass-card rounded-2xl p-6 flex flex-col ${
              pass.highlight
                ? "border-2 border-gold/50 bg-gradient-to-b from-gold/5 to-surface/80"
                : "border border-white/10"
            }`}
          >
            {pass.highlight && (
              <span className="self-start mb-3 px-2.5 py-0.5 rounded-full bg-gold text-black text-[11px] font-bold">
                인기
              </span>
            )}
            <h2 className="text-lg font-bold text-white">{pass.name}</h2>
            <p className="text-subtext text-sm mt-1">{pass.count}</p>
            <p className="text-2xl font-bold text-gold mt-4">{pass.price}</p>
            <p className="text-subtext text-sm mt-3 flex-1">{pass.desc}</p>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-white">
                <Check size={15} className="text-gold shrink-0" />
                <span>{pass.all ? "모든 프로그램 자유롭게 이용" : "직접 골라 한 달 사용"}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                {pass.premium ? (
                  <>
                    <Crown size={15} className="text-gold shrink-0" />
                    <span>{pass.all ? "프리미엄 배지 프로그램 포함" : "프리미엄 배지 프로그램 선택 가능"}</span>
                  </>
                ) : (
                  <>
                    <X size={15} className="text-subtext shrink-0" />
                    <span className="text-subtext">프리미엄 배지 프로그램 제외</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-6 w-full py-3 rounded-xl border border-white/10 bg-white/5 text-subtext text-sm font-semibold cursor-not-allowed"
            >
              곧 오픈
            </button>
          </div>
        ))}
      </div>

      {/* 안내: 어떻게 동작하나 */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {[
          {
            step: "1",
            title: "이용권을 고릅니다",
            body: "10개·30개·50개·전체 중 필요한 묶음을 선택합니다. 매달 결제로 이용 기간이 유지됩니다.",
          },
          {
            step: "2",
            title: "프로그램을 담습니다",
            body: "개수만큼 원하는 프로그램을 직접 골라 담습니다. 50개·전체 이용권은 프리미엄 배지 프로그램도 담을 수 있습니다.",
          },
          {
            step: "3",
            title: "한 달 동안 사용합니다",
            body: "담은 프로그램을 결제 주기 동안 자유롭게 사용합니다. 각 프로그램은 회원 본인 API 키·계정으로 동작합니다.",
          },
        ].map((s) => (
          <div key={s.step} className="glass-card rounded-2xl p-6 border border-white/10">
            <div className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold mb-3">
              {s.step}
            </div>
            <h3 className="text-white font-bold mb-2">{s.title}</h3>
            <p className="text-subtext text-sm">{s.body}</p>
          </div>
        ))}
      </div>

      {/* 프리미엄 안내 */}
      <div className="glass-card rounded-2xl p-6 border border-white/10 mb-16">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Crown size={16} className="text-gold" />
          프리미엄 배지 프로그램 안내
        </h3>
        <p className="text-subtext text-sm leading-relaxed">
          운영 비용이 많이 발생하는 일부 프로그램에는 프리미엄 배지가 붙습니다. 프리미엄 배지 프로그램은 회원 등급의 무료 제공과는
          별개로 결제가 필요합니다. 이용권으로는 <span className="text-white font-semibold">50개·전체 이용권</span>에서만
          프리미엄 배지 프로그램을 골라 담을 수 있으며, 10개·30개 이용권에서는 선택할 수 없습니다.
        </p>
      </div>

      {/* 하단 CTA */}
      <div className="glass-card rounded-2xl p-8 border border-gold/30 bg-gradient-to-r from-gold/5 via-surface/40 to-surface/80 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            먼저 어떤 프로그램이 있는지 둘러보세요
          </h2>
          <p className="text-subtext text-sm">
            마케팅 자동화 프로그램 전체를 먼저 살펴보고, 이용권 오픈 때 담을 프로그램을 골라 두세요.
          </p>
        </div>
        <Link
          href="/programs"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl btn-gold text-sm font-bold shrink-0 hover:scale-105 transition-all shadow-md"
        >
          프로그램 둘러보기
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
