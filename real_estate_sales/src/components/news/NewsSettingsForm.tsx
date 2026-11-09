"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { fetchNewsNowAction, saveNewsSettingsAction, type NewsActionState } from "@/lib/actions/news";

const initial: NewsActionState = {};

// RQ-C(2026-11-09). 체크박스는 비제어(defaultChecked) — AutoAnalyzeForm과 같은 이유(v1.15 반대 값 저장 문제)
export function NewsSettingsForm({ enabled, aiSummary, hasNaverKey, hasClaudeKey }: { enabled: boolean; aiSummary: boolean; hasNaverKey: boolean; hasClaudeKey: boolean }) {
  const [state, formAction, isPending] = useActionState(saveNewsSettingsAction, initial);
  const [nowState, nowAction, nowPending] = useActionState(fetchNewsNowAction, initial);

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-3">
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-mx-border bg-dark-100 p-3">
          <input type="checkbox" name="newsEnabled" defaultChecked={enabled} className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="text-sm text-mx-text">
            <span className="font-semibold">지역 뉴스 받기</span>
            <span className="mt-1 block text-mx-muted">관심 지역 앞 5곳의 개발·교통·학교·규제 소식을 매일 아침 8시 이후 한 번, 텔레그램·알림톡으로 보내요. 새 기사가 없으면 보내지 않아요.</span>
          </span>
        </label>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-mx-border bg-dark-100 p-3">
          <input type="checkbox" name="newsAiSummary" defaultChecked={aiSummary} className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="text-sm text-mx-text">
            <span className="font-semibold">🤖 AI 3줄 요약 붙이기 (선택)</span>
            <span className="mt-1 block text-mx-muted">
              하루 한 번 본인 Claude 키로 그날 소식을 요약해요(키 요금 발생, 1회 몇 원 수준).{!hasClaudeKey && " Claude 키가 아직 없어요 — 「API키등록·플랫폼연동」에서 등록해 주세요."}
            </span>
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isPending}>{isPending ? "저장 중…" : "저장"}</Button>
          {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
          {state.message && <p className="text-sm text-mx-success">{state.message}</p>}
        </div>
      </form>
      <form action={nowAction} className="flex flex-wrap items-center gap-2 border-t border-mx-border pt-3">
        <Button type="submit" variant="secondary" disabled={nowPending || !hasNaverKey}>{nowPending ? "찾는 중…(1분 안쪽)" : "🔎 지금 받아 보기"}</Button>
        <span className="text-xs text-mx-muted">알림 없이 지금 새 기사만 찾아 아래 목록에 넣어요.</span>
        {nowState.error && <p className="w-full text-sm text-mx-danger">{nowState.error}</p>}
        {nowState.message && <p className="w-full text-sm text-mx-success">{nowState.message}</p>}
      </form>
    </div>
  );
}
