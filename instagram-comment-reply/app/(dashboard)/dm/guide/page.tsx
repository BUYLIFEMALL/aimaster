import Link from "next/link";
import { requireProgramAccess } from "@/lib/dmApp/access";
import { StudioHeader, Avatar } from "@/components/dm/ui/StudioHeader";
import { GuideLinkButton } from "@/components/dm/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  { icon: "🧩", title: "Meta 앱 만들기", desc: "본인 Meta 앱 + 「Instagram API(Instagram 로그인)」, 콜백 주소 등록, 본인 계정을 테스터로", time: "약 10분", href: "/dm/settings" },
  { icon: "🔗", title: "계정 연결", desc: "Instagram 앱 ID·시크릿 등록 → 「계정 연결하기」로 인스타 프로페셔널 계정 허용", time: "1분", href: "/dm/settings" },
  { icon: "📡", title: "DM 웹훅 등록", desc: "Meta 앱 Webhooks에 콜백 URL·확인 토큰(Verify Token) 입력 후 messages 구독", time: "3분", href: "/dm/settings" },
  { icon: "🤖", title: "AI 키·고지 문구", desc: "AI 키 하나 + 답장 톤·기본 링크·자동 응답 고지 문구", time: "3분", href: "/dm/settings" },
  { icon: "▶", title: "봇 활성화·승인", desc: "「▶ 봇 활성화」를 누르면 새 DM에 초안이 만들어져요 → 24시간 안에 승인", time: "수시", href: "/dm/conversations" },
];

const FAQ = [
  {
    q: "24시간 규칙이 뭔가요?",
    a: "Meta 정책상 비즈니스 계정은 고객이 마지막으로 메시지를 보낸 뒤 24시간 안에만 자유롭게 답장할 수 있어요. 그래서 DM 검토 화면과 대시보드에 남은 시간을 표시합니다(4시간 미만은 주황, 지나면 빨강).",
  },
  {
    q: "고객에게 「자동 응답입니다」 같은 문구가 왜 먼저 나가나요?",
    a: "대화마다 처음 한 번은 자동 응답임을 알리는 고지 문구를 답장보다 먼저 보내도록 되어 있어요(Meta 정책 준수). 문구는 설정에서 바꿀 수 있어요.",
  },
  {
    q: "새 DM이 들어오지 않아요.",
    a: "① Meta 앱 Webhooks에 이 프로그램의 콜백 URL·확인 토큰을 등록하고 messages를 구독했는지, ② 설정에서 「▶ 봇 활성화」를 켰는지 확인하세요. 예전 vercel.app 주소로 등록했다면 새 주소로 바꿔 주세요.",
  },
  {
    q: "계정 연결이 「Invalid platform app」으로 실패해요.",
    a: "Instagram 앱 ID 칸에 Facebook 앱 ID를 넣었거나 자릿수가 빠진 경우예요. Meta 앱의 「Instagram 로그인이 포함된 API 설정」 맨 위의 Instagram 앱 ID(15~16자리)를 넣어 주세요.",
  },
  {
    q: "댓글 답글 기능과 어떻게 함께 쓰나요?",
    a: "INSTA 댓글·DM 자동화 한 프로그램 안에서 인스타 계정 연결 한 번(「DM 답변도 사용」 켬)으로 댓글과 DM을 함께 처리합니다. 피드/릴스 댓글 문의는 댓글 메뉴에서 즉시 대응하고, 댓글에서 'DM 확인해 주세요'로 유입된 고객은 DM 메뉴에서 구매/상담 링크를 안내할 수 있습니다.",
  },
];

