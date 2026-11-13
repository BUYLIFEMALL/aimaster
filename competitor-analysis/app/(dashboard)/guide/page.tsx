import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/layout/PageHero";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PIPELINE = [
  { icon: "🔑", title: "본인 키 등록", desc: "SerpApi·Perplexity·OpenAI 필수, Anthropic은 선택 · 제휴 타깃 찾기는 네이버 검색 키", time: "약 5분", href: "/settings" },
  { icon: "🌱", title: "키워드 확장", desc: "씨드 키워드 → 연관·롱테일 키워드 + 블로그 작업 지시문", time: "30초~1분", href: "/expand" },
  { icon: "⚡", title: "경쟁사 분석", desc: "키워드 등록 → 상위 도메인 수집 → 회사 리서치 → AI 리포트", time: "1~2분", href: "/keywords" },
  { icon: "🏢", title: "결과 활용", desc: "경쟁사 표시, 리포트 복사·HTML 리포트 만들기", time: "바로", href: "/analyses" },
];

const SCREENS = [
  { icon: "🏠", name: "대시보드", desc: "지표 4종, 키 연결 상태, 최근 분석 5건" },
  { icon: "🌱", name: "1. 키워드 확장", desc: "씨드 키워드 등록·지금 확장하기·관련도 점수·작업 지시문 복사·CSV" },
  { icon: "🔍", name: "2. 경쟁사 분석", desc: "키워드 등록·검색·표/카드 보기·지금 분석하기" },
  { icon: "📋", name: "3. 분석 결과 목록", desc: "모든 분석을 검색하고 표/카드로 비교" },
  { icon: "🏢", name: "내 경쟁사", desc: "표시한 도메인과 등장 키워드·노출 횟수" },
  { icon: "🤝", name: "제휴 타깃 찾기", desc: "키워드로 그 주제 블로그·업체·카페·쇼핑몰 찾기, 확장으로 공개 연락처 스캔, 엑셀 내려받기" },
  { icon: "🔑", name: "API키등록·플랫폼연동", desc: "SerpApi·AI 키, 네이버 검색·검색광고 키, 텔레그램 알림 봇 연결" },
];

// 제휴 타깃 찾기(v1.10~v1.12) 사용 순서 — 2026-11-13 추가, 실제 화면 기준
const PARTNER_STEPS = [
  { n: 1, title: "네이버 검색 키 등록", desc: "설정 「🤝 제휴 타깃 찾기 (네이버 검색 API)」에 본인 Client ID·Secret을 넣습니다(무료, 하루 호출 한도 있음). 월간 검색량 순 추천까지 쓰려면 「네이버 검색광고」 키 3개도 넣습니다(선택)." },
  { n: 2, title: "이용 안내 동의 (처음 한 번)", desc: "「🤝 제휴 타깃 찾기」에 들어가 「⚠️ 처음 한 번 — 이용 안내와 책임」을 읽고 동의합니다. 공개된 비즈니스 연락처만 다루고, 이용 책임은 회원님 본인에게 있습니다." },
  { n: 3, title: "키워드로 채널 찾기", desc: "추천 주제를 누르거나 키워드를 넣고, 매칭 기준(엄격 60점↑·보통 40점↑·넓게 20점↑)을 골라 찾습니다. 주제에 맞는 채널만 담기고, 기준에 조금 못 미친 곳은 「후보」로 담깁니다. 「🔮 키워드 추천 받기」로 연관·검색량·카테고리 추천도 볼 수 있습니다." },
  { n: 4, title: "확장 설치 → 스캔 시작", desc: "같은 화면의 「⬇️ 확장 내려받기」로 받은 파일의 압축을 풀고, 크롬 주소창 chrome://extensions에서 「개발자 모드」를 켠 뒤 「압축해제된 확장 프로그램을 로드합니다」로 폴더를 고릅니다. 확장 팝업의 「스캔 시작」을 누르면 회원님 PC에서 채널을 하나씩(30~45초 간격, 오전 9시~밤 10시, 하루 300곳까지) 열어 공개 연락처를 읽고 최종 판정(매칭·주제 약함)을 매깁니다." },
  { n: 5, title: "결과 확인 → 엑셀 내려받기", desc: "목록은 매칭 → 후보 → 주제 약함 순으로 보입니다. 네이버 밖 주소(업체 홈페이지·오픈채팅 등)는 자동으로 읽지 않으니 링크를 열어 직접 확인해 적어 주세요. 「⬇️ 엑셀 내려받기」로 저장합니다." },
];

