"use client";

import { useState } from "react";
import Link from "next/link";
import { registerKeywordsForAnalysisAction } from "@/lib/actions/expandSeeds";

const MAX = 10;

// 확장 결과에서 키워드를 골라 「경쟁사 분석」 키워드로 바로 등록한다(2026-10-23, v1.09). 유료 호출 없음 — 분석은 등록 뒤 직접 실행.
export function SendToAnalysis({ seedId, keywords }: { seedId: string; keywords: { keyword: string; kind: string }[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle(keyword: string) {
    setMessage(null);
    setPicked((prev) =>
      prev.includes(keyword) ? prev.filter((k) => k !== keyword) : prev.length >= MAX ? prev : [...prev, keyword],
    );
  }

  async function register() {
    setIsPending(true);
    setMessage(null);
    try {
      const result = await registerKeywordsForAnalysisAction(seedId, picked);
      if (result.error) {
        setMessage({ ok: false, text: result.error });
      } else {
        const skipped = result.skipped ? ` · ${result.skipped}개는 이미 등록돼 있어 건너뛰었어요` : "";
        setMessage({ ok: true, text: `${result.added}개를 경쟁사 분석 키워드로 등록했어요${skipped}.` });
        setPicked([]);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mx-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="mx-section-title mb-0">🔍 경쟁사 분석에 등록</h2>
        <span className="text-xs text-mx-muted">
          {picked.length}/{MAX}개 선택
        </span>
      </div>
      <p className="mb-3 text-xs text-mx-muted">
        키워드를 눌러 고른 뒤 등록하면 「경쟁사 분석」 목록에 추가됩니다. 분석(유료 호출)은 그 화면에서 「지금 분석하기」를 눌러야 시작돼요.
      </p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {keywords.map(({ keyword, kind }) => {
          const on = picked.includes(keyword);
          return (
            <button
              key={`${kind}-${keyword}`}
              type="button"
              onClick={() => toggle(keyword)}
              aria-pressed={on}
              className={`${on ? "mx-chip-blue ring-2 ring-mx-primary" : "mx-chip-amber opacity-80 hover:opacity-100"} min-h-[32px]`}
              title={kind}
            >
              {on ? "✓ " : ""}
              {keyword}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={register} disabled={isPending || picked.length === 0} className="mx-btn-primary">
          {isPending ? "등록 중…" : `🔍 선택한 ${picked.length}개 등록`}
        </button>
        {message && (
          <span className={`text-sm ${message.ok ? "text-mx-success" : "text-mx-danger"}`}>
            {message.text}{" "}
            {message.ok && (
              <Link href="/keywords" className="underline">
                경쟁사 분석으로 가기 →
              </Link>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
