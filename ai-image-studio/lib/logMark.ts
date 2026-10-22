// v1.27: 생성한 그림을 처음 다운로드하거나 바나나 캔버스로 보낼 때 그 생성 기록(`usage_logs`)에 시각을 한 번 남긴다
// (관리자 연계 통계의 「다운로드까지」·「바나나로 넘김」용). 서버가 본인 기록에만, 처음 한 번만 저장. 실패해도 다운로드·이동은 그대로
export type LogMark = "download" | "banana";
const marked = new Set<string>();

export function markLog(id: string | null | undefined, kind: LogMark) {
  if (!id || marked.has(`${id}|${kind}`)) return;
  marked.add(`${id}|${kind}`);
  void fetch("/api/gallery/mark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind }), keepalive: true }).catch(() => {});
}
