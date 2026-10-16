import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/layout/PageHero";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PIPELINE = [
  { icon: "🔑", title: "본인 키 등록", desc: "SerpApi·OpenAI 키를 「API키등록·플랫폼연동」에 저장", time: "약 3분", href: "/settings" },
  { icon: "🌱", title: "씨드 키워드 추가", desc: "확장할 키워드와 검색엔진(네이버/구글) 선택", time: "10초", href: "/seeds" },
  { icon: "⚡", title: "지금 확장하기", desc: "검색결과 분석 → 연관 키워드 → 롱테일 키워드", time: "30초~1분", href: "/seeds" },
  { icon: "📝", title: "작업 지시 활용", desc: "블로그 작업 지시문·키워드를 복사해 바로 글쓰기", time: "바로", href: "/runs" },
];

const SCREENS = [
  { icon: "🏠", name: "대시보드", desc: "지표 4종, 키 연결 상태, 최근 결과 5개를 한눈에" },
  { icon: "🔍", name: "1. 롱테일 키워드 확장", desc: "씨드 키워드 등록·검색·표/카드 보기·지금 확장하기" },
  { icon: "📊", name: "2. 롱테일 키워드 분석", desc: "모든 실행 결과를 검색하고 표/카드로 비교" },
  { icon: "🔑", name: "API키등록·플랫폼연동", desc: "본인 키 저장·수정, 텔레그램 알림(선택)" },
];

const FAQ = [
  {
    q: "키 없이도 써 볼 수 있나요?",
    a: "아니요. 이 프로그램은 운영자 공용 키 없이 회원님 본인 키로만 동작합니다. SerpApi는 무료 플랜(월 250회)으로 시작할 수 있어요.",
  },
  {
    q: "한 번 확장하면 비용이 얼마나 드나요?",
    a: "확장 1회에 SerpApi 검색 1회 + OpenAI 호출 3회가 본인 키로 사용됩니다. OpenAI 비용은 사용하는 모델 요금에 따라 달라집니다.",
  },
  {
    q: "같은 키워드를 다시 확장하면 결과가 덮어써지나요?",
    a: "아니요. 연관·롱테일 키워드는 같은 씨드 키워드에 계속 쌓이고 중복은 자동으로 정리됩니다. 작업 지시문은 실행할 때마다 따로 남아요.",
  },
  {
    q: "텔레그램 알림은 꼭 연결해야 하나요?",
    a: "선택입니다. 연결하면 확장이 끝날 때 결과 요약을 본인 봇으로 받아볼 수 있어요.",
  },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero
        badge="📖 연동 & 사용 매뉴얼"
        title="3분 만에 익히는 롱테일 키워드분석"
        description="키 등록부터 작업 지시문 활용까지, 아래 4단계만 따라오시면 됩니다."
      />

      {/* 안내 캐릭터 */}
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mx-primary text-2xl">🤖</div>
        <div className="mx-card relative rounded-tl-none p-4">
          <p className="text-sm leading-relaxed text-mx-text">
            안녕하세요, 키워드 비서예요! 키워드 <b>하나</b>만 알려 주시면 사람들이 실제로 검색하는 <b>연관 키워드</b>와 더
            구체적인 <b>롱테일 키워드</b>를 찾아 드리고, 이번 주에 어떤 글을 쓰면 좋을지 <b>작업 지시문</b>까지 정리해 드려요.
          </p>
        </div>
      </div>

      {/* 4단계 파이프라인 */}
      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🧭 사용 순서</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {PIPELINE.map((step, idx) => (
            <li key={step.title} className="relative">
              <Link
                href={step.href}
                className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-4 transition-colors hover:border-mx-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mx-primary text-xs font-bold text-white">
                    {idx + 1}
                  </span>
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

      {/* 키워드 확장 원리 다이어그램 */}
      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🌳 키워드가 넓어지는 방식</h2>
        <div className="flex flex-col items-center gap-2 md:flex-row md:justify-center">
          <span className="mx-chip-amber px-4 py-2 text-sm">🌱 씨드: 다이어트 도시락</span>
          <span className="text-mx-muted">→</span>
          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="mx-chip-green">🔗 다이어트 도시락 배달</span>
            <span className="mx-chip-green">🔗 저칼로리 도시락</span>
          </div>
          <span className="text-mx-muted">→</span>
          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="mx-chip-blue">🎯 다이어트 도시락 정기배송 후기</span>
            <span className="mx-chip-blue">🎯 직장인 저칼로리 도시락 추천</span>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-mx-muted">
          검색결과(관련 검색어·함께 찾는 질문 등)에서 연관 키워드를 찾고, 각 연관 키워드를 더 구체적인 롱테일 키워드로 넓힙니다. (예시 화면)
        </p>
      </section>

      {/* 화면 배치도 */}
      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🗺️ 메뉴별 역할</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {SCREENS.map((s) => (
            <div key={s.name} className="flex items-start gap-3 rounded-xl bg-mx-raised p-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-sm font-bold text-mx-text">{s.name}</p>
                <p className="text-xs text-mx-muted">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 팁·주의 */}
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#065f46] bg-[#064e3b]/40 p-4">
          <p className="text-sm font-bold text-[#a7f3d0]">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#d1fae5]">
            <li>결과 화면의 「지시문 복사」「롱테일 전체 복사」로 글쓰기 도구에 바로 붙여 넣으세요.</li>
            <li>네이버 블로그용이면 검색엔진을 「네이버」로, 구글 SEO용이면 「구글」로 등록하세요.</li>
            <li>표 보기에서 검색창으로 원하는 키워드만 빠르게 찾을 수 있어요.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[#92400e] bg-[#78350f]/40 p-4">
          <p className="text-sm font-bold text-[#fde68a]">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#fef3c7]">
            <li>모든 검색·AI 호출은 회원님 <b>본인 키</b>로만 처리됩니다(운영자 키 대신 사용 없음).</li>
            <li>SerpApi 무료 플랜은 월 250회까지입니다. 다 쓰면 SerpApi 유료 플랜이 필요합니다.</li>
            <li>키워드 결과는 검색 시점의 데이터라, 검색량·순위를 보장하지 않습니다.</li>
          </ul>
        </div>
      </div>

      {/* 키 발급 매뉴얼 */}
      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🔑 키 발급 3단계</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {[
            { n: 1, t: "사이트 접속", d: "serpapi.com · platform.openai.com 가입/로그인" },
            { n: 2, t: "키 복사", d: "API Key 화면에서 키를 만들고 복사" },
            { n: 3, t: "등록 완료", d: "「API키등록·플랫폼연동」에 붙여 넣고 저장" },
          ].map((s) => (
            <li key={s.n} className="rounded-xl bg-mx-raised p-3">
              <span className="mx-chip-blue">STEP {s.n}</span>
              <p className="mt-2 text-sm font-bold text-mx-text">{s.t}</p>
              <p className="text-xs text-mx-muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noreferrer" className="mx-btn-ghost min-h-[40px] text-xs">
            🔎 SerpApi 키 발급
          </a>
          <GuideLinkButton guideId="1c5c24e2-15d4-49b8-b907-0ac6843dee3a" label="OpenAI API 키 발급받기" />
          <GuideLinkButton guideId="f43e8ebe-a930-4933-b965-7068b38d79aa" label="텔레그램 봇 만들기" />
          <Link href="/settings" className="mx-btn-primary min-h-[40px] text-xs">
            🔑 지금 키 등록하기
          </Link>
        </div>
      </section>

      {/* FAQ */}
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
