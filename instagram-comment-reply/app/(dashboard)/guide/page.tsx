import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { CopyAddress } from "@/components/settings/CopyAddress";
import { INSTAGRAM_REDIRECT_NEW, SITE_ORIGIN } from "@/lib/oauthRedirect";
import { computeInstagramVerifyToken } from "@/lib/dmApp/instagram/webhookSecret";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-20 v1.24 — 댓글 매뉴얼(/guide)과 DM 매뉴얼(/dm/guide)을 하나로 합친 초보자용 매뉴얼.
// 구성은 INSTA 포스팅 매뉴얼과 같고, docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 스타일 2(OAuth·앱)·6(웹훅·봇)·8(통합 이전)을 따른다.

const QUICK_STEPS = [
  { no: 1, icon: "🧩", title: "Meta 앱 만들기", desc: "내 Meta 앱을 만들고 콜백 주소·테스터를 등록합니다.", menu: "Meta 개발자 센터", time: "약 10분" },
  { no: 2, icon: "🔑", title: "키 등록", desc: "Instagram 앱 ID·시크릿과 AI 키 1개를 등록합니다.", menu: "API키등록·플랫폼연동", time: "3분" },
  { no: 3, icon: "🔗", title: "인스타 연결", desc: "「DM 답변도 사용」을 켜고 내 인스타 계정을 연결합니다.", menu: "API키등록·플랫폼연동", time: "1분" },
  { no: 4, icon: "💬", title: "댓글 자동답글", desc: "게시물을 고르고, AI 답글 초안을 승인해 올립니다.", menu: "STEP 1·2", time: "수시" },
  { no: 5, icon: "💌", title: "DM 자동답장", desc: "DM 웹훅을 등록하고 봇을 켜면 DM 초안이 생깁니다.", menu: "DM 답변 설정", time: "5분" },
];

const FAQ = [
  {
    q: "AI가 답글이나 DM을 마음대로 보내나요?",
    a: "아니요. 기본은 사람이 「답변승인」을 눌러야만 게시·발송됩니다. 설정에서 위험 안내를 읽고 동의한 뒤 「자동 게시」나 「자동 발송」을 직접 켠 경우에만 검토 없이 나갑니다.",
  },
  {
    q: "계정 연결이 「Invalid platform app」 오류로 실패해요.",
    a: "Instagram 앱 ID 칸에 Facebook 앱 ID(앱 화면 맨 위 숫자)를 넣은 경우가 대부분이에요. 「Instagram 로그인이 포함된 API 설정」 화면 맨 위의 Instagram 앱 ID(15~16자리)와 시크릿 코드(32자)를 넣어 주세요.",
  },
  {
    q: "「DM 답변도 사용」을 켰더니 연결이 안 돼요.",
    a: "내 Meta 앱에 메시지 권한(instagram_business_manage_messages)이 아직 없으면 실패할 수 있어요. 체크를 끄고 다시 연결하면 댓글 기능은 바로 쓸 수 있고, 앱에 메시지 권한을 추가한 뒤 「DM 답변도 쓰도록 다시 연결」을 누르면 됩니다.",
  },
  {
    q: "DM이 왔는데 초안이 안 생겨요.",
    a: "① DM 답변 설정의 「봇 활성화」가 켜져 있는지 ② Meta 앱 Webhooks에 이 매뉴얼의 콜백 URL·확인 토큰이 등록되고 messages가 구독됐는지 ③ 상대가 보낸 지 24시간이 지나지 않았는지 확인해 주세요.",
  },
  {
    q: "텔레그램 연동에서 「메시지를 찾지 못했어요」가 계속 나와요.",
    a: "봇과의 1:1 대화창(그룹 아님)에서 보냈는지 확인하고, 「연동 확인하기」를 한 번 누른 뒤 → 봇에게 메시지를 하나 보내고 → 다시 「연동 확인하기」를 눌러 주세요. 그래도 안 되면 빨간 안내 끝의 [진단: …] 내용을 보면 원인을 알 수 있어요(웹훅이 다른 주소에 걸림 = 다른 서비스가 이 봇을 쓰는 중).",
  },
  {
    q: "비용은 얼마나 드나요?",
    a: "인스타 연결과 이 프로그램 사용 자체는 추가 요금이 없고, 답글·답장 초안은 회원님 본인 AI 키로 만들어 1건당 아주 적은 요금이 해당 AI 회사에 청구됩니다.",
  },
];

