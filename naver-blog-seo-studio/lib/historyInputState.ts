// 2026-11-02: 생성 기록의 상태 표시와 상태 필터가 같은 기준을 쓴다. 예전엔 입력 상태만 봐서, 확장으로 보냈지만
// 입력 전에 멈춘 원고도 「미전송」으로 나왔고, 자동 포스팅이 실패한 원고는 「재확인 필요」 필터에 잡히지 않았다.
export type HistoryInputState = "not_started" | "sent" | "in_progress" | "completed" | "publish_ready" | "failed";
type HistoryDraft = { seo_report?: unknown; naver_input_status?: Exclude<HistoryInputState, "sent"> | null; extension_handoff_at?: string | null };

export function historyRun(draft: HistoryDraft): Record<string, unknown> | null {
  const value = (draft.seo_report as { autoPublish?: Record<string, unknown> } | null | undefined)?.autoPublish;
  return value && typeof value.runId === "string" ? value : null;
}
export function historyInputState(draft: HistoryDraft): HistoryInputState {
  const run = historyRun(draft);
  if (run) return run.state === "failed" || run.state === "uncertain" ? "failed" : run.state === "published" || run.state === "reserved" ? "completed" : "in_progress";
  const status = draft.naver_input_status ?? "not_started";
  return status === "not_started" && draft.extension_handoff_at ? "sent" : status;
}