const RESULT_TYPES = [
  { chip: "🔵 자연 검색결과", desc: "광고가 아닌 일반 검색 순위 — 실제 경쟁 상대" },
  { chip: "🟡 광고", desc: "이 키워드에 돈을 쓰는 회사 — 시장성이 있다는 신호" },
  { chip: "❓ 함께 묻는 질문", desc: "사람들이 궁금해하는 것 — 콘텐츠 주제 후보(구글)" },
  { chip: "📍 지역 결과", desc: "지도·지역 업체 — 오프라인 경쟁 상대(구글)" },
];

const FAQ = [
  {
    q: "어떤 기능에 어떤 키가 필요한가요?",
    a: "키워드 확장: SerpApi + OpenAI. 경쟁사 분석: SerpApi + Perplexity + OpenAI(HTML 리포트는 Anthropic 추가). 제휴 타깃 찾기: 네이버 검색 API 키(검색량 순 추천은 네이버 검색광고 키 추가). 모두 「API키등록·플랫폼연동」에 회원님 본인 키로 등록하며, 키가 없으면 등록 안내가 뜨고 실행되지 않습니다.",
  },
  {
    q: "만든 자료는 언제까지 보관되나요?",
    a: "키워드 확장 결과, 경쟁사 분석 결과(검색결과·리포트·회사 조사), 제휴 타깃 목록은 만든 날부터 30일 뒤 자동으로 지워집니다. 등록해 둔 씨드 키워드·분석 키워드·API 키·텔레그램 연결은 지워지지 않습니다. 필요한 결과는 CSV·엑셀·「리포트 복사」·「📨 업무 워크스페이스로 보내기」로 미리 옮겨 두세요.",
  },
  {
    q: "확장 결과를 경쟁사 분석으로 바로 넘길 수 있나요?",
    a: "네. 키워드 확장 결과 화면의 「🔍 경쟁사 분석에 등록」에서 키워드를 눌러 고른 뒤(한 번에 10개까지) 등록하면 「경쟁사 분석」 목록에 추가됩니다. 등록만으로는 비용이 들지 않고, 분석은 그 화면에서 「지금 분석하기」를 눌러야 실행됩니다.",
  },
  {
    q: "「📨 업무 워크스페이스로 보내기」는 무엇인가요?",
    a: "경쟁사 분석 결과와 키워드 확장 결과 화면에 있는 버튼입니다. 누르면 그 결과의 요약과 링크가 AI 업무 워크스페이스의 받은 편지함으로 들어가, 거기서 페이지로 만들어 보관할 수 있습니다. AI 호출은 없습니다.",
  },
  {
    q: "확장 프로그램을 새 버전으로 바꾸려면요?",
    a: "「제휴 타깃 찾기」 화면에서 확장을 다시 내려받아 기존 폴더에 덮어쓴 뒤, chrome://extensions에서 새로고침(↻)을 누르면 됩니다. 확장은 제휴 타깃 찾기의 연락처 스캔에만 쓰이고, 키워드 확장·경쟁사 분석은 확장 없이 동작합니다.",
  },
  {
    q: "PC와 휴대폰에서 같이 로그인해도 되나요?",
    a: "같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓸 수 있습니다. 같은 종류의 기기에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다.",
  },
  {
    q: "키워드 확장은 무엇을 해 주나요?",
    a: "씨드 키워드 하나를 네이버(또는 구글) 검색결과로 분석해 연관 키워드와 관련도 점수를 매기고, 그 아래로 더 구체적인 롱테일 키워드를 넓힌 뒤 블로그 담당자에게 줄 작업 지시문을 만들어 드립니다. 1회에 SerpApi 1회 + OpenAI 3회가 회원님 본인 키로 사용됩니다. 텔레그램을 연결하면 결과 요약도 받아볼 수 있습니다.",
  },
  {
    q: "롱테일 키워드분석 자동화에서 쓰던 자료는요?",
    a: "2026-10-23부터 롱테일 키워드분석은 이 프로그램의 「🌱 키워드 확장」으로 합쳐졌습니다. 같은 계정으로 들어오시면 등록한 씨드 키워드와 최근 30일 안의 확장 결과, 연결한 텔레그램 봇을 그대로 보실 수 있습니다.",
  },
  {
    q: "분석 한 번에 비용이 얼마나 드나요?",
    a: "SerpApi 검색 1회 + 처음 보는 도메인 수만큼 Perplexity·OpenAI 호출이 회원님 본인 키로 사용됩니다. 회원님 본인이 최근 30일 안에 조사한 회사 정보만 재사용합니다. 다른 회원의 자료는 사용하지 않습니다.",
  },
  {
    q: "네이버로 분석하면 무엇이 다른가요?",
    a: "네이버는 자연 검색결과와 광고만 가져옵니다. '함께 묻는 질문'과 '지역 결과'는 구글에서만 나옵니다.",
  },
  {
    q: "Anthropic 키는 꼭 필요한가요?",
    a: "아니요. 분석 리포트는 OpenAI로 만들어지고, Anthropic은 그 리포트를 보기 좋은 HTML로 바꿀 때만 씁니다.",
  },
  {
    q: "경쟁사로 표시하면 어떻게 되나요?",
    a: "「내 경쟁사」 메뉴에 모여, 그 도메인이 어떤 키워드에 몇 번 등장했는지 한눈에 볼 수 있습니다.",
  },
];

