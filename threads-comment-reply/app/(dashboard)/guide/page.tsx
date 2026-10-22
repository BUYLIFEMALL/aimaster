import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { StudioHeader, Avatar } from "@/components/ui/StudioHeader";
import { ThLogo } from "@/components/ui/ThLogo";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  { icon: "🧩", title: "Meta 앱 만들기", desc: "Meta 개발자 센터에서 본인 앱 + Threads 이용 사례, 콜백 주소 등록, 본인을 테스터로 추가", time: "약 10분", href: "/settings" },
  { icon: "🔗", title: "계정 연결", desc: "Threads 앱 ID·시크릿 등록 → 「계정 연결하기」로 내 쓰레드 계정 허용", time: "1분", href: "/settings" },
  { icon: "🤖", title: "AI 키·말투", desc: "OpenAI·Claude·Gemini 중 하나의 본인 키 + 답글 톤·기본 링크", time: "3분", href: "/settings" },
  { icon: "🧵", title: "게시물 동기화", desc: "내 게시물 불러오기 → 답글 달 게시물만 켜 두기 · 예약 모니터링", time: "1분", href: "/media" },
  { icon: "✅", title: "검토 후 게시", desc: "AI 초안을 고쳐 「답변승인」 또는 텔레그램 버튼으로 승인", time: "수시", href: "/comments" },
];

const FAQ = [
  {
    q: "AI가 답글을 마음대로 올리나요?",
    a: "아니요. 기본은 사람이 「답변승인」을 눌러야만 게시됩니다(Meta 정책). 설정에서 위험 안내에 동의하고 「자동 게시」를 직접 켠 경우에만 검토 없이 올라가며, 그때도 댓글마다 AI가 새로 쓴 답글만 올라가요.",
  },
  {
    q: "계정 연결이 「앱 ID를 인식할 수 없다」며 실패해요.",
    a: "맨 위 「앱 ID」가 아니라 기본 설정 하단의 「Threads 앱 ID」를 넣었는지, Meta 앱의 역할 메뉴에서 본인 쓰레드 계정을 테스터로 추가하고 초대를 수락했는지 확인하세요. 설정 화면 맨 위 주소 카드를 그대로 복사해 등록하면 됩니다.",
  },
  {
    q: "새 댓글을 자동으로 가져오게 할 수 있나요? 내 cron-job.org로 돌릴 수 있나요?",
    a: "네. 설정 → ⏱ 예약 모니터링에서 확인 주기(5분~24시간)를 고르고 시작하면, 그 주기마다 새 댓글을 가져와 AI 초안까지 만들어 둡니다(게시는 지금처럼 승인 또는 자동 게시를 켰을 때만). 기본은 「AIMaster 기본(Vercel)」이라 따로 할 일이 없고, 본인 계정으로 돌리고 싶으면 ⏰ 예약 실행 방식에서 본인 cron-job.org API 키를 저장하고 「내 cron-job.org」를 고르세요. 모니터링을 시작하면 작업이 자동으로 켜지고, 중지하면 자동으로 멈춥니다. 상태 줄에서 일시정지·재개도 할 수 있어요.",
  },
  {
    q: "비용은 얼마나 드나요?",
    a: "쓰레드 연결은 무료이고, 답글 초안은 회원님 본인 AI 키로 만들어 댓글 1개당 아주 적은 요금이 해당 AI 회사에 청구됩니다.",
  },
  {
    q: "텔레그램 승인 버튼이 반응하지 않아요.",
    a: "다른 승인 버튼 프로그램(예: 유튜브 댓글자동화)과 같은 봇을 쓰면 충돌해요. 이 프로그램 전용 새 봇으로 연결하고, 설정 화면의 웹훅 재등록 버튼을 눌러 주세요.",
  },
];

