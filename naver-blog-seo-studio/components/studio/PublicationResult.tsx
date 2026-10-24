import type { DraftRecord } from "./shared";

export function publicationOf(draft: DraftRecord) {
  const value = (draft.seo_report as unknown as { autoPublish?: Record<string, unknown> })?.autoPublish;
  return value && typeof value.runId === "string" ? value : null;
}
export function PublicationResult({ draft }: { draft: DraftRecord }) {
  const result = publicationOf(draft);
  if (!result) return null;
  const reserve = result.mode === "reserve";
  const labels: Record<string, string> = { writing: reserve ? "예약 포스팅 입력 중" : "자동 포스팅 입력 중", publishing: reserve ? "예약 결과 확인 중" : "발행 결과 확인 중", published: "실제 발행 완료", reserved: "예약 완료", uncertain: reserve ? "예약 결과 불확실 · 다시 예약 금지" : "발행 결과 불확실 · 재발행 금지", failed: "입력 중단 · 원고 확인 필요" };
  const url = typeof result.url === "string" && /^https:\/\/blog\.naver\.com\/[A-Za-z0-9_-]+\/\d{6,20}$/.test(result.url) ? result.url : null;
  const done = result.state === "published" || result.state === "reserved";
  return <div className="history-detail" role="status">
    <strong>{labels[String(result.state)] || "발행 기록 확인 필요"}</strong>
    {reserve && typeof result.scheduledAt === "string" && <> · 예약 시각 {new Date(result.scheduledAt).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>}
    {result.state === "published" && url && <> · <a href={url} target="_blank" rel="noreferrer">발행된 글 열기 ↗</a></>}
    {typeof result.publishedAt === "string" && <small> · {new Date(result.publishedAt).toLocaleString("ko-KR")}</small>}
    {result.state === "reserved" && <p>네이버 「예약 발행 글」 목록에서 제목과 시각을 확인했습니다. 예약을 바꾸거나 취소하려면 네이버 글쓰기 화면의 예약 목록에서 직접 하세요.</p>}
    {typeof result.error === "string" && <p>{result.error}</p>}
    {!done && <p>확장의 ‘발행 결과만 다시 확인’을 실행하세요. 같은 원고를 다시 발행하지 않습니다. 입력 전에 중단했다면 원고 확인 후 복제해 새 작업으로 시작할 수 있습니다.</p>}
  </div>;
}
