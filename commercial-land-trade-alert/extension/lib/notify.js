// 알림 3종(텔레그램 → 이메일 → 카카오톡). 회원 PC에서 회원 본인 봇·키·토큰으로 바로 보낸다. 매물은 우리 서버를 거치지 않는다.
import { EVENT_LABEL } from "./compare.js";

export const ALERT_PREFIX = "🏢 [상가·건물·토지 매물]";
const SITE = "https://commercial-land-trade-alert.buylife.xyz";
const MAX_LINES = 15;
const SHORT = { new: "신규", priceDown: "가격 내림", priceUp: "가격 오름", gone: "사라짐" };
const kstTime = (now) => now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function countText(perTarget) {
  const counts = {};
  for (const t of perTarget) for (const e of t.events) counts[e.type] = (counts[e.type] || 0) + 1;
  return Object.entries(counts).map(([k, n]) => `${SHORT[k] || k} ${n}`).join(" · ");
}

const areaText = (i) => (i.area ? `${i.areaLabel} ${i.area}㎡` : "");

function itemLine(e) {
  const i = e.item;
  const prev = e.prevPriceText ? ` (이전 ${e.prevPriceText})` : "";
  return `${EVENT_LABEL[e.type]} ${i.kindName} ${i.tradeName} ${i.priceText}${prev} · ${[areaText(i), i.floor].filter(Boolean).join(" · ")}`;
}

