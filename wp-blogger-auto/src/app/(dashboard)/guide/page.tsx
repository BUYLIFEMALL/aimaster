import Link from "next/link";
import { CodeLine } from "@/components/ui/CopyButton";

// 연동 & 사용 매뉴얼 — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 8대 템플릿(메타 바·히어로·단계 카드·상세·팁·함정·콘솔 직링크·FAQ)
const REDIRECT = "https://wp-blogger-auto.buylife.xyz/api/oauth/google/callback";
const HTACCESS = 'SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1';

const STEPS = [
  { n: 1, icon: "🔑", title: "AI 키 등록", desc: "원고는 Claude, 이미지는 Gemini 키(본인 것)", time: "2분" },
  { n: 2, icon: "🅦", title: "워드프레스 연결", desc: "응용 비밀번호 한 번", time: "3분" },
  { n: 3, icon: "🅑", title: "구글 블로그 연결", desc: "구글 콘솔 설정 후 구글 연결", time: "10분" },
  { n: 4, icon: "🚀", title: "원고 → 발행", desc: "초안·바로·예약 중 고르기", time: "매번 1분" },
];

const FAQ = [
  ["연결 확인에서 401이 나와요", "카페24 같은 공유 호스팅이 로그인 정보(Authorization 머리글)를 지우는 경우입니다. 아래 「워드프레스 연결」의 .htaccess 한 줄을 넣고 다시 「연결 확인」을 눌러 주세요."],
  ["구글 연결이 일주일마다 끊겨요", "구글 콘솔의 OAuth 동의 화면이 「테스트」 상태이면 구글 정책상 7일마다 연결이 풀립니다. 「앱 게시」를 눌러 프로덕션으로 바꿔 주세요(본인 앱이라 「확인되지 않은 앱」 경고는 「고급 → 이동」으로 넘어가면 됩니다)."],
  ["예약한 글을 취소하고 싶어요", "보관함에서 그 원고를 열고 「예약 취소(초안으로)」를 누르면 블로그에서 초안으로 되돌아갑니다."],
  ["결과가 「확인 필요」예요", "보냈지만 응답을 받지 못한 경우입니다. 중복을 막기 위해 자동으로 다시 보내지 않습니다. 블로그 관리 화면에서 글이 있는지 본 뒤 「올라갔어요 / 안 올라갔어요」를 눌러 정리해 주세요."],
  ["원고와 이미지는 얼마나 보관되나요?", "발행하지 않은 원고(초안·예약 대기·실패·확인 필요)는 만든 날부터 30일 뒤 이미지와 함께 지워집니다. 구글 블로그에 실제로 발행된 글은 본문은 30일 뒤 비우고, 글에 들어간 이미지는 발행일부터 1년 보관한 뒤 기록과 함께 지웁니다. 블로그에 올라간 글 자체는 블로그에 그대로 남습니다."],
  ["이미지가 구글 블로그에서 깨질까 봐 걱정돼요", "구글 블로그는 이미지를 이 프로그램 저장소 주소로 불러옵니다. 실제로 발행된 글의 이미지는 발행일부터 1년 보관합니다. 1년 넘게 이미지를 유지하려면 그 전에 구글 블로그 편집기에서 이미지를 직접 올려 바꿔 주세요. 워드프레스는 발행할 때 내 사이트 미디어 보관함에 복사되므로 상관없습니다."],
  ["예약한 글은 언제 「발행됨」으로 바뀌나요?", "예약 시각이 지나면 하루 한 번 내 블로그 연결로 실제로 올라갔는지 읽어서 확인한 뒤 「발행됨」으로 바꿉니다. 확인되기 전까지는 발행하지 않은 원고로 보아 30일 규칙을 따릅니다. 확인이 안 되면 다시 보내지 않고 다음 날 다시 확인합니다."],
  ["비용은 얼마나 드나요?", "원고는 본인 Claude 키로 1편 약 5~400원(모델에 따라), 이미지는 본인 Gemini 키로 1장 약 50~70원입니다. 워드프레스·구글 블로그 발행 자체는 무료입니다."],
];

