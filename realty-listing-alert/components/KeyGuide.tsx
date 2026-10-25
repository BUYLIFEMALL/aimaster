// 🔑 어떤 값을 어디서 가져오나요?(2026-10-25 주인님 「플랫폼 연동 부분도 정확하게 어느 위치에 있는 어떤 값이라고 명시해서 사용자들이 헷갈리지 않도록」)
// 키마다 ① 사이트 ② 메뉴 위치 ③ 값 모양 ④ 헷갈리기 쉬운 「아닌 값」을 한 표로. 실제 화면(2026-10)으로 확인한 위치만 적는다.

// 2026-10-25 주인님 「한 줄에 하나씩만 표현」 — 메뉴 위치는 단계마다 한 줄, 모양·아닌 값도 줄마다 하나
type Row = { id: string; icon: string; name: string; use: string; site: { label: string; href: string }; where: string[]; note?: string; looks: string[]; not: string[] };

const ROWS: Row[] = [
  {
    id: "telegram", icon: "📨", name: "텔레그램 봇 토큰", use: "요약 + 엑셀 받기",
    site: { label: "@BotFather", href: "https://t.me/BotFather" },
    where: ["텔레그램 앱에서 @BotFather 열기", "새 봇: /newbot · 있던 봇: /mybots → 내 봇", "「API Token」 복사"],
    looks: ["숫자:영문", "예) 123456789:AAF…", "40자 안팎"],
    not: ["봇 이름(@…_bot)", "내 텔레그램 아이디"],
  },
  {
    id: "kakaoRest", icon: "💬", name: "카카오 REST API 키", use: "카톡 받기",
    site: { label: "카카오 개발자", href: "https://developers.kakao.com/console/app" },
    where: ["내 앱 선택", "왼쪽 「앱」 → 「플랫폼 키」", "맨 왼쪽 「REST API 키」 칸", "Default Rest API Key 옆 복사(□)"],
    looks: ["영문 소문자·숫자", "32자"],
    not: ["JavaScript 키", "네이티브 앱 키", "어드민 키"],
  },
  {
    id: "kakaoSecret", icon: "🔒", name: "카카오 클라이언트 시크릿", use: "카톡 받기",
    site: { label: "카카오 개발자", href: "https://developers.kakao.com/console/app" },
    where: ["왼쪽 「앱」 → 「플랫폼 키」", "Default Rest API Key 카드 클릭", "아래 「클라이언트 시크릿」 표", "「카카오 로그인」 줄 「코드」 복사"],
    looks: ["영문 대소문자·숫자", "30자 안팎"],
    not: ["「비즈니스 인증」 줄 코드"],
  },
  {
    id: "resend", icon: "✉️", name: "Resend API 키", use: "이메일 받기",
    site: { label: "resend.com", href: "https://resend.com/api-keys" },
    where: ["로그인 → 「API Keys」", "「Create API Key」(권한 Sending access)", "만들 때 보이는 값 복사"],
    note: "값은 만들 때 한 번만 보여요",
    looks: ["re_로 시작", "긴 영문·숫자"],
    not: ["Resend 비밀번호", "도메인 이름"],
  },
  {
    id: "publicData", icon: "🏛", name: "공공데이터 일반 인증키(선택)", use: "실거래가 비교",
    site: { label: "공공데이터포털", href: "https://www.data.go.kr" },
    where: ["로그인 → 「마이페이지」", "「데이터 활용」 → 「Open API」", "「인증키 발급현황」", "「일반 인증키(Decoding)」 복사"],
    note: "「국토교통부 아파트매매 실거래자료」 신청이 「승인」이어야 해요",
    looks: ["영문 소문자·숫자", "64자", "계정에 하나(다른 신청에도 같은 키)"],
    not: ["서울 열린데이터광장 키(서울만)", "브이월드 키(하이픈 섞임)"],
  },
];

/** 📖 플랫폼별 「가져오는 법」 — 각 연동 칸 바로 밑에(2026-10-25 주인님 「각각의 플랫폼 밑에 표시」「텔레그램 연동 파트 밑에 텔레그램 연동 방법을」). 단계는 한 줄에 하나씩. */
export function KeyHowTo({ ids, title }: { ids: string[]; title: string }) {
  const rows = ROWS.filter((r) => ids.includes(r.id));
  return (
    <div className="ra-howto">
      <strong className="ra-howto-title">📖 {title}</strong>
      {rows.map((r) => (
        <div key={r.id} className="ra-howto-item">
          <div className="ra-howto-head">
            <b>{r.icon} {r.name}</b>
            <a className="secondary ra-link-btn" href={r.site.href} target="_blank" rel="noopener noreferrer">{r.site.label} 열기 ↗</a>
          </div>
          <ol className="ra-kg-steps">{r.where.map((w) => <li key={w}>{w}</li>)}</ol>
          {r.note && <small className="ra-kg-note">💡 {r.note}</small>}
          <div className="ra-howto-meta">
            <span>✅ 모양: {r.looks.join(" · ")}</span>
            <span className="ra-kg-not">✕ 이건 아니에요: {r.not.join(" · ")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
