// 🔑 어떤 값을 어디서 가져오나요?(2026-10-25 주인님 「플랫폼 연동 부분도 정확하게 어느 위치에 있는 어떤 값이라고 명시해서 사용자들이 헷갈리지 않도록」)
// 키마다 ① 사이트 ② 메뉴 위치 ③ 값 모양 ④ 헷갈리기 쉬운 「아닌 값」을 한 표로. 실제 화면(2026-10)으로 확인한 위치만 적는다.

type Row = { icon: string; name: string; use: string; site: { label: string; href: string }; where: string; looks: string; not: string };

const ROWS: Row[] = [
  {
    icon: "📨", name: "텔레그램 봇 토큰", use: "요약 + 엑셀 받기",
    site: { label: "@BotFather", href: "https://t.me/BotFather" },
    where: "텔레그램 앱 → @BotFather → /newbot(새로) 또는 /mybots → 내 봇 → 「API Token」",
    looks: "숫자:영문 — 예 123456789:AAF…(40자 안팎)",
    not: "봇 이름(@…_bot)이나 내 텔레그램 아이디가 아니에요",
  },
  {
    icon: "💬", name: "카카오 REST API 키", use: "카톡 받기",
    site: { label: "카카오 개발자", href: "https://developers.kakao.com/console/app" },
    where: "내 앱 → 왼쪽 「앱」 → 「플랫폼 키」 → 맨 왼쪽 「REST API 키」 칸의 Default Rest API Key",
    looks: "영문 소문자·숫자 32자",
    not: "JavaScript 키·네이티브 앱 키·어드민 키가 아니에요",
  },
  {
    icon: "🔒", name: "카카오 클라이언트 시크릿", use: "카톡 받기",
    site: { label: "카카오 개발자", href: "https://developers.kakao.com/console/app" },
    where: "「플랫폼 키」 → Default Rest API Key 카드 클릭 → 아래 「클라이언트 시크릿」 표의 「카카오 로그인」 줄 「코드」",
    looks: "영문 대소문자·숫자 30자 안팎",
    not: "「비즈니스 인증」 줄 코드가 아니에요",
  },
  {
    icon: "✉️", name: "Resend API 키", use: "이메일 받기",
    site: { label: "resend.com", href: "https://resend.com/api-keys" },
    where: "로그인 → 「API Keys」 → Create API Key(권한 Sending access) → 만들 때 보이는 값 복사",
    looks: "re_로 시작하는 긴 글자",
    not: "Resend 비밀번호·도메인 이름이 아니에요(값은 만들 때 한 번만 보여요)",
  },
  {
    icon: "🏛", name: "공공데이터 일반 인증키(선택)", use: "실거래가 비교",
    site: { label: "공공데이터포털", href: "https://www.data.go.kr" },
    where: "로그인 → 「마이페이지」 → 「데이터 활용」 → 「Open API」 → 「인증키 발급현황」 → 「일반 인증키(Decoding)」. 「국토교통부 아파트매매 실거래자료」 신청이 「승인」이어야 해요",
    looks: "영문 소문자·숫자 64자(계정에 하나 — 건축물대장 등 다른 신청에도 같은 키)",
    not: "서울 열린데이터광장 키(서울만)·브이월드 키(하이픈 섞임)가 아니에요",
  },
];

export default function KeyGuide({ compact = false }: { compact?: boolean }) {
  return (
    <details className="ra-keyguide" open={!compact}>
      <summary>🔑 어떤 값을 어디서 가져오나요? <small>(헷갈리기 쉬운 「아닌 값」까지 정리)</small></summary>
      <div className="ra-result-wrap">
        <table className="ra-result ra-keyguide-table">
          <thead><tr><th>넣을 값</th><th>어디서(메뉴 위치)</th><th>모양</th><th>⚠️ 이건 아니에요</th></tr></thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.name}>
                <td><b>{r.icon} {r.name}</b><br /><small>{r.use}</small></td>
                <td><a href={r.site.href} target="_blank" rel="noopener noreferrer">{r.site.label} ↗</a><br /><small>{r.where}</small></td>
                <td><small>{r.looks}</small></td>
                <td><small>{r.not}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="card-caption">🔐 키는 이 화면의 칸에만 넣어 주세요. 채팅·사진·메신저로 보내지 마세요. AI 키(OpenAI·Gemini)는 다른 AIMaster 프로그램과 함께 쓰는 공용 키라 한 번 등록하면 다시 넣지 않아도 돼요.</p>
    </details>
  );
}
