import { APP_NAME, APP_VERSION } from "@/lib/version";

// 5-1 기초 단계의 자리 표시 화면. 시작하기·만들기·작업 기록은 다음 단계에서 넣는다.
export default function HomePage() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8">
      <h1 className="text-xl font-bold">
        🎨 {APP_NAME} <span className="text-sm font-normal text-[var(--muted)]">{APP_VERSION}</span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">화면을 준비하고 있습니다. 곧 이곳에서 그림 만들기를 시작하실 수 있습니다.</p>
    </section>
  );
}
