// 카톡·이메일 받기(2026-10-25, 웹 docs/PLAN_20261025_KAKAO_EMAIL.md). 회원 PC에서 회원 본인 카카오 토큰·Resend 키로 바로 보낸다(매물이 우리 서버를 거치지 않음).
// 요청 모양은 웹 lib/notifySend.ts와 같다.
import { EVENT_LABEL } from "./compare.js";
import { ALERT_PREFIX } from "./telegram.js";
import { articleUrl } from "./listing.js";

export const RESEND_FROM = "부동산 매물 알림 <onboarding@resend.dev>";
const SITE = "https://realty-listing-alert.buylife.xyz";
const RESULT_URL = `${SITE}/dashboard`;

/** 카톡 「결과 보기」가 열 주소: 새 매물·가격 변동이 있으면 첫 매물의 네이버 화면(우리 /api/go를 거쳐 — 회원 카카오 앱엔 우리 도메인 하나만 등록), 없으면 대시보드. */
export function kakaoLinkFor(perTarget) {
  for (const t of perTarget) {
    const e = t.events.find((x) => x.type !== "gone" && x.item?.complexNo && x.item?.no);
    if (e) return `${SITE}/api/go?u=${encodeURIComponent(articleUrl(e.item.complexNo, e.item.no))}`;
  }
  return RESULT_URL;
}

/** 카톡용 짧은 요약(카카오 텍스트 템플릿 200자 제한). 엑셀은 못 붙이므로 안내 한 줄. */
export function buildKakaoText(perTarget) {
  const counts = {};
  for (const t of perTarget) for (const e of t.events) counts[e.type] = (counts[e.type] || 0) + 1;
  const countText = Object.entries(counts).map(([k, n]) => `${EVENT_LABEL[k]} ${n}`).join(" · ") || "변동 없음";
  const names = perTarget.map((t) => t.name).filter(Boolean);
  const where = names.length ? `${names[0]}${names.length > 1 ? ` 외 ${names.length - 1}곳` : ""}` : "";
  const first = perTarget.some((t) => t.firstRun) ? "\n(첫 수집은 기준으로 저장했어요)" : "";
  return `${ALERT_PREFIX} ${countText}\n${where}${first}\n엑셀은 텔레그램·이메일로 받아요.`.slice(0, 200);
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
export async function sendResendMail(apiKey, { to, subject, text, file }) {
  const body = { from: RESEND_FROM, to: [to], subject, text };
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