const GUIDE_LINKS = [
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "8f201233-b2f6-4da0-851c-f045bdb5f9c7", label: "네이버 검색 API 키 발급받기" },
  { guideId: "8be38787-dacf-4921-9800-83159c9001be", label: "네이버 검색광고 API 키 발급받기" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero
        badge="📖 연동 & 사용 매뉴얼"
        title="3분 만에 익히는 키워드·경쟁사 분석"
        description="키 등록부터 경쟁사 리포트 활용까지, 아래 4단계만 따라오시면 됩니다."
      >
        <Link href="/keywords" className="mx-btn-primary">
          🔍 바로 분석하러 가기
        </Link>
      </PageHero>

      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mx-primary text-2xl">🕵️</div>
        <div className="mx-card rounded-tl-none p-4">
          <p className="text-sm leading-relaxed text-mx-text">
            안녕하세요, 경쟁사 탐정이에요! 키워드 <b>하나</b>만 알려 주시면 그 키워드로 <b>검색 상위에 누가 나오는지</b> 찾고, 그 회사가
            어떤 곳인지 조사한 다음, <b>어떻게 차별화하고 어떤 글을 쓰면 좋을지</b> 리포트로 정리해 드려요.
          </p>
        </div>
      </div>

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

      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🗂️ 결과 화면 읽는 법</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {RESULT_TYPES.map((r) => (
            <div key={r.chip} className="rounded-xl bg-mx-raised p-3">
              <span className="mx-chip-blue">{r.chip}</span>
              <p className="mt-2 text-xs text-mx-muted">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-mx-muted">
          표의 오른쪽 「+ 경쟁사로 표시」를 누르면 「내 경쟁사」에 모입니다. AI 리포트는 「리포트 복사」로 바로 가져갈 수 있어요.
        </p>
      </section>

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

      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🤝 제휴 타깃 찾기 — 사용 순서</h2>
        <p className="mb-3 text-xs leading-relaxed text-mx-muted">
          키워드(예: 공동구매)로 그 주제의 블로그·업체·카페·쇼핑몰을 찾고, 그 채널이 홍보·연락 목적으로 공개해 둔 비즈니스 연락처를 회원님 PC의 확장이 읽어 옵니다. AI 호출은 없고, 네이버 검색은 회원님 본인 키의 무료 한도를 씁니다.
        </p>
        <ol className="space-y-2">
          {PARTNER_STEPS.map((s) => (
            <li key={s.n} className="flex items-start gap-3 rounded-xl bg-mx-raised p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mx-primary text-xs font-bold text-white">{s.n}</span>
              <div>
                <p className="text-sm font-bold text-mx-text">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-mx-muted">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/partners" className="mx-btn-ghost mt-3 inline-block min-h-[40px] text-xs">
          🤝 제휴 타깃 찾기 열기
        </Link>
      </section>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#065f46] bg-[#064e3b]/40 p-4">
          <p className="text-sm font-bold text-[#a7f3d0]">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#d1fae5]">
            <li>광고가 많이 붙은 키워드는 돈이 되는 시장이라는 신호예요. 자연 검색결과의 경쟁사와 함께 보세요.</li>
            <li>여러 키워드에 반복 등장하는 도메인을 「내 경쟁사」로 표시해 두면 핵심 경쟁사가 보입니다.</li>
            <li>같은 키워드를 시간을 두고 다시 분석하면 순위 변화를 비교할 수 있어요.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[#92400e] bg-[#78350f]/40 p-4">
          <p className="text-sm font-bold text-[#fde68a]">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#fef3c7]">
            <li>모든 검색·AI 호출은 회원님 <b>본인 키</b>로만 처리됩니다(운영자 키 대신 사용 없음).</li>
            <li>회사 정보는 공개 자료를 AI가 요약한 것이라 틀릴 수 있어요. 중요한 판단 전에는 직접 확인하세요.</li>
            <li>검색 순위는 조회 시점·지역에 따라 달라지며 상위 노출을 보장하지 않습니다.</li>
          </ul>
        </div>
      </div>

      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🔑 키 발급 매뉴얼</h2>
        <div className="flex flex-wrap gap-2">
          <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noreferrer" className="mx-btn-ghost min-h-[40px] text-xs">
            🔎 SerpApi 키 발급
          </a>
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
