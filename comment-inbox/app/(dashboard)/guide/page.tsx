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

// 원래 프로그램에서 계정을 연결할 때 보는 발급·연동 매뉴얼(메인 사이트 /guides). 2026-11-13 추가
const CONNECT_GUIDES = [
  { label: "인스타그램 연동(댓글·DM)", href: "https://www.buylife.xyz/guides/4115e455-1585-4304-89b4-d29859fd7a5a" },
  { label: "쓰레드 댓글자동화 메타 앱", href: "https://www.buylife.xyz/guides/0f5cd337-1231-48c0-a9a1-63297686a97e" },
  { label: "내 유튜브 채널 연결(내 구글 앱)", href: "https://www.buylife.xyz/guides/1c4181ac-a8c4-4b11-80f4-b29f3318c39b" },
];

// 받은편지함 화면에 실제로 있는 것(2026-11-13, 코드 v1.09 기준)
const SCREEN_PARTS = [
  { icon: "🗂", title: "좌측 메뉴 필터", desc: "전체·인스타 DM·인스타 댓글·쓰레드 댓글·유튜브 댓글을 누르면 그 플랫폼만 보여요. 옆 숫자는 검토 대기 건수예요." },
  { icon: "✍️", title: "카드 펼치기 → 승인", desc: "카드의 「✍️ 답장 쓰기」를 누르면 AI 초안이 입력칸에 나와요. 고친 뒤 「✅ 답변승인 · 게시」(DM은 「발송」)를 누르면 실제로 올라가요. 승인 뒤에는 다음 항목이 자동으로 펼쳐져요." },
  { icon: "⏭", title: "건너뛰기와 되돌리기", desc: "답하지 않을 항목은 「건너뛰기」. 누른 뒤 5초 동안 아래에 「↩ 되돌리기」가 떠요. 휴대폰에서는 접힌 카드를 왼쪽으로 길게 밀어도 건너뛰기예요." },
  { icon: "⌨️", title: "키보드 단축키(PC)", desc: "J/K 또는 ↓/↑ 이동 · Enter 펼치기 · A 승인(펼친 항목만) · S 건너뛰기 · 입력칸에서 Ctrl+Enter 승인, Esc 빠져나오기. 「?」를 누르면 전체 목록이 떠요." },
  { icon: "📊", title: "오늘 답함 · 최근 7일 응대", desc: "위쪽 카드에 오늘(한국 시간) 게시·발송한 건수가, 그 아래 막대그래프에 7일치가 플랫폼별 색으로 보여요. 막대를 누르면 그날 답한 목록(💬 원래 댓글, ↪ 보낸 답장)이 열려요. 건너뛴 항목은 세지 않아요." },
  { icon: "🤖", title: "자동 수집 상태", desc: "세 댓글 프로그램의 자동 수집이 켜졌는지, 주기, 마지막 확인, 다음 예정 시각을 보여 줘요. 여기서는 보기만 하고, 켜고 끄기는 「설정 열기 ↗」로 원래 프로그램에서 해요." },
];

const FAQ = [
  { q: "받은편지함이 비어 있어요.", a: "먼저 「🤖 자동 수집 상태」 카드에서 원래 프로그램의 자동 수집이 「꺼짐」인지 확인해 주세요. 꺼져 있으면 「설정 열기 ↗」로 들어가 모니터링을 켜거나 「지금 새 댓글 확인하기」를 눌러야 항목이 생겨요. 원래 프로그램에서 계정·AI 키 연결이 안 돼 있어도 비어 있어요." },
  { q: "API 키나 계정은 어디에 등록하나요?", a: "받은편지함에는 등록 화면이 없어요. 계정 연결과 AI 키 등록은 원래 프로그램(INSTA 댓글·DM / 쓰레드 댓글 / 유튜브 댓글 자동화)에서 그 프로그램의 설정 안내대로 회원 본인 것으로 한 번만 하면, 여기서도 같은 연결로 게시해요." },
  { q: "한 플랫폼에 대기 항목이 아주 많으면 다 보이나요?", a: "플랫폼마다 최대 100건까지 보여요. 처리하면 다음 항목이 이어서 나타나요." },
  { q: "PC와 휴대폰에서 같이 써도 되나요?", a: "네. 같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓸 수 있어요. 같은 종류의 기기에서 새로 로그인하면 그 종류의 이전 로그인만 끊겨요. 두 곳에서 같은 항목을 동시에 승인해도 답글은 한 번만 올라가요." },
  { q: "비용이 드나요?", a: "받은편지함에서 승인·건너뛰기를 하는 것만으로는 AI 호출이 없어요. AI 초안은 원래 프로그램이 회원 본인 AI 키로 만들 때 그 키의 요금이 들어요." },
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
        <p className="mt-3 text-xs text-ig-muted">계정을 처음 연결한다면 아래 연동 방법을 새 창으로 열어 두고 따라 하세요(모두 회원 본인 계정·본인 앱으로 연결해요).</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONNECT_GUIDES.map((g) => (
            <a key={g.href} href={g.href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-ig-border bg-ig-bg px-3 py-1.5 text-xs font-semibold text-ig-text hover:border-slate-500">
              📖 {g.label}
            </a>
          ))}
        </div>
      </div>

      {/* 화면 살펴보기 — v1.02~v1.09에서 추가된 기능 */}
      <div className="rounded-2xl border border-ig-border bg-ig-surface p-5">
        <h2 className="text-base font-bold text-ig-text">3·4단계 자세히 — 받은편지함 화면 살펴보기</h2>
        <p className="mt-1 text-xs text-ig-muted">무엇을 누르면 무엇이 되는지 순서대로 정리했어요.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SCREEN_PARTS.map((p) => (
            <div key={p.title} className="rounded-xl border border-ig-border bg-ig-bg p-3">
              <p className="text-sm font-bold text-ig-text">{p.icon} {p.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ig-muted">{p.desc}</p>
            </div>
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
