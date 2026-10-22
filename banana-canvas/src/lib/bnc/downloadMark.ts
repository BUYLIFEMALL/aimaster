// v1.27: 결과 그림을 처음 다운로드할 때 그 결과에 「다운로드함」 시각을 한 번 남긴다(관리자 연계 통계의 다운로드 비율용).
// 저장은 서버가 본인 결과에만, 처음 한 번만 한다. 실패해도 다운로드에는 영향 없음(조용히 무시)
const marked = new Set<string>();

export function markDownloaded(id: string | null | undefined) {
  if (!id || marked.has(id)) return;
  marked.add(id);
  void fetch(`/api/history/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ downloaded: true }) }).catch(() => {});
}