const GUIDE_LINKS = [
  { guideId: "4115e455-1585-4304-89b4-d29859fd7a5a", label: "인스타그램 계정 연동하기 (댓글·DM)" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

function StepBlock({ no, title, menu, children }: { no: number; title: string; menu: string; children: React.ReactNode }) {
  return (
    <section className="ig-card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ig-primary text-sm font-bold text-white">{no}</span>
        <h3 className="text-base font-bold text-ig-text">{title}</h3>
        <span className="rounded-full border border-ig-border px-2 py-0.5 text-[11px] text-ig-muted">👉 {menu}</span>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-ig-text">{children}</div>
    </section>
  );
}

function Copy({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-ig-muted">{label}</p>
      <CopyAddress value={value} />
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-ig-success/40 bg-ig-success/10 px-3 py-2 text-xs leading-relaxed text-ig-success">💡 {children}</p>;
}

function Warn({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-ig-warn/40 bg-ig-warn/10 px-3 py-2 text-xs leading-relaxed text-ig-warn">⚠️ {children}</p>;
}

export default async function GuidePage() {
  const user = await requireProgramAccess();
  const webhookUrl = `${SITE_ORIGIN}/api/instagram/dm-webhook/${user.id}`;
  const verifyToken = computeInstagramVerifyToken(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ① 머리 카드 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-ig-primary/30 bg-gradient-to-r from-ig-primary/15 via-ig-surface to-ig-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold text-ig-text">
            📖 INSTA 댓글·DM 자동화 연동 & 사용 매뉴얼
            <span className="rounded-full border border-ig-primary/40 bg-ig-primary/15 px-2 py-0.5 text-xs font-bold text-ig-primary">{APP_VERSION}</span>
          </h1>
          <p className="mt-1 text-sm text-ig-muted">
            처음 한 번만 연결해 두면, 그다음부터는 댓글·DM 초안을 확인하고 「답변승인」만 누르면 됩니다. 처음 설정은 약 20분 걸려요.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/settings" className="ig-btn-primary">
            🔑 연결 시작하기
          </Link>
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="ig-btn">
            Meta 개발자 센터 ↗
          </a>
        </div>
      </div>

      {/* ② 개요 */}
      <div className="ig-card space-y-3">
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-ig-primary/15 px-2 py-0.5 text-ig-primary">인스타 댓글 + DM</span>
          <span className="rounded-full bg-ig-success/15 px-2 py-0.5 text-ig-success">연결 한 번으로 둘 다</span>
          <span className="rounded-full bg-ig-warn/15 px-2 py-0.5 text-ig-warn">처음 설정 약 20분</span>
        </div>
        <p className="text-sm leading-relaxed text-ig-text">
          🤖 새 <b>댓글</b>이 달리면 AI가 댓글마다 다른 답글 초안(원하는 링크 포함)을 쓰고, 새 <b>DM</b>이 오면 문의에 맞는 답장 초안을 씁니다.
          회원님은 웹 화면이나 텔레그램에서 확인하고 「답변승인」만 누르면 인스타그램에 게시·발송돼요.
        </p>
        <p className="text-sm leading-relaxed text-ig-muted">
          예전에는 「INSTA 댓글자동화」와 「INSTA DM답변 자동화」 두 프로그램이었는데, 2026-10-20부터 이 프로그램 하나로 합쳐졌습니다. 왼쪽 메뉴
          「STEP 1·2」가 댓글, 「💬 DM 답변」 묶음이 DM입니다.
        </p>
      </div>

      {/* ③ 5단계 카드 */}
      <div>
        <h2 className="mb-3 text-base font-bold text-ig-text">⚡ 5단계로 끝나는 설정 순서</h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {QUICK_STEPS.map((s) => (
            <li key={s.no} className="flex flex-col rounded-xl border border-ig-border bg-ig-surface p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-ig-primary/40 px-1.5 py-0.5 text-[10px] font-bold text-ig-primary">STEP {s.no}</span>
                <span className="text-xl">{s.icon}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-ig-text">{s.title}</p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-ig-muted">{s.desc}</p>
              <p className="mt-3 border-t border-ig-border pt-2 text-[11px] text-ig-primary">
                👉 {s.menu} · {s.time}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* ④ 단계별 자세한 안내 */}
      <StepBlock no={1} title="Meta 앱 만들기 (처음 한 번)" menu="developers.facebook.com › 내 앱">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Meta 개발자 센터에서 <b>[앱 만들기]</b>를 누르고, 이용 사례에 <b>Instagram API</b>(Instagram 로그인 방식)를 추가합니다.
          </li>
          <li>
            <b>이용 사례 › 맞춤 설정 › Instagram 로그인이 포함된 API 설정</b> 화면으로 갑니다. 맨 위에 나오는 <b>Instagram 앱 ID</b>와
            <b> Instagram 앱 시크릿 코드</b>([표시] 버튼)를 메모해 둡니다 — 2단계에서 씁니다.
          </li>
          <li>
            같은 화면 <b>「4. Instagram 비즈니스 로그인 설정」</b>의 OAuth 리디렉션 URI에 아래 주소를 붙여넣고 저장합니다. 앱 설정 › 기본 설정 › 앱 도메인에는
            <b> buylife.xyz</b>를 넣습니다.
          </li>
          <li>
            <b>앱 역할 › 역할</b>에서 내 인스타그램 계정을 <b>Instagram 테스터</b>로 추가하고, 인스타그램 앱 › 설정 › 웹사이트 권한 › 앱 및 웹사이트 ›
            <b> 테스터 초대</b>에서 [수락]을 누릅니다. 이렇게 하면 Meta 심사 없이 내 계정을 바로 연결할 수 있어요.
          </li>
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <Copy label="OAuth 리디렉션 URI (4. Instagram 비즈니스 로그인 설정)" value={INSTAGRAM_REDIRECT_NEW} />
          <Copy label="앱 도메인 (앱 설정 › 기본 설정)" value="buylife.xyz" />
        </div>
        <Warn>인스타그램은 비즈니스 또는 크리에이터(프로페셔널) 계정만 연결됩니다. 개인 계정이면 인스타그램 앱 › 설정 › 계정 유형에서 먼저 전환해 주세요.</Warn>
      </StepBlock>

      <StepBlock no={2} title="키 등록 — Instagram 앱 ID·시크릿 + AI 키 1개" menu="API키등록·플랫폼연동">
        <p>
          왼쪽 메뉴 <b>🔑 API키등록·플랫폼연동</b>에서 1단계에서 메모한 <b>Instagram 앱 ID</b>와 <b>Instagram 앱 시크릿 코드</b>를 저장합니다. 그다음 답글·답장을
          만들 AI 키(OpenAI·Claude·Gemini 중 <b>하나</b>)를 등록하고, 그 회사의 모델을 고릅니다.
        </p>
        <Warn>
          앱 화면 맨 위의 「앱 ID」(Facebook 앱 ID)와 「Instagram 앱 ID」는 다른 값이에요. Facebook 앱 ID를 넣으면 연결할 때 「Invalid platform app」 오류가 납니다.
          Instagram 앱 ID는 숫자 15~16자리, 시크릿은 영문·숫자 32자예요.
        </Warn>
        <Tip>키는 회원님 본인 것만 사용하며, 한 번 등록하면 댓글과 DM이 함께 씁니다. 관리자 공용 키로 대신 동작하지 않아요.</Tip>
      </StepBlock>

      <StepBlock no={3} title="인스타그램 계정 연결 — 「DM 답변도 사용」 켜기" menu="API키등록·플랫폼연동">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            같은 화면의 「📸 Instagram 계정 연결」에서 <b>「DM 답변도 사용」</b> 체크가 켜져 있는지 확인합니다(기본으로 켜져 있어요).
          </li>
          <li>
            <b>[계정 연결하기]</b>를 누르고 인스타그램 화면에서 허용합니다. 돌아오면 「@내계정 (댓글·DM)」으로 표시됩니다.
          </li>
          <li>DM 없이 댓글만 쓰려면 체크를 끄고 연결하면 됩니다. 나중에 「💬 DM 답변도 쓰도록 다시 연결」 버튼으로 언제든 추가할 수 있어요.</li>
        </ol>
        <Tip>대시보드 「🔌 연결 상태」에서 인스타 계정·Meta 앱·AI 키·DM 답변이 모두 초록불인지 한눈에 확인할 수 있어요.</Tip>
      </StepBlock>

      <StepBlock no={4} title="댓글 자동답글 쓰기" menu="STEP 1 게시물 관리 → STEP 2 댓글 검토/게시">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            <b>STEP 1 게시물 관리</b>에서 [동기화]로 내 게시물을 불러옵니다. 동기화한 게시물은 기본으로 모두 자동 답글 대상이 되니, 원치 않는 게시물만 끄거나 숨겨 주세요. API키등록·플랫폼연동의 「⏱ 예약 모니터링」을 켜면 정해진 간격마다 새 댓글을 확인해요.
          </li>
          <li>
            <b>STEP 2 댓글 검토/게시</b>에서 AI가 쓴 초안을 읽고, 필요하면 고친 뒤 <b>「답변승인」</b>을 누르면 인스타그램에 답글이 올라갑니다. 「보류」·「제외」도 고를 수 있어요.
          </li>
          <li>게시한 답글은 <b>답글 이력</b>에서 볼 수 있습니다(기록 화면 위 탭으로 DM 기록과 오갈 수 있어요).</li>
        </ol>
        <Tip>게시물마다 최근 댓글 20개까지만 가져와 무리하게 몰아서 처리하지 않습니다. 답글 기본 링크·말투는 API키등록·플랫폼연동 아래쪽 「🔗 답글 기본 설정」에서 정해요.</Tip>
      </StepBlock>

      <StepBlock no={5} title="DM 자동답장 쓰기 — 웹훅 등록 + 봇 켜기" menu="Meta 앱 Webhooks → DM 답변 설정">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Meta 앱의 <b>Instagram 로그인이 포함된 API 설정 › 웹훅 구성</b>에서 아래 <b>콜백 URL</b>과 <b>확인 토큰</b>을 그대로 붙여넣고 [확인 및 저장]을 누릅니다.
          </li>
          <li>
            바로 아래 웹훅 필드 목록에서 <b>messages</b>를 [구독]합니다. 이때부터 새 DM이 이 프로그램으로 실시간 전달돼요.
          </li>
          <li>
            왼쪽 메뉴 <b>💬 DM 답변 › DM 답변 설정</b>에서 <b>「봇 활성화」</b>를 켜고, 답장 말투·기본 링크·첫 대화 안내 문구를 정합니다.
          </li>
          <li>
            새 DM이 오면 <b>DM 검토/발송</b>에서 초안을 확인하고 「답변승인」을 누르면 발송됩니다. 처음 대화하는 상대에게는 「자동 응답 안내 메시지」가 먼저 한 번 나가요(Meta 정책).
          </li>
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <Copy label="콜백 URL (회원님 전용 — 주소 1개만 등록)" value={webhookUrl} />
          <Copy label="확인 토큰 (Verify Token)" value={verifyToken} />
        </div>
        <Warn>인스타그램 규칙상 상대가 마지막으로 보낸 메시지로부터 24시간 안에만 답장할 수 있어요. 오래된 문의는 인스타그램 앱에서 직접 답해 주세요.</Warn>
      </StepBlock>

      {/* 텔레그램 */}
      <section className="ig-card space-y-3">
        <h2 className="text-base font-bold text-ig-text">📲 (선택) 텔레그램으로 바로 승인하기 — 봇 2개 만들기</h2>
        <p className="text-sm leading-relaxed text-ig-text">
          텔레그램을 연결하면 새 댓글·DM과 AI 초안이 휴대폰으로 오고, 메시지 아래 <b>✅ 답변승인 / ⏸ 답변보류 / ❌ 답변제외</b> 버튼으로 바로 처리할 수 있어요.
          텔레그램 봇 하나에는 연결 주소를 하나만 걸 수 있어서 <b>댓글용과 DM용 봇을 따로</b> 만들어야 합니다.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ig-text">
          <li>
            텔레그램에서 <b>@BotFather</b>를 찾아 <b>/newbot</b>을 보내고 안내대로 봇 이름(끝이 <b>bot</b>)을 정하면 토큰을 알려 줍니다. 이 과정을 두 번 해서 봇 2개를 만듭니다.
          </li>
          <li>
            <b>댓글 봇</b>: 그 봇 대화창에서 아무 메시지나 보낸 뒤 → <b>API키등록·플랫폼연동</b>의 「텔레그램 알림 연동(💬 댓글 전용 봇)」에 토큰을 넣고 「연동 확인하기」.
          </li>
          <li>
            <b>DM 봇</b>: 다른 봇 대화창에서 메시지를 보낸 뒤 → <b>DM 답변 설정</b>의 「텔레그램 알림 연동(💌 DM 전용 봇)」에 토큰을 넣고 「연동 확인하기」.
          </li>
        </ol>
        <Warn>
          「메시지를 찾지 못했어요」가 나오면: 봇과의 <b>1:1 대화창</b>(그룹 아님)인지 확인 → 「연동 확인하기」 한 번 → 봇에게 메시지 보내기 → 다시 「연동 확인하기」. 안내에 나오는
          「입력한 토큰의 봇은 @○○」이 내가 메시지를 보낸 봇과 같은지도 확인해 주세요.
        </Warn>
      </section>

      {/* 옛 DM 프로그램 회원 */}
      <section className="ig-card space-y-2 border-l-4 border-l-ig-warn">
        <h2 className="text-base font-bold text-ig-text">🔄 예전 「INSTA DM답변 자동화」를 쓰던 분이 할 일</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ig-text">
          <li>
            <b>DM 웹훅 바꾸기</b>: Meta 앱 Webhooks의 콜백 URL과 확인 토큰을 위 5단계의 새 값 <b>두 개 모두</b>로 바꿔 저장해 주세요. 프로그램이 합쳐지면서 확인 토큰도 바뀌었습니다.
          </li>
          <li>
            <b>DM 텔레그램 봇 다시 연동</b>: DM 답변 설정에서 같은 DM 봇 토큰으로 「연동 확인하기」를 한 번 더 해 주세요(이미 연결됨으로 보이면 그대로 두셔도 돼요).
          </li>
          <li>
            <b>즐겨찾기 주소</b>: 예전 주소(instagram-dm-reply.buylife.xyz)로 들어와도 자동으로 이 프로그램의 DM 화면으로 넘어옵니다. 새 주소로 바꿔 두면 더 빨라요.
          </li>
        </ol>
        <Tip>DM 대화·설정·발송 기록은 그대로 옮겨져 있어 다시 만들 필요가 없습니다.</Tip>
      </section>

      {/* FAQ */}
      <section className="ig-card">
        <h2 className="ig-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-lg bg-ig-raised px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-ig-text">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ig-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 상세 매뉴얼 */}
      <section className="ig-card space-y-3">
        <h2 className="text-base font-bold text-ig-text">📚 그림으로 보는 상세 매뉴얼 (새 창)</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/settings" className="ig-btn-primary">
            🔑 API키등록·플랫폼연동으로 이동
          </Link>
          <Link href="/dm/settings" className="ig-btn">
            💌 DM 답변 설정으로 이동
          </Link>
        </div>
      </section>
    </div>
  );
}
