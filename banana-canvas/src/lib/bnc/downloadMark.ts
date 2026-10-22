// v1.27: 결과 그림을 처음 다운로드할 때 그 결과에 「다운로드함」 시각을 한 번 남긴다(관리자 연계 통계의 다운로드 비율용).
// v1.28: 「🔁 형식 바꾸기」·「🎬 스토리보드로」처럼 다음 단계로 넘긴 것도 같은 방식으로 한 번 남긴다(`options.handoffs`).
// 저장은 서버가 본인 결과에만, 처음 한 번만 한다. 실패해도 다운로드·이동에는 영향 없음(조용히 무시)
export type Handoff = "convert" | "storyboard";
const marked = new Set<string>();

function patchOnce(id: string | null | undefined, key: string, body: Record<string, unknown>) {
  if (!id || marked.has(`${id}|${key}`)) return;
  marked.add(`${id}|${key}`);
  void fetch(`/api/history/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
}

export function markDownloaded(id: string | null | undefined) {
  patchOnce(id, "download", { downloaded: true });
}

export function markHandoff(id: string | null | undefined, to: Handoff) {
  patchOnce(id, to, { handoff: to });
}
