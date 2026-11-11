"use client";

// D26 서류 화면 위 버튼 줄 — 인쇄 때는 숨긴다(.no-print)
export function PrintBar({ back, backLabel, extra }: { back: string; backLabel: string; extra?: React.ReactNode }) {
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2 text-sm">
      <a href={back} className="text-gray-500 hover:underline">← {backLabel}</a>
      <span className="flex-1" />
      {extra}
      <button type="button" onClick={() => window.print()} className="min-h-10 rounded bg-gray-900 px-4 text-white" data-print>
        🖨 인쇄 / PDF로 저장
      </button>
    </div>
  );
}
