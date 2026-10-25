// 회원 본인 텔레그램 봇으로 회원 PC에서 바로 보낸다(매물이 우리 서버를 거치지 않음, 인수인계 §0).
// 같은 봇을 부동산 실거래 프로그램과 함께 쓰는 회원을 위해 앞에 머리말을 붙인다(웹 lib/delivery.ts ALERT_PREFIX와 같은 값).
import { EVENT_LABEL } from "./compare.js";
import { articleUrl, phoneText } from "./listing.js";

export const ALERT_PREFIX = "🏠 [매물 알림]";
const MAX_LINES = 15; // 텔레그램 4096자 제한 안에서 읽기 좋게

/** perTarget: [{ name, total, events: [...], firstRun, complete }] → 요약 글(HTML 없이 보통 글자) */
export function buildSummary(perTarget, { failedBefore = false, now = new Date() } = {}) {
  const time = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const lines = [`${ALERT_PREFIX} ${time}`];
  if (failedBefore) lines.push("⚠ 지난 회차 알림 보내기에 실패했어요. 이번 내용을 확인해 주세요.");
  let shown = 0;
  let hidden = 0;
  for (const t of perTarget) {
    const counts = {};
    for (const e of t.events) counts[e.type] = (counts[e.type] || 0) + 1;
    const countText = Object.entries(counts).map(([k, n]) => `${EVENT_LABEL[k]} ${n}`).join(" · ");
    lines.push("");
    lines.push(`🏢 ${t.name} — 지금 ${t.total}건${t.firstRun ? " (첫 수집: 기준으로 저장했어요)" : countText ? ` · ${countText}` : " · 변동 없음"}`);
    for (const e of t.events) {
      if (shown >= MAX_LINES) { hidden++; continue; }
      const i = e.item;
      const prev = e.prevPriceText ? ` (이전 ${e.prevPriceText})` : "";
      lines.push(`${EVENT_LABEL[e.type]} ${i.tradeName} ${i.priceText}${prev} · ${i.areaName || (i.area ? `${i.area}㎡` : "")} · ${i.dong ? `${i.dong} ` : ""}${i.floor}`);
      const tel = phoneText(i);
      if (tel) lines.push(`   📞 ${tel}`);
      lines.push(`   ${articleUrl(i.complexNo, i.no)}`);
      shown++;
    }
  }
  if (hidden) lines.push("", `…외 ${hidden}건은 첨부 파일에서 확인해 주세요.`);
  return lines.join("\n").slice(0, 4000);
}

export async function sendMessage(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`텔레그램 메시지 실패(${res.status}) ${j.description || ""}`.trim());
}

export async function sendDocument(token, chatId, bytes, filename, mime, caption) {
  const fd = new FormData();
  fd.append("chat_id", chatId);
  if (caption) fd.append("caption", caption.slice(0, 1000));
  fd.append("document", new Blob([bytes], { type: mime }), filename);
  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`텔레그램 파일 실패(${res.status}) ${j.description || ""}`.trim());
}