const GUIDE_LINKS = [
  { guideId: "4115e455-1585-4304-89b4-d29859fd7a5a", label: "인스타그램 계정 연동하기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <StudioHeader icon="📖" title="연동 & 사용 매뉴얼" description="처음 한 번만 연결해 두면, 그다음부터는 새 DM의 답장 초안을 확인하고 승인만 하면 됩니다.">
        <Link href="/dm/settings" className="ig-btn-primary">
          🔑 연결 시작하기
        </Link>
      </StudioHeader>

      <div className="flex items-start gap-3">
        <div className="ig-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl">🤖</div>
        <div className="ig-card rounded-tl-none p-4">
          <p className="text-sm leading-relaxed text-ig-text">
            안녕하세요, DM 비서예요! 고객이 DM을 보내면 <b>바로 읽고 답장 초안</b>(원하는 링크 포함)을 써 둘게요. 고객이 마지막으로
            보낸 뒤 <b>24시간 안에</b> 「답변승인 · 발송」만 눌러 주세요. 텔레그램을 연결하면 휴대폰에서도 바로 승인할 수 있어요.
          </p>
        </div>
      </div>

      <section className="ig-card">
        <h2 className="ig-section-title">🧭 시작하기 5단계</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-ig-border bg-ig-raised p-4 transition-colors hover:border-ig-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ig-primary text-xs font-bold text-white">{i + 1}</span>
                  <span className="ig-chip px-2 py-0.5 text-[10px]">⏱ {s.time}</span>
                </div>
                <span className="mt-3 text-3xl">{s.icon}</span>
                <span className="mt-2 text-sm font-bold text-ig-text">{s.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-ig-muted">{s.desc}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-ig-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="ig-card">
        <h2 className="ig-section-title">💬 화면에서는 이렇게 보여요</h2>
        <div className="space-y-2 rounded-xl bg-ig-bg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ig-text">@minji</span>
            <span className="rounded-full bg-ig-success/10 px-2.5 py-0.5 text-xs font-semibold text-ig-success">⏳ 24시간 윈도우 21시간 12분 남음</span>
          </div>
          <div className="flex items-end gap-2">
            <Avatar name="minji" size={26} />
            <p className="max-w-[80%] rounded-3xl rounded-bl-md bg-ig-raised px-4 py-2.5 text-sm text-ig-text">안녕하세요! 이 원피스 M 사이즈 재입고 되나요?</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="mb-1 text-[11px] font-semibold text-ig-muted">↳ 내 답장 · AI 초안</p>
            <p className="max-w-[80%] rounded-3xl rounded-br-md bg-ig-primary px-4 py-2.5 text-sm text-white">
              문의 감사해요 😊 M 사이즈는 다음 주 재입고 예정이에요! 알림 신청은 아래 링크에서 하실 수 있어요 https://…
            </p>
            <div className="mt-2 flex gap-2">
              <span className="ig-btn min-h-[32px] px-4 text-xs">답변제외</span>
              <span className="ig-btn-primary min-h-[32px] px-4 text-xs">답변승인 · 발송</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-ig-muted">예시 화면이에요. 실제 발송은 「답변승인 · 발송」을 눌렀을 때만 일어납니다(자동 발송을 켠 경우 제외).</p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-ig-success/30 bg-ig-success/10 p-4">
          <p className="text-sm font-bold text-ig-success">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-ig-text">
            <li>대시보드의 「⏳ 4시간 안에 기한 끝남」 숫자를 먼저 확인하세요.</li>
            <li>답장 톤과 AI 추가 지시를 정해 두면 브랜드 말투가 일정해져요.</li>
            <li>텔레그램을 연결하면 새 DM과 초안이 휴대폰으로 와서 바로 승인할 수 있어요.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-ig-warn/40 bg-ig-warn/10 p-4">
          <p className="text-sm font-bold text-ig-warn">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-ig-text">
            <li>Meta 앱·AI 키는 회원님 <b>본인 것</b>만 사용해요(운영자 앱·키 대신 사용 없음).</li>
            <li>발송된 DM은 되돌릴 수 없어요. 승인 전에 내용과 링크를 꼭 확인하세요.</li>
            <li>인스타 댓글자동화와 같은 Meta 앱을 함께 써도 돼요(같은 Instagram 앱 ID).</li>
          </ul>
        </div>
      </div>

      <section className="ig-card">
        <h2 className="ig-section-title">🔑 연결 매뉴얼 (팝업으로 열려요)</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </section>

      <section className="ig-card">
        <h2 className="ig-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-ig-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-ig-text">
                <span className="mr-1 text-ig-muted group-open:hidden">＋</span>
                <span className="mr-1 hidden text-ig-muted group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ig-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 2026-10-20 병합 B 2단계: 댓글 기능은 같은 프로그램 안에 있음 */}
      <section className="ig-card border-l-4 border-l-ig-primary">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-ig-text">
              <span>💬</span> 댓글 자동 답글도 같은 프로그램에서
            </h3>
            <p className="mt-1 text-xs text-ig-muted">
              피드 댓글과 다이렉트 메시지를 한 프로그램에서 함께 자동화합니다. 왼쪽 메뉴 「STEP 1·2」에서 댓글을 관리하세요.
            </p>
          </div>
          <a href="/media" className="ig-btn-primary shrink-0 px-4 py-2 text-xs">
            게시물 관리로 가기 →
          </a>
        </div>
      </section>
    </div>
  );
}