/** perTarget: [{ name, total, events, firstRun, complete, pagesRead }] */
export function buildSummary(perTarget, { failedBefore = false, now = new Date() } = {}) {
  const lines = [`${ALERT_PREFIX} ${kstTime(now)}`];
  if (failedBefore) lines.push("⚠ 지난 회차 알림 보내기에 실패했어요. 이번 내용을 확인해 주세요.");
  let shown = 0;
  let hidden = 0;
  for (const t of perTarget) {
    const c = countText([t]);
    lines.push("", `📍 ${t.name} — 지금 ${t.total}건${t.firstRun ? " (첫 수집: 기준으로 저장했어요)" : c ? ` · ${c}` : " · 변동 없음"}`);
    if (!t.complete) lines.push(`   ⚠ 범위가 넓어 앞 ${t.pagesRead}페이지만 읽었어요. 네이버 화면 필터를 좁히면 정확해져요.`);
    for (const e of t.events) {
      if (shown >= MAX_LINES) { hidden++; continue; }
      lines.push(itemLine(e));
      if (e.item.url) lines.push(`   ${e.item.url}`);
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

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MAIL_COLOR = { new: "#0b7a3e", priceDown: "#1d4ed8", priceUp: "#b45309", gone: "#6b7280" };

export function buildMailSubject(perTarget, { now = new Date() } = {}) {
  const total = perTarget.reduce((n, t) => n + (t.total || 0), 0);
  const ct = countText(perTarget) || (perTarget.some((t) => t.firstRun) ? "첫 수집(기준 저장)" : "변동 없음");
  return `${ALERT_PREFIX} ${ct} · 매물 ${total.toLocaleString("ko-KR")}건 (${kstTime(now)})`;
}

export function buildMailHtml(perTarget, { now = new Date(), maxRows = 200 } = {}) {
  const td = "padding:8px 10px;border-bottom:1px solid #eef0f3;font-size:13px;vertical-align:top;";
  const th = "padding:8px 10px;background:#f2fbf6;text-align:left;font-size:12px;color:#334155;border-bottom:1px solid #e2e6ee;";
  let shown = 0;
  let hidden = 0;
  const sections = perTarget.map((t) => {
    const state = t.firstRun ? "첫 수집 — 기준으로 저장했어요" : countText([t]) || "변동 없음";
    const rows = t.events.map((e) => {
      if (shown >= maxRows) { hidden++; return ""; }
      shown++;
      const i = e.item || {};
      return `<tr><td style="${td}"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${MAIL_COLOR[e.type] || "#334155"};color:#fff;font-size:12px;font-weight:700;white-space:nowrap;">${esc(SHORT[e.type] || e.type)}</span></td><td style="${td}"><b>${esc(i.kindName)} ${esc(i.tradeName)} ${esc(i.priceText)}</b>${e.prevPriceText ? `<br><span style="color:#6b7280;">이전 ${esc(e.prevPriceText)}</span>` : ""}</td><td style="${td}">${esc(areaText(i))}<br><span style="color:#6b7280;">${esc(i.floor)}</span></td><td style="${td}">${esc(i.realtor)}</td><td style="${td}">${i.url ? `<a href="${esc(i.url)}" style="color:#009b4d;font-weight:700;">네이버에서 보기</a>` : ""}</td></tr>`;
    }).join("");
    return `<div style="margin:18px 0;border:1px solid #e2e6ee;border-radius:14px;overflow:hidden;"><div style="padding:12px 14px;border-bottom:1px solid #eef0f3;"><b style="font-size:15px;">📍 ${esc(t.name)}</b> <span style="color:#5b6475;font-size:13px;">지금 ${esc(t.total)}건 · ${esc(state)}</span></div>${rows ? `<table role="presentation" style="width:100%;border-collapse:collapse;"><thead><tr><th style="${th}">변동</th><th style="${th}">거래·가격</th><th style="${th}">면적·층</th><th style="${th}">중개사</th><th style="${th}">링크</th></tr></thead><tbody>${rows}</tbody></table>` : ""}</div>`;
  }).join("");
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f6f7f9;"><div style="max-width:720px;margin:0 auto;padding:24px 16px;font-family:Arial,'Noto Sans KR',sans-serif;color:#0f172a;"><div style="background:#fff;border:1px solid #e2e6ee;border-radius:18px;padding:22px;"><div style="font-size:12px;font-weight:800;color:#009b4d;">상가·건물·토지 매물 알림 · ${esc(kstTime(now))}</div><h1 style="margin:8px 0 4px;font-size:22px;">${esc(countText(perTarget) || "변동 없음")}</h1>${sections}${hidden ? `<p style="color:#5b6475;font-size:13px;">…외 ${hidden}건은 첨부 파일에서 확인해 주세요.</p>` : ""}<p style="margin:14px 0 0;color:#8a93a3;font-size:12px;">회원님 PC에서 바로 보낸 메일이며 매물 정보를 우리 서버에 저장하지 않아요.</p></div></div></body></html>`;
}

function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function sendResendMail(apiKey, { to, subject, text, html, file }) {
  const body = { from: "상가·건물·토지 매물 알림 <onboarding@resend.dev>", to: [to], subject, text };
  if (html) body.html = html;
  if (file) body.attachments = [{ filename: file.filename, content: toBase64(file.bytes) }];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`메일 보내기 실패(${res.status}) ${j.message || ""}`.trim());
  }
}

/** 카톡은 200자 제한이고 일부 그림문자를 네모로 그려서 글자만 쓴다 */
export function buildKakaoText(perTarget) {
  const changed = perTarget.filter((t) => t.events?.length && t.name);
  const where = changed.length ? `${changed[0].name}${changed.length > 1 ? ` 외 ${changed.length - 1}곳` : ""} 변동` : `감시 ${perTarget.length}곳`;
  const first = perTarget.some((t) => t.firstRun) ? "\n(첫 수집은 기준으로 저장했어요)" : "";
  return `[상가·건물·토지 매물] ${countText(perTarget) || "변동 없음"}\n${where}${first}\n파일은 텔레그램·이메일로 받아요.`.slice(0, 200);
}

/** 카톡 링크는 회원 카카오 앱에 등록한 도메인만 열려서 우리 /api/go를 거쳐 네이버로 넘긴다 */
export function kakaoLinkFor(perTarget) {
  const e = perTarget.flatMap((t) => t.events || []).find((x) => x.item?.url);
  return e ? `${SITE}/api/go?u=${encodeURIComponent(e.item.url)}` : `${SITE}/watch`;
}

export async function sendKakaoMemo(accessToken, text, url = `${SITE}/watch`, buttonTitle = "매물 보기") {
  const template = { object_type: "text", text: text.slice(0, 200), link: { web_url: url, mobile_web_url: url }, button_title: buttonTitle };
  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }).toString(),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`카카오 보내기 실패(${res.status}) ${j.msg || ""}`.trim());
  }
}
