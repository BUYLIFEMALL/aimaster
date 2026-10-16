import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { StudioHeader, Avatar } from "@/components/ui/StudioHeader";
import { YtLogo } from "@/components/ui/YtLogo";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  { icon: "☁️", title: "구글 앱 만들기", desc: "Google Cloud에서 OAuth 클라이언트를 만들고 리디렉션 주소 등록", time: "약 10분", href: "/settings" },
  { icon: "📺", title: "채널 연결", desc: "Client ID/Secret 등록 → 「채널 연결」로 내 유튜브 채널 허용", time: "1분", href: "/settings" },
  { icon: "🤖", title: "AI 키·말투", desc: "OpenAI·Claude·Gemini 중 하나의 본인 키 + 답글 톤·기본 링크", time: "3분", href: "/settings" },
  { icon: "🎬", title: "영상 동기화", desc: "채널 영상 불러오기 → 답글 달 영상만 켜 두기 · 예약 모니터링", time: "1분", href: "/videos" },
  { icon: "✅", title: "검토 후 게시", desc: "AI 초안을 고쳐 「답변승인」 또는 텔레그램 버튼으로 승인", time: "수시", href: "/comments" },
];

const FAQ = [
  {
    q: "AI가 답글을 마음대로 올리나요?",
    a: "아니요. 기본은 사람이 「답변승인」을 눌러야만 게시됩니다(유튜브 개발자 정책). 설정에서 위험 안내에 동의하고 「자동 게시」를 직접 켠 경우에만 검토 없이 올라갑니다.",
  },
  {
    q: "비용은 얼마나 드나요?",
    a: "유튜브 연결은 무료(구글이 주는 하루 사용량 안에서)이고, 답글 초안은 회원님 본인 AI 키로 만들어 댓글 1개당 아주 적은 요금이 해당 AI 회사에 청구됩니다. 가성비 모델을 고르면 더 저렴해요.",
  },
  {
    q: "내 채널에 내가 단 댓글에도 답글을 다나요?",
    a: "아니요. 채널 주인이 직접 단 댓글은 자동으로 빼고, 다른 사람이 단 새 댓글에만 초안을 만듭니다.",
  },
  {
    q: "예약 모니터링은 어떻게 동작해요?",
    a: "정해 둔 주기(5분~24시간)마다 새 댓글을 확인해 초안을 만들어 둡니다. 켠 시점 이후의 댓글만 대상이라, 예전 댓글이 한꺼번에 몰려오지 않아요.",
  },
  {
    q: "텔레그램 승인 버튼이 반응하지 않아요.",
    a: "설정 화면의 「승인 버튼이 안 눌러지면: 웹훅 재등록」 버튼을 눌러 주세요. 초안을 고쳐야 할 때는 웹 화면의 「댓글 검토/게시」에서 수정 후 승인하면 됩니다.",
  },
];

const GUIDE_LINKS = [
  { guideId: "523e7401-7393-44f5-ba45-dd437e10fa2d", label: "Google OAuth 클라이언트 만들기" },
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
        <Link href="/settings" className="yt-btn-red">
          🔑 연결 시작하기
        </Link>
      </StudioHeader>

      {/* 캐릭터 말풍선 */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yt-red text-2xl">🤖</div>
        <div className="yt-card rounded-tl-none p-4">
          <p className="text-sm leading-relaxed text-yt-text">
            안녕하세요, 댓글 비서예요! 채널에 새 댓글이 달리면 제가 읽고 <b>자연스러운 답글 초안</b>(원하는 링크 포함)을 써 둘게요.
            회원님은 <b>확인하고 「답변승인」만</b> 누르시면 돼요. 텔레그램을 연결하면 휴대폰에서도 바로 승인할 수 있어요.
          </p>
        </div>
      </div>

      {/* 5단계 */}
      <section className="yt-card">
        <h2 className="yt-section-title">🧭 시작하기 5단계</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-yt-border bg-yt-raised p-4 transition-colors hover:border-yt-red"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yt-red text-xs font-bold text-white">{i + 1}</span>
                  <span className="yt-chip px-2 py-0.5 text-[10px]">⏱ {s.time}</span>
                </div>
                <span className="mt-3 text-3xl">{s.icon}</span>
                <span className="mt-2 text-sm font-bold text-yt-text">{s.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-yt-muted">{s.desc}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-yt-red md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 댓글 → 초안 → 승인 미리보기 */}
      <section className="yt-card">
        <h2 className="yt-section-title">💬 화면에서는 이렇게 보여요</h2>
        <div className="rounded-xl bg-yt-bg p-4">
          <div className="flex gap-3">
            <Avatar name="민지" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-yt-text">@민지</p>
              <p className="mt-1 text-sm text-yt-text">영상 잘 봤어요! 소개하신 제품 어디서 살 수 있나요?</p>
              <div className="mt-3 flex gap-2.5">
                <YtLogo size={16} />
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-semibold text-yt-muted">↳ 내 채널 답글 · AI 초안</p>
                  <div className="rounded-xl border border-yt-border bg-yt-surface p-3 text-sm text-yt-text">
                    봐 주셔서 감사해요 😊 영상 속 제품은 아래 링크에서 확인하실 수 있어요! https://…
                  </div>
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <span className="yt-btn min-h-[32px] px-4 text-xs">답변제외</span>
                    <span className="yt-btn-red min-h-[32px] px-4 text-xs">답변승인 · 게시</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-yt-muted">예시 화면이에요. 실제 게시는 「답변승인」을 눌렀을 때만 일어납니다.</p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-yt-success/30 bg-yt-success/10 p-4">
          <p className="text-sm font-bold text-yt-success">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-yt-text">
            <li>영상마다 다른 링크를 넣고 싶으면 「영상 관리」에서 영상별 「링크 설정」을 쓰세요.</li>
            <li>답글 톤(친근·정중·유머 등)과 AI 추가 지시를 정해 두면 채널 말투가 일정해져요.</li>
            <li>처음엔 「지금 새 댓글 확인하기」로 몇 번 써 보고, 익숙해지면 예약 모니터링을 켜세요.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-yt-warn/40 bg-yt-warn/10 p-4">
          <p className="text-sm font-bold text-yt-warn">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-yt-text">
            <li>구글 앱·AI 키는 회원님 <b>본인 것</b>만 사용해요(운영자 키 대신 사용 없음).</li>
            <li>게시된 답글은 유튜브에 공개로 남아요. 승인 전에 내용과 링크를 꼭 확인하세요.</li>
            <li>같은 문구·링크를 너무 많이 반복하면 유튜브에서 스팸으로 볼 수 있어요.</li>
          </ul>
        </div>
      </div>

      <section className="yt-card">
        <h2 className="yt-section-title">🔑 연결 매뉴얼 (팝업으로 열려요)</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </section>

      <section className="yt-card">
        <h2 className="yt-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-yt-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-yt-text">
                <span className="mr-1 text-yt-red group-open:hidden">＋</span>
                <span className="mr-1 hidden text-yt-red group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-yt-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
