// 카톡·이메일 받기(2026-10-25, 웹 docs/PLAN_20261025_KAKAO_EMAIL.md). 회원 PC에서 회원 본인 카카오 토큰·Resend 키로 바로 보낸다(매물이 우리 서버를 거치지 않음).
// 요청 모양은 웹 lib/notifySend.ts와 같다.
import { EVENT_LABEL } from "./compare.js";
import { ALERT_PREFIX } from "./telegram.js";
import { articleUrl, phoneText } from "./listing.js";

const KAKAO_LABEL = { new: "신규", priceDown: "가격 내림", priceUp: "가격 오름", gone: "사라짐" };

export const RESEND_FROM = "부동산 실시간 매물 알림 <onboarding@resend.dev>";
const SITE = "https://realty-listing-alert.buylife.xyz";
const RESULT_URL = `${SITE}/dashboard#results`;

/** 카톡 「결과 보기」가 열 주소: 새 매물·가격 변동이 있으면 첫 매물의 네이버 화면(우리 /api/go를 거쳐 — 회원 카카오 앱엔 우리 도메인 하나만 등록), 없으면 대시보드. */
export function kakaoLinkFor(perTarget) {
  for (const t of perTarget) {
    const e = t.events.find((x) => x.type !== "gone" && x.item?.complexNo && x.item?.no);
    if (e) return `${SITE}/api/go?u=${encodeURIComponent(articleUrl(e.item.complexNo, e.item.no))}`;
  }
  return RESULT_URL;
}

/** 카톡용 짧은 요약(카카오 텍스트 템플릿 200자 제한). 엑셀은 못 붙이므로 안내 한 줄. */
/** 「신규 2 · 가격 내림 1」 — 변동이 없으면 빈 글자 */
function countText(perTarget) {
  const counts = {};
  for (const t of perTarget) for (const e of t.events) counts[e.type] = (counts[e.type] || 0) + 1;
  return Object.entries(counts).map(([k, n]) => `${KAKAO_LABEL[k] || EVENT_LABEL[k]} ${n}`).join(" · ");
}

export function buildKakaoText(perTarget) {
  // 카톡은 🆕 같은 일부 그림문자를 네모로 그려서(2026-10-25 실물) 글자만 쓴다
  const countText_ = countText(perTarget) || "변동 없음";
  const names = perTarget.map((t) => t.name).filter(Boolean);
  const where = names.length ? `${names[0]}${names.length > 1 ? ` 외 ${names.length - 1}곳` : ""}` : "";
  const first = perTarget.some((t) => t.firstRun) ? "\n(첫 수집은 기준으로 저장했어요)" : "";
  return `${ALERT_PREFIX} ${countText_}\n${where}${first}\n엑셀은 텔레그램·이메일로 받아요.`.slice(0, 200);
}

