import { requireProgramAccess } from "@/lib/access";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼(기준: naver-blog-seo-studio app/guide). 인수인계 §3-5: Step 1~4 + 팁·주의 + FAQ.
const STEPS = [
  { icon: "🧩", title: "확장 설치·연결", desc: "확장 ZIP을 받아 압축 해제 → chrome://extensions 개발자 모드 → 압축해제된 확장 프로그램을 로드 → 「API키등록·플랫폼연동」에서 「바로 연결」", href: "/settings", time: "5분" },
  { icon: "🤖", title: "텔레그램 봇 만들기", desc: "텔레그램 @BotFather에서 본인 봇을 만들고 토큰을 「받는 방법」에 넣은 뒤, 봇에게 아무 말이나 보내고 「연결 시험」을 누릅니다.", href: "/delivery", time: "3분" },
  { icon: "🎯", title: "감시 대상 추가", desc: "네이버 부동산에서 단지 화면 주소를 붙여 넣거나, 단지 화면에서 확장의 「이 단지 감시 추가」를 누릅니다(최대 10개).", href: "/targets", time: "1분" },
  { icon: "⏰", title: "예약 켜기", desc: "수집 간격(10분~24시간)과 동작 시간대를 고르고 예약을 켭니다. 크롬이 켜져 있는 동안 확장이 회원님 PC에서 수집합니다.", href: "/schedule", time: "1분" },
];

const FAQ = [
  { q: "제 PC가 꺼져 있어도 알림이 오나요?", a: "아니요. 수집은 회원님 PC의 크롬 확장이 회원님 계정으로 합니다. 크롬이 꺼져 있던 동안 밀린 회차는 다시 켜졌을 때 한 번만 수집합니다." },
  { q: "매물 정보가 서버에 저장되나요?", a: "아니요. 매물 정보는 회원님 PC 안에만 저장되고, 회원님 텔레그램으로 바로 보내집니다. 이 사이트에는 설정과 마지막 수집 시각·건수 같은 숫자만 남습니다." },
  { q: "네이버 확인 화면이 떴다고 알림이 왔어요.", a: "확장은 확인 화면·보안 문자가 나오면 그 자리에서 멈추고 그날 자동 수집을 쉽니다. 네이버 부동산을 직접 한 번 열어 확인한 뒤, 수집 간격을 길게 바꿔 주세요." },
  { q: "새 버전이 나왔다고 나와요.", a: "ZIP을 다시 받아 기존 폴더에 덮어쓰고 chrome://extensions에서 새로고침 버튼을 눌러 주세요. 설치된 확장은 자동으로 바뀌지 않습니다." },
];

export default async function GuidePage() {
  const user = await requireProgramAccess();

  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="guide" />
      <main className="main guide-page">
        <div className="topline">
          <div>
            <div className="eyebrow">Guide · {APP_VERSION}</div>
            <h1>4단계로 끝내는<br />네이버 부동산 새 매물 알림</h1>
            <p className="lede">확장 설치와 텔레그램 연결은 처음 한 번만 하면 됩니다.</p>
          </div>
          <a className="guide-cta" href="/downloads/realty-listing-alert-extension-latest.zip" download>⬇ 확장 프로그램 받기</a>
        </div>

        <div className="guide-bubble">
          <span className="guide-avatar" aria-hidden="true">🏠</span>
          <p>
            안녕하세요, 매물 알림 비서예요! 관심 단지를 정해 두시면 <b>회원님 PC의 크롬</b>이 정해진 시간마다 네이버 부동산을 대신 살펴보고,
            <b> 새 매물·가격 내림</b>을 정리해 <b>회원님 텔레그램</b>으로 보내 드려요.
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
              <li>수집 간격은 3시간 정도가 무난해요. 출퇴근 시간만 받고 싶으면 동작 시간대를 정해 두세요.</li>
              <li>거래 종류·가격·면적 조건을 걸어 두면 원하는 매물만 알림이 와요.</li>
              <li>같은 매물은 한 번만 알려 드리고, 가격이 바뀌면 이전 가격과 함께 다시 알려 드려요.</li>
            </ul>
          </section>
          <section className="guide-warn">
            <h3>⚠️ 꼭 알아 두세요</h3>
            <ul>
              <li>네이버 부동산 정보를 <b>회원님 PC에서 회원님 계정으로</b> 읽어 정리합니다. 개인 참고용으로만 쓰고 다시 배포하지 마세요.</li>
              <li><b>짧은 간격(10~50분)은 계정 제한 위험</b>이 있어요. 네이버 확인 화면이 뜨면 자동으로 멈춥니다.</li>
              <li>중개사 전화번호 같은 개인 정보는 모으지 않습니다.</li>
            </ul>
          </section>
        </div>

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
