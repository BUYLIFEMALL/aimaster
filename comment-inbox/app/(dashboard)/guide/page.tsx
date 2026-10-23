import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 사용 매뉴얼 — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 형식(머리 정보 → 개요 → 4단계 카드 → 상세 → 팁 → 함정 → 바로가기).
const STEPS = [
  { n: 1, icon: "🔗", title: "원래 프로그램 연결", desc: "INSTA 댓글·DM·쓰레드·유튜브 댓글 자동화에서 계정·AI 키를 한 번 연결해 둬요." },
  { n: 2, icon: "🤖", title: "AI 초안 자동 준비", desc: "원래 프로그램이 새 댓글·DM을 가져와 AI 답장 초안을 만들어 둬요." },
  { n: 3, icon: "📥", title: "한곳에서 확인", desc: "받은편지함에 급한 순서로 모여요. DM은 24시간 답장 시간이 함께 보여요." },
  { n: 4, icon: "✅", title: "고쳐서 바로 승인", desc: "「답장 쓰기」로 초안을 고치고 승인하면 실제로 게시·발송돼요." },
];

const SOURCES = [
  { name: "INSTA 댓글·DM 자동화", href: "https://instagram-comment-reply.buylife.xyz", what: "인스타 댓글 + DM" },
  { name: "쓰레드 댓글 자동화", href: "https://threads-comment-reply.buylife.xyz", what: "쓰레드 댓글" },
  { name: "유튜브 댓글 자동화", href: "https://youtube-auto-reply.buylife.xyz", what: "유튜브 댓글" },
];

const FAQ = [
  { q: "받은편지함에서 승인하면 원래 프로그램에도 반영되나요?", a: "네. 같은 기록을 「게시됨」으로 바꾸기 때문에 원래 프로그램 검토 화면과 텔레그램 승인 알림에서도 처리된 것으로 보여요. 같은 답글이 두 번 올라가지 않아요." },
  { q: "어떤 항목이 보이나요?", a: "이용 권한이 있는 원래 프로그램의 「검토 대기」 댓글·DM만 보여요. 권한이 없는 프로그램은 화면 위쪽에 안내가 나와요." },
  { q: "새 댓글은 어떻게 들어오나요?", a: "받은편지함이 직접 가져오지는 않아요. 원래 프로그램의 예약 모니터링(또는 「지금 새 댓글 확인하기」)과 DM 웹훅이 가져오고 AI 초안을 만들면 여기에 나타나요." },
  { q: "급한 순서는 어떻게 정하나요?", a: "답장 시간이 남은 DM(남은 시간 적은 순) → 댓글(오래된 순) → 답장 시간이 지난 DM 순서예요." },
];

export default async function GuidePage() {
  await requireProgramAccess();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* 머리 정보 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ig-border bg-ig-surface px-5 py-3 text-xs text-ig-muted">
        <span className="rounded-full bg-pink-500/10 px-2 py-0.5 font-bold text-pink-300">📖 사용 매뉴얼</span>
        <span>⏱ 읽는 데 약 2분</span>
        <span>· 별도 키 등록 없음(원래 프로그램 연결을 그대로 사용)</span>
      </div>

      {/* 개요 */}
      <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/15 via-rose-500/10 to-purple-600/10 p-6">
        <h1 className="text-2xl font-extrabold text-ig-text">📥 댓글·DM을 한곳에서 급한 순서로</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          인스타 댓글·DM, 쓰레드 댓글, 유튜브 댓글을 프로그램마다 따로 열지 않아도 돼요. AI가 미리 만든 답장 초안을 한 화면에서 확인하고, 고쳐서 바로 승인하면 실제 플랫폼에 게시·발송됩니다.
        </p>
      </div>

      {/* 4단계 카드 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-xl border border-ig-border bg-ig-surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-xs font-bold text-white">{s.n}</span>
              <span className="text-lg">{s.icon}</span>
            </div>
            <p className="mt-2 text-sm font-bold text-ig-text">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ig-muted">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* 상세: 원래 프로그램 */}
      <div className="rounded-2xl border border-ig-border bg-ig-surface p-5">
        <h2 className="text-base font-bold text-ig-text">1단계 자세히 — 원래 프로그램에서 한 번 연결</h2>
        <p className="mt-1 text-xs text-ig-muted">받은편지함은 아래 프로그램이 모아 둔 항목을 보여 주고, 같은 계정·토큰으로 게시해요.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {SOURCES.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noreferrer" className="rounded-xl border border-ig-border bg-ig-bg p-3 hover:border-slate-500">
              <p className="text-sm font-bold text-ig-text">{s.name} ↗</p>
              <p className="mt-0.5 text-[11px] text-ig-muted">{s.what}</p>
            </a>
          ))}
        </div>
      </div>

      {/* 팁 */}
      <div className="rounded-xl border border-ig-success/30 bg-ig-success/10 p-4 text-sm text-ig-text">
        💡 <b>팁</b> — 휴대폰에서도 같은 화면이 열려요. 4시간 안에 답장 시간이 끝나는 DM은 노란색, 이미 지난 DM은 빨간색으로 표시돼요.
      </div>

      {/* 함정 방지 */}
      <div className="rounded-xl border border-ig-warn/30 bg-ig-warn/10 p-4 text-sm leading-relaxed text-ig-text">
        ⚠️ <b>주의</b> — 「답변승인」은 실제 공개 답글·DM을 보내는 버튼이에요. 보내기 전에 초안을 꼭 읽어 주세요. 인스타 DM은 고객의 마지막 메시지로부터 24시간이 지나면 일반 답장이 막혀요. 첫 DM 답장 전에는 원래 프로그램에서 정한 「자동 응답 안내」가 먼저 한 번 나가요.
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-ig-border bg-ig-surface p-5">
        <h2 className="text-base font-bold text-ig-text">자주 묻는 질문</h2>
        <div className="mt-3 space-y-3">
          {FAQ.map((f) => (
            <div key={f.q}>
              <p className="text-sm font-semibold text-ig-text">Q. {f.q}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ig-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <Link href="/inbox" className="block rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-center text-sm font-bold text-white hover:opacity-90">
        📥 받은편지함 열기
      </Link>
    </div>
  );
}