export async function sendKakaoMemo(accessToken, text, url = RESULT_URL) {
  const template = { object_type: "text", text: text.slice(0, 200), link: { web_url: url, mobile_web_url: url }, button_title: "결과 보기" };
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

function toBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

/** Resend로 메일 보내기. file: { bytes: Uint8Array, filename } (선택) */
const kstTime = (now) => now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

/** 메일 제목: 건수가 먼저 보이게(2026-10-25 주인님 「메일 제목에 건수 표시」) — 「🏠 [매물 알림] 신규 2 · 가격 내림 1 · 매물 748건 (10. 25. 15:03)」 */
export function buildMailSubject(perTarget, { now = new Date() } = {}) {
  const total = perTarget.reduce((n, t) => n + (t.total || 0), 0);
  const ct = countText(perTarget) || (perTarget.some((t) => t.firstRun) ? "첫 수집(기준 저장)" : "변동 없음");
  return `${ALERT_PREFIX} ${ct} · 매물 ${total.toLocaleString("ko-KR")}건 (${kstTime(now)})`;
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MAIL_COLOR = { new: "#0b7a3e", priceDown: "#1d4ed8", priceUp: "#b45309", gone: "#6b7280" };

/** 메일 HTML 본문(2026-10-25 주인님 「메일 본문을 보기 좋게 꾸민 형식」) — 메일 프로그램용이라 스타일은 태그 안에 직접. 매물 글자는 모두 이스케이프. */
export function buildMailHtml(perTarget, { now = new Date(), maxRows = 200 } = {}) {
  const total = perTarget.reduce((n, t) => n + (t.total || 0), 0);
  const ct = countText(perTarget) || "변동 없음";
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
      const tel = phoneText(i);
      const url = i.complexNo && i.no ? articleUrl(i.complexNo, i.no) : "";
      return `<tr>
<td style="${td}"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${MAIL_COLOR[e.type] || "#334155"};color:#fff;font-size:12px;font-weight:700;white-space:nowrap;">${esc(KAKAO_LABEL[e.type] || e.type)}</span></td>
<td style="${td}"><b>${esc(i.tradeName)} ${esc(i.priceText)}</b>${e.prevPriceText ? `<br><span style="color:#6b7280;">이전 ${esc(e.prevPriceText)}</span>` : ""}${i.tradeGap ? `<br><span style="color:#6b7280;">실거래 대비 ${esc(i.tradeGap)}</span>` : ""}${i.bargain ? `<br><span style="color:#dc2626;font-weight:700;">${esc(i.bargain)} 급매</span>` : ""}</td>
<td style="${td}">${esc(i.areaName || (i.area ? `${i.area}㎡` : ""))}<br><span style="color:#6b7280;">${esc(i.dong)} ${esc(i.floor)}</span></td>
<td style="${td}">${esc(i.realtor)}${tel ? `<br><span style="color:#6b7280;">📞 ${esc(tel)}</span>` : ""}</td>
<td style="${td}">${url ? `<a href="${esc(url)}" style="color:#009b4d;font-weight:700;">네이버에서 보기</a>` : ""}</td>
</tr>`;
    }).join("");
    return `<div style="margin:18px 0;border:1px solid #e2e6ee;border-radius:14px;overflow:hidden;">
<div style="padding:12px 14px;background:#fff;border-bottom:1px solid #eef0f3;"><b style="font-size:15px;">🏢 ${esc(t.name)}</b> <span style="color:#5b6475;font-size:13px;">지금 ${esc(t.total)}건 · ${esc(state)}</span></div>
${rows ? `<table role="presentation" style="width:100%;border-collapse:collapse;"><thead><tr><th style="${th}">변동</th><th style="${th}">거래·가격</th><th style="${th}">면적·위치</th><th style="${th}">중개사</th><th style="${th}">링크</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
</div>`;
  }).join("");
  return `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#f6f7f9;">
<div style="max-width:720px;margin:0 auto;padding:24px 16px;font-family:Arial,'Noto Sans KR',sans-serif;color:#0f172a;">
<div style="background:#ffffff;border:1px solid #e2e6ee;border-radius:18px;padding:22px;">
<div style="font-size:12px;font-weight:800;color:#009b4d;letter-spacing:.04em;">부동산 실시간 매물 알림 · ${esc(kstTime(now))}</div>
<h1 style="margin:8px 0 4px;font-size:22px;">${esc(ct)}</h1>
<div style="color:#5b6475;font-size:13px;">감시 단지 ${perTarget.length}곳 · 지금 매물 ${esc(total.toLocaleString("ko-KR"))}건</div>
${sections}
${hidden ? `<p style="color:#5b6475;font-size:13px;">…외 ${hidden}건은 첨부한 엑셀 파일에서 확인해 주세요.</p>` : ""}
<p style="margin:18px 0 0;"><a href="${SITE}/results" style="display:inline-block;padding:11px 16px;border-radius:10px;background:#03c75a;color:#fff;text-decoration:none;font-weight:800;">📊 통계·변동 기록 보기</a></p>
<p style="margin:14px 0 0;color:#8a93a3;font-size:12px;">전체 매물은 첨부한 엑셀 파일에 있어요. 매물 정보는 회원님 PC에서 바로 보낸 것이며 우리 서버에 저장하지 않아요.</p>
</div></div></body></html>`;
}

export async function sendResendMail(apiKey, { to, subject, text, html, file }) {
  const body = { from: RESEND_FROM, to: [to], subject, text };
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
