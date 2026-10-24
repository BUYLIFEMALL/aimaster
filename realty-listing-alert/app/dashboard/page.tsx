import { requireProgramAccess } from "@/lib/access";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import ExtensionDownloadCard from "@/app/settings/ExtensionDownloadCard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 대시보드(인수인계 §3-5): 디자인 원칙 0 — 원클릭 다운로드 센터·내 PC 연결 상태·3단계 설치 안내를 맨 위에 둔다.
const INSTALL = [
  { icon: "⬇", title: "확장 받기", desc: "아래 버튼으로 ZIP을 받아 압축을 풉니다." },
  { icon: "🧩", title: "크롬에 설치", desc: "chrome://extensions → 개발자 모드 → 압축해제된 확장 프로그램을 로드" },
  { icon: "🔗", title: "바로 연결", desc: "「API키등록·플랫폼연동」에서 「바로 연결」을 누릅니다." },
];

const CARDS = [
  { icon: "🎯", title: "감시 대상", value: "0 / 10", href: "/targets", note: "단지를 추가하세요" },
  { icon: "⏰", title: "예약", value: "꺼짐", href: "/schedule", note: "간격·시간대를 정하세요" },
  { icon: "📨", title: "받는 방법", value: "미연결", href: "/delivery", note: "텔레그램을 연결하세요" },
];

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="dashboard" />
      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Dashboard</div>
            <h1>관심 단지 새 매물,<br />텔레그램으로 받아 보세요</h1>
            <p className="lede">수집은 회원님 PC의 크롬이 회원님 계정으로 합니다. 매물 정보는 이 사이트로 오지 않습니다.</p>
          </div>
        </div>

        <section className="card" aria-labelledby="install-title">
          <h2 className="card-title" id="install-title">🖥 원클릭 다운로드 센터</h2>
          <ol className="guide-steps">
            {INSTALL.map((step, index) => (
              <li key={step.title}>
                <span className="guide-step-head"><span className="nav-number">{index + 1}</span></span>
                <span className="guide-step-icon">{step.icon}</span>
                <strong>{step.title}</strong>
                <small>{step.desc}</small>
              </li>
            ))}
          </ol>
          <ExtensionDownloadCard />
        </section>

        <section className="card">
          <h2 className="card-title">📋 내 설정</h2>
          <ol className="guide-steps">
            {CARDS.map((card) => (
              <li key={card.title}>
                <a href={card.href}>
                  <span className="guide-step-icon">{card.icon}</span>
                  <strong>{card.title} · {card.value}</strong>
                  <small>{card.note}</small>
                </a>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
