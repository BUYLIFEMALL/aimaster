import AutoPublishGuide from "@/components/AutoPublishGuide";
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
  { icon: "🚀", title: "네이버에 입력", desc: "확장에서 원고·실제 블로그 ID·공개 범위를 확인하고 자동 포스팅을 실행하면 실제 발행과 결과 기록까지 이어집니다. 입력만 하는 조작도 유지됩니다.", href: "/dashboard#history", time: "1분" },
];

const FAQ = [
  {
    q: "네이버에 자동으로 발행되나요?",
    a: "네. 확장의 「선택한 원고 자동 포스팅 시작」은 새 전용 탭에서 입력·설정·최종 발행·게시 URL 기록까지 진행합니다. 공개 범위를 먼저 확인하세요. 「선택한 원고 예약 포스팅 시작」은 날짜·시각(10분 단위, 지금부터 20분 이후)을 넣어 네이버 예약까지 하고 예약 목록에서 결과를 확인합니다. 기존 「네이버 편집기로 입력」은 입력 전용이며 마지막 발행은 직접 합니다.",
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
    q: "「발행 전 점검」 점수가 높으면 상위 노출되나요?",
    a: "아니요. 점검은 네이버 공식 점수가 아니라 제목 길이·키워드 반복·문단 길이 같은 기본 항목을 AI 없이 세어 보는 참고용입니다. 노출 순위는 보장되지 않으니 내용과 사실을 직접 확인해 주세요.",
  },
  {
    q: "만든 글은 얼마나 보관되나요?",
    a: "생성 기록은 생성일 기준 30일 동안 보관된 뒤 자동으로 삭제됩니다. 오래 둘 글은 네이버에 입력하거나 따로 저장해 두세요.",
  },
];

const KEY_PLATFORMS = [
  {
    name: "OpenAI (GPT-4o)",
    icon: "⚡",
    desc: "고품질 블로그 원고 작성 및 SEO 본문 생성에 사용됩니다.",
    createUrl: "https://platform.openai.com/api-keys",
    signupUrl: "https://platform.openai.com/signup",
    guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a",
  },
  {
    name: "Anthropic Claude",
    icon: "🧠",
    desc: "자연스러운 문체와 감성적 스토리텔링 원고 생성에 사용됩니다.",
    createUrl: "https://console.anthropic.com/settings/keys",
    signupUrl: "https://console.anthropic.com/",
    guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a",
  },
  {
    name: "Google Gemini",
    icon: "💎",
    desc: "블로그 대표/본문 이미지 생성 및 무료/초고속 원고 생성에 필수입니다.",
    createUrl: "https://aistudio.google.com/app/apikey",
    signupUrl: "https://aistudio.google.com/",
    guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4",
  },
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

        {/* 럭셔리 크롬 확장 프로그램 3D 엠보싱 퀵 다운로드 카드 */}
        <section className="card card-download-banner">
          <div className="download-banner-inner">
            <div className="download-banner-text">
              <span className="download-tag">🚀 Chrome Extension</span>
              <h2>네이버 블로그 자동 포스팅 크롬 확장 프로그램</h2>
              <p>
                웹에서 완성된 원고와 이미지를 네이버 스마트에디터에 <b>원클릭 자동 입력 및 실제 포스팅</b>해 드립니다.
                <br />
                입력만 하기 · 바로 발행 · 예약 포스팅 3가지 방식을 자유롭게 선택하세요!
              </p>
            </div>
            <div className="download-banner-action">
              <a
                className="guide-3d-download-btn"
                href="/downloads/naver-blog-seo-studio-extension-latest.zip"
                download
              >
                <span className="btn-icon">⬇</span>
                <span className="btn-text">
                  <strong>확장 프로그램 다운로드</strong>
                  <small>최신 버전 (ZIP 압축파일)</small>
                </span>
              </a>
              <a className="guide-settings-link" href="/settings#platform">
                설치 및 토큰 등록 방법 ↗
              </a>
            </div>
          </div>
        </section>

        <AutoPublishGuide />
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
              <li>「내 실제 경험」에 직접 겪은 일을 적으면 그 내용만 본문에 녹여요. 막막하면 「경험 떠올리기 질문 받기」를 눌러 보세요.</li>
              <li>글이 만들어지면 「발행 전 점검」에서 제목 길이·키워드·긴 문단·[확인 필요]·많이 쓴 단어와 📱 모바일 미리보기를 확인할 수 있어요.</li>
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
          <div className="card-head">
            <h2 className="card-title">🔑 AI 플랫폼 키 발급 & 계정 등록</h2>
            <a href="/settings#api-key">내 API 키 설정 열기 ↗</a>
          </div>
          <p className="card-desc" style={{ marginBottom: "16px", color: "var(--text-sub, #4b5563)", fontSize: "0.92rem" }}>
            본 프로그램은 사용자 본인의 API 키로 안전하게 구동됩니다. 키가 없으시다면 각 플랫폼 공식 콘솔에서 바로 발급받으실 수 있습니다.
          </p>
          <div className="guide-platforms-grid">
            {KEY_PLATFORMS.map((platform) => (
              <div key={platform.name} className="guide-platform-card">
                <div className="platform-card-header">
                  <span className="platform-icon">{platform.icon}</span>
                  <div>
                    <h3 className="platform-title">{platform.name}</h3>
                    <p className="platform-desc">{platform.desc}</p>
                  </div>
                </div>
                <div className="platform-quick-actions">
                  <a
                    href={platform.createUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-create-key"
                  >
                    🔗 API 키 발급/생성하기 ↗
                  </a>
                  <a
                    href={platform.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-platform-signup"
                  >
                    👤 회원가입 / 콘솔 ↗
                  </a>
                </div>
                <a
                  href={`https://www.buylife.xyz/guides/${platform.guideId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="platform-manual-link"
                >
                  📖 상세 발급 매뉴얼 보기 ↗
                </a>
              </div>
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
