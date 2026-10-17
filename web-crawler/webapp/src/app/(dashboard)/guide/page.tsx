import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/ui/PageHero";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼 (2026-10-17 디자인 리뉴얼 신설) — 화면 문구는 새 작업·작업 목록 화면의 실제 문구와 맞춘다.
const STEPS = [
  { icon: "🔑", title: "AI 키 등록", desc: "OpenAI·Claude·Gemini·Perplexity 중 하나 이상 본인 키를 등록해요. 페이지에서 항목을 찾아내는 데 쓰여요.", time: "3분", href: "/settings" },
  { icon: "➕", title: "주소·항목 입력", desc: "「새 작업 만들기」에 사이트 주소와 모을 항목(예: 상품명, 가격, 링크)을 적고 AI 모델을 고릅니다.", time: "1분", href: "/jobs/new" },
  { icon: "🕷️", title: "자동 수집", desc: "작업 목록에서 상태가 「대기 중 → 수집 중」으로 바뀌며 진행돼요. 화면을 닫아도 계속됩니다.", time: "수 분", href: "/jobs" },
  { icon: "⚠️", title: "확인 필요 처리", desc: "사이트가 자동 접속을 막으면 멈추고 알려 드려요. 「우회해서 계속 진행」 또는 그만두기를 직접 고릅니다.", time: "필요 시", href: "/jobs" },
  { icon: "📊", title: "엑셀 받기", desc: "「완료」가 되면 「엑셀 다운로드」 버튼이 나타나요. 모은 행 수도 함께 표시됩니다.", time: "바로", href: "/jobs" },
];

const STATUSES = [
  { chip: "bg-mx-raised text-mx-muted", label: "대기 중", desc: "작업이 접수되어 곧 수집을 시작해요." },
  { chip: "bg-mx-primary/15 text-mx-link", label: "수집 중", desc: "사이트를 둘러보며 항목을 모으는 중이에요." },
  { chip: "bg-mx-accent/15 text-mx-accent", label: "확인 필요", desc: "사이트가 접속을 막았어요. 계속할지 회원님이 골라 주세요." },
  { chip: "bg-mx-success/15 text-mx-success", label: "완료", desc: "엑셀을 받을 수 있어요." },
  { chip: "bg-mx-danger/15 text-mx-danger", label: "실패", desc: "오류 내용을 확인하고 주소·항목을 바꿔 다시 시도해 보세요." },
];

const FAQ = [
  {
    q: "어떤 사이트든 다 모을 수 있나요?",
    a: "공개된 페이지라면 대부분 가능하지만, 로그인이 필요하거나 자동 접속을 강하게 막는 사이트는 실패할 수 있어요. 막히면 「확인 필요」로 멈추고 계속할지 여쭤봅니다. 성공을 보장하지는 않아요.",
  },
  {
    q: "「개인정보가 포함됐을 수 있어요」 경고가 떠요.",
    a: "모은 데이터에 전화번호·이메일 같은 개인정보로 보이는 값이 섞이면 표시돼요. 개인정보는 수집·보관·이용에 법적 책임이 따르니, 필요 없는 항목이면 빼고 다시 수집해 주세요.",
  },
  {
    q: "비용은 얼마나 드나요?",
    a: "페이지 분석은 회원님 본인 AI 키로 이루어져 해당 AI 회사에 요금이 청구됩니다. 고른 모델과 모으는 양(최대 행 수)에 따라 달라져요.",
  },
  {
    q: "수집한 결과는 다른 회원도 볼 수 있나요?",
    a: "아니요. 작업과 결과는 회원님 본인에게만 보입니다. 필요한 엑셀은 미리 내려받아 두세요.",
  },
];

const GUIDE_LINKS = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키" },
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        badge="📖 연동 & 사용 매뉴얼"
        title="5단계로 끝내는 웹 데이터 수집"
        description="AI 키는 처음 한 번만 등록하면 됩니다. 그다음부터는 주소와 항목만 적으면 돼요."
      >
        <Link href="/settings" className="mx-btn-primary">
          🔑 연결 시작하기
        </Link>
      </PageHero>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mx-primary text-2xl">🕷️</div>
        <div className="mx-card rounded-tl-none">
          <p className="text-sm leading-relaxed text-mx-text">
            안녕하세요, 수집 비서예요! 사이트 주소와 <b>모을 항목</b>만 알려 주시면 페이지를 둘러보며 <b>표로 정리</b>해 드릴게요.
            사이트가 막으면 <b>멈추고 먼저 여쭤보고</b>, 다 모이면 <b>엑셀</b>로 받을 수 있게 준비해 둘게요.
          </p>
        </div>
      </div>

      <section className="mx-card">
        <h2 className="mx-section-title">🧭 사용 순서</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-4 transition-colors hover:border-mx-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mx-primary text-xs font-bold text-white">{i + 1}</span>
                  <span className="mx-chip">⏱ {s.time}</span>
                </div>
                <span className="mt-3 text-3xl">{s.icon}</span>
                <span className="mt-2 text-sm font-bold text-mx-text">{s.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-mx-muted">{s.desc}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-mx-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-card">
        <h2 className="mx-section-title">🚦 작업 상태 보는 법</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {STATUSES.map((s) => (
            <li key={s.label} className="rounded-xl bg-mx-raised p-3">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${s.chip}`}>{s.label}</span>
              <p className="mt-2 text-xs leading-relaxed text-mx-muted">{s.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-mx-success/30 bg-mx-success/10 p-4">
          <p className="text-sm font-bold text-mx-success">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-mx-text">
            <li>항목 이름은 화면에 보이는 그대로 적으면 잘 찾아요(예: 「상품명」, 「판매가」).</li>
            <li>처음엔 최대 행 수를 작게 잡아 결과를 확인한 뒤 늘리면 비용을 아낄 수 있어요.</li>
            <li>목록 페이지 주소를 넣으면 여러 개를 한 번에 모으기 좋아요.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-mx-accent/40 bg-mx-accent/10 p-4">
          <p className="text-sm font-bold text-mx-accent">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-mx-text">
            <li>AI 키는 회원님 <b>본인 것</b>만 사용해요(운영자 키 대신 사용 없음).</li>
            <li>대상 사이트의 이용약관·robots.txt를 확인하고, 허용된 범위에서만 수집해 주세요.</li>
            <li>개인정보·저작물을 대량으로 모아 재배포하는 용도로는 쓰지 마세요.</li>
          </ul>
        </div>
      </div>

      <section className="mx-card">
        <h2 className="mx-section-title">🔑 키 발급 매뉴얼 (팝업으로 열려요)</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </section>

      <section className="mx-card">
        <h2 className="mx-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-mx-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-mx-text">
                <span className="mr-1 text-mx-muted group-open:hidden">＋</span>
                <span className="mr-1 hidden text-mx-muted group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-mx-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
