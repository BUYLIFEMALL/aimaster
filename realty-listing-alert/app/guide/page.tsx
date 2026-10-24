import { requireProgramAccess } from "@/lib/access";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { APP_VERSION } from "@/lib/version";
import LimitNotice from "@/components/LimitNotice";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼(기준: naver-blog-seo-studio app/guide). 인수인계 §3-5: Step 1~4 + 팁·주의 + FAQ.
const STEPS = [
  { icon: "🧩", title: "확장 설치", desc: "「⬇ 확장 받기」로 ZIP을 받아 압축을 풀고 → chrome://extensions → 개발자 모드 → 「압축해제된 확장 프로그램을 로드」로 그 폴더를 고릅니다.", href: "/dashboard", time: "3분" },
  { icon: "🔗", title: "웹과 연결", desc: "「API키등록·플랫폼연동」에서 「확장 프로그램 바로 연결」 버튼을 한 번 누릅니다.", href: "/settings", time: "10초" },
  { icon: "📨", title: "텔레그램 연결", desc: "텔레그램 @BotFather에서 내 봇을 만들어 토큰을 넣고 「연결 시험」. 부동산 실거래 프로그램에 봇이 있으면 「기존 부동산 봇 가져오기」 한 번이면 끝.", href: "/delivery", time: "3분" },
  { icon: "🏠", title: "단지 추가", desc: "네이버 부동산에서 단지를 눌러 열면 화면 오른쪽 아래에 초록 「➕ 매물 알림에 추가」 버튼이 떠요. 누르면 끝(최대 10곳).", href: "/targets", time: "1분" },
  { icon: "⏰", title: "예약 켜기", desc: "얼마나 자주(1~24시간)·몇 시부터 몇 시까지 살펴볼지 정하고 켭니다. 크롬이 켜져 있는 동안 내 PC가 수집해요.", href: "/schedule", time: "1분" },
];

const FAQ = [
  { q: "네이버 부동산에 초록 「➕ 매물 알림에 추가」 버튼이 안 보여요.", a: "지도나 검색 목록 상태에서는 버튼이 흐리게 「단지를 눌러 열면…」으로 보여요. 목록·지도에서 단지 이름이나 가격 상자를 눌러 매물 목록이 열리면 켜집니다. 아예 안 보이면 확장이 설치·새로고침됐는지(chrome://extensions) 확인해 주세요." },
  { q: "어디까지 했는지 모르겠어요.", a: "대시보드 맨 위 「🚀 시작하기」에 5단계가 표시되고, 다음에 할 일 버튼이 크게 나와요. 다 끝나면 「✅ 준비 완료」로 바뀝니다." },
  { q: "제 PC가 꺼져 있어도 알림이 오나요?", a: "아니요. 수집은 회원님 PC의 크롬 확장이 회원님 계정으로 합니다. 크롬이 꺼져 있던 동안 밀린 회차는 다시 켜졌을 때 한 번만 수집합니다." },
  { q: "매물 정보가 서버에 저장되나요?", a: "아니요. 매물 정보는 회원님 PC 안에만 저장되고, 회원님 텔레그램으로 바로 보내집니다. 이 사이트에는 설정과 마지막 수집 시각·건수 같은 숫자만 남습니다." },
  { q: "중개사 전화번호는 왜 없나요?", a: "개인 정보는 모으지 않아요. 알림·엑셀의 「네이버 매물 주소」 링크를 누르면 네이버에서 전화번호를 바로 볼 수 있어요." },
  { q: "네이버가 이용을 제한했다고(확인 화면) 알림이 왔어요.", a: "확장은 그 자리에서 멈추고 그날 자동 수집을 쉽니다(우회하지 않아요). 네이버 부동산을 직접 열어 보안 문자·본인 확인을 풀어 주세요. 제한은 보통 몇 시간~하루 지나면 풀리니 그 뒤에 다시 쓰시면 되고, 다음 날 예약 수집은 자동으로 다시 시작해요. 자주 걸리면 간격을 늘리고 감시 단지·지역 수를 줄여 주세요." },
  { q: "「오늘 수집 한도에 닿았다」는 알림은 뭔가요?", a: "네이버 이용 제한을 피하려고 하루에 읽는 목록 페이지를 300페이지까지로 정해 두었어요. 닿으면 그날은 더 읽지 않고 다음 날 다시 시작해요. 감시 대상이 많으면 한 회차에 20곳씩 차례로 돌아가며 읽어요." },
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
            <h1>5단계로 끝내는<br />네이버 부동산 새 매물 알림</h1>
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
              <li>간격은 <b>1시간부터</b> 고를 수 있어요. 감시 대상·지역을 많이 걸수록 한 번에 읽는 양이 늘어나니 2~3시간을 권해요. 네이버 확인 화면이 뜨면 자동으로 멈춥니다.</li>
              <li>중개사 전화번호 같은 개인 정보는 모으지 않습니다.</li>
            </ul>
          </section>
        </div>

        <LimitNotice />

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
