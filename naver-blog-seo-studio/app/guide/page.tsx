import { requireProgramAccess } from "@/lib/access";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼 (2026-10-17 디자인 리뉴얼 신설) — 화면 문구는 설정·확장 카드의 실제 문구와 맞춘다.
const STEPS = [
  { icon: "🔑", title: "API 키 등록", desc: "OpenAI·Claude·Gemini 중 쓸 AI의 본인 키를 등록합니다. 이미지는 Gemini 키가 필요해요.", href: "/settings#api-key", time: "3분" },
  { icon: "🧩", title: "확장 설치·토큰", desc: "SEO Studio 확장 ZIP을 받아 압축 해제 → chrome://extensions 개발자 모드 → 압축해제된 확장 프로그램을 로드 → 토큰 붙여넣기", href: "/settings#platform", time: "5분" },
  { icon: "🔎", title: "제목 추천", desc: "주제와 핵심 키워드를 넣으면 검색 의도에 맞는 제목 후보를 만들어 줘요. 마음에 드는 제목을 고릅니다.", href: "/dashboard#title", time: "1분" },
  { icon: "📝", title: "새 글 만들기", desc: "작성 전략·말투·AI 모델을 고르고 블로그(원문)와 대표·본문 이미지를 만듭니다. 블록 단위로 고칠 수 있어요.", href: "/dashboard#new-draft", time: "2~3분" },
  { icon: "🚀", title: "네이버에 입력", desc: "네이버 글쓰기 화면을 연 뒤 확장에서 실행하면 제목·본문·이미지·카테고리·태그가 입력돼요. 발행은 직접 누릅니다.", href: "/dashboard#history", time: "1분" },
];

const FAQ = [
  {
    q: "네이버에 자동으로 발행되나요?",
    a: "아니요. 확장은 글쓰기 화면에 제목·본문·이미지와 발행 설정(카테고리·태그)까지만 입력합니다. 최종 「발행」 버튼은 내용을 확인한 뒤 직접 눌러 주세요.",
  },
  {
    q: "확장을 설치했는데 동작하지 않아요.",
    a: "설정 화면에서 새 토큰을 발급해 확장에 붙여넣었는지 확인하세요. 토큰은 발급할 때 한 번만 보여요. 새 버전 안내가 뜨면 ZIP을 다시 받아 기존 폴더에 덮어쓰고 chrome://extensions에서 새로고침합니다.",
  },
  {
    q: "비용은 얼마나 드나요?",
    a: "글과 이미지는 회원님 본인 AI 키로 만들어 해당 AI 회사에 요금이 청구됩니다. 화면에서 고른 모델에 따라 요금이 달라요.",
  },
  {
    q: "만든 글은 얼마나 보관되나요?",
    a: "생성 기록은 생성일 기준 30일 동안 보관된 뒤 자동으로 삭제됩니다. 오래 둘 글은 네이버에 입력하거나 따로 저장해 두세요.",
  },
];

const KEY_GUIDES = [
  { id: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키" },
  { id: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키" },
  { id: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키" },
];

export default async function GuidePage() {
  const user = await requireProgramAccess();

  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="guide" />
      <main className="main guide-page">
        <div className="topline">
          <div>
            <div className="eyebrow">Guide</div>
            <h1>5단계로 끝내는<br />네이버 블로그 SEO 글쓰기</h1>
            <p className="lede">키 등록과 확장 설치는 처음 한 번만 하면 됩니다.</p>
          </div>
          <a className="guide-cta" href="/settings#api-key">🔑 연결 시작하기</a>
        </div>

        <div className="guide-bubble">
          <span className="guide-avatar" aria-hidden="true">🤖</span>
          <p>
            안녕하세요, 블로그 비서예요! 주제만 알려 주시면 <b>검색 의도에 맞는 제목</b>을 고르고, <b>SEO에 맞춘 글과 이미지</b>를 만들어
            드려요. 크롬 확장이 <b>네이버 글쓰기 화면에 그대로 입력</b>해 드리니, 확인하고 발행만 눌러 주세요.
          </p>
        </div>

        <section className="card">
          <h2 className="card-title">🧭 사용 순서</h2>
          <ol className="guide-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <a href={step.href}>
                  <span className="guide-step-head">
                    <span className="nav-number">{index + 1}</span>
                    <span className="guide-time">⏱ {step.time}</span>
                  </span>
                  <span className="guide-step-icon">{step.icon}</span>
                  <strong>{step.title}</strong>
                  <small>{step.desc}</small>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <div className="guide-two">
          <section className="guide-tip">
            <h3>💡 TIP</h3>
            <ul>
              <li>「제목 추천」에서 고른 제목은 「새 글 만들기」로 그대로 이어져요.</li>
              <li>예전에 쓴 글은 「기존 글 최적화」에서 붙여넣거나 주소로 불러와 다시 다듬을 수 있어요.</li>
              <li>생성 기록에서 글을 분류(카테고리)별로 모아 보고, 다시 불러와 고칠 수 있어요.</li>
            </ul>
          </section>
          <section className="guide-warn">
            <h3>⚠️ 꼭 알아 두세요</h3>
            <ul>
              <li>AI 키는 회원님 <b>본인 것</b>만 사용해요(운영자 키 대신 사용 없음).</li>
              <li>가격·날짜·정책·의학·법률 같은 사실은 발행 전에 직접 확인해 주세요.</li>
              <li>대량 댓글·공감·이웃추가 같은 자동 활동은 지원하지 않아요(계정 보호).</li>
            </ul>
          </section>
        </div>

        <section className="card">
          <h2 className="card-title">🔑 키 발급 매뉴얼</h2>
          <div className="guide-links">
            {KEY_GUIDES.map((guide) => (
              <a key={guide.id} href={`https://www.buylife.xyz/guides/${guide.id}`} target="_blank" rel="noreferrer">
                {guide.label}
              </a>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">❓ 자주 묻는 질문</h2>
          <div className="guide-faq">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