const GUIDE_LINKS = [
  { guideId: "0f5cd337-1231-48c0-a9a1-63297686a97e", label: "Meta 앱 만들기(쓰레드 댓글자동화)" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <StudioHeader icon="📖" title="연동 & 사용 매뉴얼" description="처음 한 번만 연결해 두면, 그다음부터는 댓글 검토·승인만 하면 됩니다.">
        <Link href="/settings" className="th-btn-primary">
          🔑 연결 시작하기
        </Link>
      </StudioHeader>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-th-primary text-2xl">🤖</div>
        <div className="th-card rounded-tl-none p-4">
          <p className="text-sm leading-relaxed text-th-text">
            안녕하세요, 댓글 비서예요! 쓰레드 게시물에 새 댓글이 달리면 제가 읽고 <b>자연스러운 답글 초안</b>(원하는 링크 포함)을 써
            둘게요. 확인하고 <b>「답변승인」만</b> 누르시면 돼요. 텔레그램을 연결하면 휴대폰에서도 바로 승인할 수 있어요.
          </p>
        </div>
      </div>

      <section className="th-card">
        <h2 className="th-section-title">🧭 시작하기 5단계</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-th-border bg-th-raised p-4 transition-colors hover:border-th-muted"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-th-primary text-xs font-bold text-black">{i + 1}</span>
                  <span className="th-chip px-2 py-0.5 text-[10px]">⏱ {s.time}</span>
                </div>
                <span className="mt-3 text-3xl">{s.icon}</span>
                <span className="mt-2 text-sm font-bold text-th-text">{s.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-th-muted">{s.desc}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-th-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="th-card">
        <h2 className="th-section-title">💬 화면에서는 이렇게 보여요</h2>
        <div className="rounded-xl bg-th-bg p-4">
          <div className="flex gap-3">
            <Avatar name="minji" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-th-text">@minji</p>
              <p className="mt-1 text-sm text-th-text">이 글 너무 공감돼요! 말씀하신 템플릿 어디서 받을 수 있나요?</p>
              <div className="mt-3 flex gap-2.5">
                <span className="mt-0.5"><ThLogo size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-semibold text-th-muted">↳ 내 답글 · AI 초안</p>
                  <div className="rounded-xl border border-th-border bg-th-surface p-3 text-sm text-th-text">
                    공감해 주셔서 감사해요 🙌 템플릿은 아래 링크에서 바로 받으실 수 있어요! https://…
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <span className="th-btn min-h-[32px] px-4 text-xs">답변제외</span>
                    <span className="th-btn-primary min-h-[32px] px-4 text-xs">답변승인 · 게시</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-th-muted">예시 화면이에요. 실제 게시는 「답변승인」을 눌렀을 때만 일어납니다.</p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-th-success/30 bg-th-success/10 p-4">
          <p className="text-sm font-bold text-th-success">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-th-text">
            <li>게시물마다 다른 링크를 넣고 싶으면 「게시물 관리」에서 게시물별 링크를 설정하세요.</li>
            <li>답글 톤과 AI 추가 지시를 정해 두면 계정 말투가 일정해져요.</li>
            <li>처음엔 「지금 새 댓글 확인하기」로 몇 번 써 보고, 익숙해지면 예약 모니터링을 켜세요.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-th-warn/40 bg-th-warn/10 p-4">
          <p className="text-sm font-bold text-th-warn">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-th-text">
            <li>Meta 앱·AI 키는 회원님 <b>본인 것</b>만 사용해요(운영자 앱·키 대신 사용 없음).</li>
            <li>게시된 답글은 공개로 남아요. 승인 전에 내용과 링크를 꼭 확인하세요.</li>
            <li>같은 문구를 반복해서 올리면 Meta 정책 위반으로 차단될 수 있어요.</li>
          </ul>
        </div>
      </div>

      <section className="th-card">
        <h2 className="th-section-title">🔑 연결 매뉴얼 (팝업으로 열려요)</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </section>

      <section className="th-card">
        <h2 className="th-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-th-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-th-text">
                <span className="mr-1 text-th-muted group-open:hidden">＋</span>
                <span className="mr-1 hidden text-th-muted group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-th-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
