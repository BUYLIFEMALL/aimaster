// 가격 변동 한눈에 보기(2026-10-25 주인님 지시: 「오를 땐 파란색 화살표 위로, 내렸을 땐 빨간 화살표 아래로, 그대로일 땐 변동 없음 이모티콘」).
// 결과 표·변동 기록 표가 같이 쓴다. 상태 글자는 확장 sheet.js/compare.js EVENT_LABEL 값(「📉 가격 내림」 등) 또는 변동 기록의 종류(priceDown 등).
const KIND: Record<string, "up" | "down" | "new" | "gone"> = {
  "📈 가격 오름": "up", priceUp: "up",
  "📉 가격 내림": "down", priceDown: "down",
  "🆕 신규": "new", new: "new",
  "👋 사라짐": "gone", gone: "gone",
};

export default function PriceChange({ status, prev }: { status: unknown; prev?: unknown }) {
  const kind = KIND[String(status ?? "")];
  const prevText = prev == null ? "" : String(prev);
  if (kind === "up") return <span className="ra-pc up" title="가격 오름"><b aria-hidden>▲</b> 오름{prevText && <small>이전 {prevText}</small>}</span>;
  if (kind === "down") return <span className="ra-pc down" title="가격 내림"><b aria-hidden>▼</b> 내림{prevText && <small>이전 {prevText}</small>}</span>;
  if (kind === "new") return <span className="ra-pc new">🆕 새 매물</span>;
  if (kind === "gone") return <span className="ra-pc gone">👋 사라짐{prevText && <small>마지막 {prevText}</small>}</span>;
  return <span className="ra-pc same" title="가격 변동 없음"><b aria-hidden>➖</b> 변동 없음</span>;
}