function Section({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="lp-card scroll-mt-24 space-y-3">
      <h2 className="text-xl font-black">{icon} {title}</h2>
      {children}
    </section>
  );
}
const Li = ({ children }: { children: React.ReactNode }) => <li className="ml-5 list-decimal pl-1 text-sm leading-7">{children}</li>;
const Tip = ({ children }: { children: React.ReactNode }) => <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm">💡 <b>팁</b> — {children}</p>;
const Trap = ({ children }: { children: React.ReactNode }) => <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm">⚠️ <b>함정</b> — {children}</p>;
const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} target="_blank" rel="noreferrer" className="lp-btn-ghost text-sm">{children} ↗</a>;

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">📘 비행 교범</span>
        <h1 className="mt-2 text-3xl font-black">연동 & 사용 매뉴얼</h1>
      </div>

      {/* ① 메타 바 */}
      <div className="lp-card flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <b>⏱ 처음 설정 약 15분</b>
        <span>🔗 워드프레스 3단계 · 구글 블로그 4단계</span>
        <span>✅ 매일 조작 0~1번(예약이면 0번)</span>
        <span className="ml-auto flex flex-wrap gap-2">
          <Ext href="https://www.buylife.xyz/api-settings">AIMaster 키 등록</Ext>
          <Ext href="https://console.cloud.google.com/apis/library/blogger.googleapis.com">Blogger API 켜기</Ext>
        </span>
      </div>

      {/* ② 히어로 */}
      <div className="lp-pad lp-pad-wp" style={{ background: "linear-gradient(135deg,#2271b1,#ff8a1f)" }}>
        <h2 className="text-2xl font-black">원고 한 번, 두 블로그로 발사</h2>
        <p className="mt-2 text-sm leading-6 opacity-95">주제를 넣으면 구글 검색에 맞춘 원고와 이미지를 만들고, 워드프레스·구글 블로그에 <b>발행 전까지(초안) · 바로 발행 · 예약</b> 중 고른 방식으로 올립니다. 확장 프로그램 없이 블로그의 공식 연결로 올라가고, 예약은 블로그가 직접 실행하므로 PC를 꺼 두어도 됩니다.</p>
      </div>

      {/* ③ 단계 카드 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <a key={s.n} href={`#step${s.n}`} className="lp-card block hover:ring-2 hover:ring-[color:var(--wp)]">
            <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-700">STEP {s.n} · {s.time}</span>
            <p className="mt-2 text-lg font-black">{s.icon} {s.title}</p>
            <p className="text-sm text-[color:var(--muted)]">{s.desc}</p>
          </a>
        ))}
      </div>

      {/* ④ 상세 단계 */}
      <Section id="step1" icon="🔑" title="STEP 1. AI 키 등록(본인 키)">
        <ol className="space-y-1">
          <Li>원고용 <b>Anthropic(Claude) API 키</b>를 <a className="font-bold text-[color:var(--wp)] underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Anthropic 콘솔</a>에서 만듭니다(결제 수단 등록 필요).</Li>
          <Li>이미지용 <b>Gemini API 키</b>를 <a className="font-bold text-[color:var(--wp)] underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>에서 만듭니다.</Li>
          <Li><a className="font-bold text-[color:var(--wp)] underline" href="https://www.buylife.xyz/api-settings" target="_blank" rel="noreferrer">AIMaster 키 등록</a>에 두 키를 넣습니다. 한 번 넣으면 다른 AIMaster 프로그램도 그대로 씁니다.</Li>
        </ol>
        <Tip>키는 회원님 계정에만 저장되고, 요금도 회원님 키로만 나갑니다. 「⚙️ AI 키·모델」 화면에서 등록 상태를 볼 수 있습니다.</Tip>
      </Section>

      <Section id="step2" icon="🅦" title="STEP 2. 워드프레스 연결">
        <ol className="space-y-1">
          <Li>워드프레스 관리자(<code>내사이트/wp-admin</code>)에 로그인합니다.</Li>
          <Li>「사용자 → 프로필」 맨 아래 <b>「응용 프로그램 비밀번호」</b>에 이름(예: AIMaster)을 넣고 「새 응용 프로그램 비밀번호 추가」를 누릅니다.</Li>
          <Li>나온 24글자를 복사합니다. <b>창을 닫으면 다시 볼 수 없습니다.</b></Li>
          <Li><Link className="font-bold text-[color:var(--wp)] underline" href="/connect">🔑 API키등록·플랫폼연동</Link>에서 사이트 주소·사용자명(로그인 아이디)·응용 비밀번호를 넣고 「연결 확인」을 누릅니다.</Li>
        </ol>
        <Trap>「응용 비밀번호」는 로그인 비밀번호가 아닙니다. 또 사이트 주소는 <b>https://</b>로 시작해야 합니다.</Trap>
        <Trap>카페24 같은 공유 호스팅은 연결 확인이 401로 실패할 수 있습니다. 사이트 최상위 폴더의 <code>.htaccess</code> 맨 위에 아래 한 줄을 넣어 주세요.</Trap>
        <CodeLine code={HTACCESS} />
      </Section>

      <Section id="step3" icon="🅑" title="STEP 3. 구글 블로그 연결(처음 한 번)">
        <ol className="space-y-1">
          <Li><a className="font-bold text-[color:var(--wp)] underline" href="https://www.blogger.com" target="_blank" rel="noreferrer">blogger.com</a>에 블로그가 없으면 먼저 만듭니다.</Li>
          <Li><a className="font-bold text-[color:var(--wp)] underline" href="https://console.cloud.google.com/apis/library/blogger.googleapis.com" target="_blank" rel="noreferrer">구글 클라우드 콘솔</a>에서 <b>유튜브 자동화용으로 만든 프로젝트</b>를 고르고 「Blogger API v3」를 <b>사용</b>으로 켭니다(없으면 새 프로젝트).</Li>
          <Li>「API 및 서비스 → 사용자 인증 정보」에서 OAuth 클라이언트 ID(웹 애플리케이션)를 열고, <b>승인된 리디렉션 URI</b>에 아래 주소를 <b>추가</b>한 뒤 저장합니다(기존 주소는 지우지 않음).</Li>
        </ol>
        <CodeLine code={REDIRECT} />
        <ol className="space-y-1" start={4}>
          <Li>Client ID·Secret을 아직 안 넣었다면 <a className="font-bold text-[color:var(--wp)] underline" href="https://www.buylife.xyz/api-settings" target="_blank" rel="noreferrer">AIMaster 키 등록</a>에 넣습니다.</Li>
          <Li><Link className="font-bold text-[color:var(--wp)] underline" href="/connect">🔑 API키등록·플랫폼연동</Link>에서 「구글 연결」 → 동의 화면에서 <b>블로그 권한에 체크</b> → 돌아오면 내 블로그를 고릅니다.</Li>
        </ol>
        <Trap>동의 화면이 「테스트」 상태면 <b>7일마다 연결이 끊깁니다</b>. 「OAuth 동의 화면 → 앱 게시」로 프로덕션으로 바꿔 주세요.</Trap>
        <Tip>주소 반영에는 몇 분 걸릴 수 있습니다. 「redirect_uri_mismatch」가 나오면 주소를 한 글자도 다르지 않게 넣었는지 확인하고 5분 뒤 다시 눌러 주세요.</Tip>
      </Section>

      <Section id="step4" icon="🚀" title="STEP 4. 원고 만들기 → 발행">
        <ol className="space-y-1">
          <Li><Link className="font-bold text-[color:var(--wp)] underline" href="/write">✍️ 원고 만들기</Link>에서 주제·키워드(참고 주소·메모는 선택)를 넣고 블로그·언어·분량·AI 모델을 고릅니다.</Li>
          <Li>편집 화면에서 제목·요약 설명·주소 이름·태그를 확인하고, 오른쪽 「🖼 이미지」에서 장면 기획 → 만들기를 누릅니다.</Li>
          <Li>「🚀 발행」에서 <b>발행 전까지(초안) · 바로 발행 · 예약</b> 중 하나를 골라 보냅니다.</Li>
          <Li>결과는 편집 화면과 <Link className="font-bold text-[color:var(--wp)] underline" href="/posts">📚 보관함</Link>에 남습니다(글 주소·예약 시각·실패 사유).</Li>
        </ol>
        <Trap>예약 날짜는 <b>원고 보관 만료(만든 날부터 30일) 하루 전까지</b>만 고를 수 있습니다. 발행되지 않은 원고의 이미지는 30일 뒤 지워지므로, 그보다 늦게 공개되면 글의 이미지가 깨지기 때문입니다.</Trap>
        <Tip>보관 기간 — 발행하지 않은 원고는 30일, 구글 블로그에 실제로 발행된 글의 이미지는 발행일부터 1년입니다. 자세한 내용은 아래 FAQ를 봐 주세요.</Tip>
        <Tip>「발행 전까지」를 고르면 블로그에 초안으로만 저장되고, 마지막 발행 버튼은 블로그에서 직접 누릅니다. 처음 몇 번은 이 방식으로 모양을 확인해 보세요.</Tip>
      </Section>

      {/* ⑧ FAQ */}
      <section className="space-y-2">
        <h2 className="text-xl font-black">자주 묻는 질문</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="lp-card">
            <summary className="cursor-pointer font-black">Q. {q}</summary>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
