import Link from "next/link";
import { MANUAL_CAUTIONS, MANUAL_FAQ, MANUAL_STEPS, MANUAL_TIPS } from "@/lib/studio/notices";

const card = "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5";

/** 연동 & 사용 매뉴얼 — 개요, 네 단계 카드, 팁·주의, 자주 묻는 질문. 다른 화면과 같은 배경·같은 테마를 쓴다 */
export function GuideScreen() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className={card}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1">📖 사용 매뉴얼</span>
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1">⏱ 처음 설정 약 6분</span>
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1">🔑 AI 키 없이 사용</span>
        </div>
        <h1 className="mt-3 text-xl font-bold">내 PC가 그리는 무료 이미지, 네 단계면 됩니다</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">엔진을 한 번 연결해 두면, 그다음부터는 용도를 고르고 설명을 적은 뒤 「일괄 시작」 한 번으로 여러 장을 맡길 수 있습니다.</p>
        <Link href="/start" className="mt-4 inline-block rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-black">
          🚀 시작하기로 가기
        </Link>
      </header>

      <section aria-labelledby="steps-title">
        <h2 id="steps-title" className="sr-only">
          사용 순서
        </h2>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {MANUAL_STEPS.map((s) => (
            <li key={s.no} className={card}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--line)] text-2xl">
                  {s.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted)]">
                    {s.no}단계 · {s.minutes}
                  </p>
                  <h3 className="text-base font-bold">{s.title}</h3>
                </div>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                {s.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link href={s.href} className="mt-3 inline-block rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
                {s.action} →
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${card} border-emerald-500/40`} aria-labelledby="tips-title">
        <h2 id="tips-title" className="text-sm font-bold">
          💡 알아 두면 편한 점
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {MANUAL_TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className={`${card} border-amber-500/50`} aria-labelledby="caution-title">
        <h2 id="caution-title" className="text-sm font-bold">
          ⚠️ 꼭 확인해 주세요
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {MANUAL_CAUTIONS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-sm font-bold">
          자주 묻는 질문
        </h2>
        <div className="mt-2 divide-y divide-[var(--line)]">
          {MANUAL_FAQ.map((f) => (
            <details key={f.q} className="py-3">
              <summary className="cursor-pointer text-sm font-bold">{f.q}</summary>
              <p className="mt-2 text-sm text-[var(--muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
