import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

const PIPELINE = [
  { icon: "🔑", title: "본인 키 등록", desc: "OpenAI·Perplexity 키, 선호 모델, 텔레그램 봇", time: "약 5분", href: "/settings" },
  { icon: "📍", title: "관심 지역 고르기", desc: "서울 자치구를 여러 개 선택", time: "30초", href: "/districts" },
  { icon: "⚡", title: "지금 조회 · 예약", desc: "버튼으로 바로 조회하거나 1~24시간 주기 예약", time: "1분", href: "/districts" },
  { icon: "🏢", title: "실거래·AI 분석 확인", desc: "공시가 대비·토지 정보·투자 매력도", time: "바로", href: "/listings" },
];

const NUMBERS = [
  { chip: "💰 거래가", desc: "국토부에 신고된 실제 계약 금액(만원 → 억으로 표시)" },
  { chip: "🏛️ 공시가격", desc: "정부가 매년 정하는 주택 가격(세금 기준). VWorld에서 가져와요" },
  { chip: "📐 공시가 대비", desc: "거래가 ÷ 공시가격. 높을수록 공시가보다 비싸게 거래된 것" },
  { chip: "⭐ 투자 매력도", desc: "AI가 0~100점으로 매긴 추정치(높을수록 매력적)" },
  { chip: "📉 저평가지수", desc: "주변·공시가 대비 싸게 거래됐는지에 대한 AI 추정" },
  { chip: "📈 1년 상승예측", desc: "AI가 본 1년 뒤 가격 변화 예상(%)" },
];

const FAQ = [
  {
    q: "실거래가가 왜 최신 매물 가격과 달라요?",
    a: "실거래가는 지금 팔려고 내놓은 매물(호가)이 아니라, 이미 계약하고 정부에 신고까지 끝난 거래예요. 계약 후 최대 30일 안에 신고되기 때문에 최근 거래가 늦게 보일 수 있어요.",
  },
  {
    q: "AI 분석 비용은 얼마나 드나요?",
    a: "실거래 상세 화면을 처음 열 때 회원님 본인 OpenAI·Perplexity 키로 1회 분석하고 결과를 저장해요. 같은 실거래를 다시 열면 저장된 결과를 보여 줘 추가 비용이 없어요. 「다시 분석하기」를 누를 때만 새로 호출됩니다.",
  },
  {
    q: "서울 말고 다른 지역도 되나요?",
    a: "지금은 서울 25개 자치구만 지원해요. 서울 열린데이터광장의 실거래 데이터를 쓰기 때문입니다.",
  },
  {
    q: "예약 조회를 켜면 어떻게 되나요?",
    a: "정해 둔 주기(1·3·6·12·24시간)와 시간대에 자동으로 실거래를 조회하고, 새 거래가 있으면 분석해서 텔레그램으로 보내 드려요. 끄면 「지금 조회하기」 버튼으로만 동작해요.",
  },
];

const GUIDE_LINKS = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

export default async function GuidePage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="📖 연동 & 사용 매뉴얼"
        title="5분 만에 시작하는 실거래 투자분석"
        description="키 등록부터 관심 지역 실거래 확인·AI 투자 분석까지, 아래 4단계만 따라오시면 됩니다."
      >
        <Link href="/districts" className="mx-btn-primary">
          📍 관심 지역 고르러 가기
        </Link>
      </PageHero>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mx-primary text-2xl">🏙️</div>
        <div className="mx-card rounded-tl-none p-4">
          <p className="text-sm leading-relaxed text-mx-text">
            안녕하세요, 실거래 비서예요! 관심 있는 동네를 알려 주시면 <b>새로 신고된 실거래</b>를 모아 드리고, 공시가격·토지 정보와 함께{" "}
            <b>AI가 투자 매력도를 분석</b>해 드려요. 새 거래가 생기면 <b>텔레그램</b>으로도 알려 드릴게요.
          </p>
        </div>
      </div>

      <section className="mx-card">
        <h2 className="mx-section-title">🧭 사용 순서</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {PIPELINE.map((step, idx) => (
            <li key={step.title} className="relative">
              <Link
                href={step.href}
                className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-4 transition-colors hover:border-mx-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mx-primary text-xs font-bold text-white">{idx + 1}</span>
                  <span className="mx-chip px-2 py-0.5">⏱ {step.time}</span>
                </div>
                <span className="mt-3 text-3xl">{step.icon}</span>
                <span className="mt-2 text-sm font-bold text-mx-text">{step.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-mx-muted">{step.desc}</span>
              </Link>
              {idx < PIPELINE.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-mx-accent md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-card">
        <h2 className="mx-section-title">📊 숫자 읽는 법</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {NUMBERS.map((n) => (
            <div key={n.chip} className="rounded-xl bg-mx-raised p-3">
              <span className="mx-chip-blue">{n.chip}</span>
              <p className="mt-2 text-xs text-mx-muted">{n.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-mx-muted">거래가·공시가격은 실제 값, 투자 매력도·저평가지수·상승예측은 AI 추정치예요.</p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#065f46] bg-[#064e3b]/40 p-4">
          <p className="text-sm font-bold text-[#a7f3d0]">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#d1fae5]">
            <li>실거래 내역에서 「공시가 대비 높은순」으로 정렬하면 시세가 강한 단지를 빨리 찾을 수 있어요.</li>
            <li>예약 조회는 시간대를 정해 두면 밤에는 알림이 오지 않아요.</li>
            <li>같은 단지의 여러 거래를 표로 비교하면 층·면적에 따른 가격 차이가 보여요.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[#92400e] bg-[#78350f]/40 p-4">
          <p className="text-sm font-bold text-[#fde68a]">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#fef3c7]">
            <li>AI 분석은 회원님 <b>본인 키</b>로만 처리돼요(운영자 키 대신 사용 없음).</li>
            <li>AI 점수는 참고용 추정치예요. 투자 판단과 책임은 본인에게 있고 수익을 보장하지 않아요.</li>
            <li>실거래는 신고 지연(최대 30일)이 있어 가장 최근 거래가 빠져 있을 수 있어요.</li>
          </ul>
        </div>
      </div>

      <section className="mx-card">
        <h2 className="mx-section-title">🔑 키 발급 매뉴얼</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
          <Link href="/settings" className="mx-btn-primary min-h-[40px] text-xs">
            🔑 지금 키 등록하기
          </Link>
        </div>
      </section>

      <section className="mx-card">
        <h2 className="mx-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-mx-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-mx-text">
                <span className="mr-1 text-mx-accent group-open:hidden">＋</span>
                <span className="mr-1 hidden text-mx-accent group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-mx-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
