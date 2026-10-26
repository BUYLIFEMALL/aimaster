// 📅 주간 리포트(2026-10-26, 확장 제안 D — 주인님 「진행해」). 회원이 고른 요일에 7일 변화를 한 장으로 보낸다.
// 숫자는 회원 PC의 기록(history·eventLog·states)으로만 만든다(서버 미경유). AI 요약은 켠 회원만 본인 키로 붙인다.
import { buildAiInput, cleanAiText } from "./aiSummary.js";
import { COLUMNS } from "./sheet.js";
import { findStale } from "./stale.js";

const DAY = 24 * 3600 * 1000;
const KST = 9 * 3600 * 1000;
export const WEEKLY_AI_MAX = 400;
export const WEEKLY_URL = "https://realty-listing-alert.buylife.xyz/results";
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 이번 주 리포트 열쇠 = 오늘(KST) 또는 그 전 가장 가까운 「고른 요일」 날짜. 이 열쇠로 이미 보냈으면 보내지 않는다 → 놓친 날은 그 주 다음 수집 때 보냄 */
export function weeklyKey(now = Date.now(), day = 1) {
  const kst = new Date(now + KST);
  const back = (kst.getUTCDay() - (Number(day) % 7) + 7) % 7;
  return new Date(now + KST - back * DAY).toISOString().slice(0, 10);
}

/** weekly: { enabled, day } (설정) · sentKey: 지난번 보낸 열쇠 · history: 통계 기록 → 보낼 열쇠 또는 null */
export function shouldSendWeekly(weekly, sentKey, history, now = Date.now()) {
  if (!weekly?.enabled) return null;
  if (!Array.isArray(history) || history.length < 2) return null;
  const key = weeklyKey(now, weekly.day ?? 1);
  return key === sentKey ? null : key;
}

/** 글자 수 제한(카톡 200자)에 걸리면 문장 끝(「다.」 등)에서 자르고 「…」을 붙인다(L, 2026-10-26 문장 중간에 끊긴 사례). 끝낼 곳이 너무 앞이면 글자 수로 자른다 */
export function cutAtSentence(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  const head = t.slice(0, max - 1);
  const end = Math.max(head.lastIndexOf("다."), head.lastIndexOf("요."), head.lastIndexOf("\n"));
  const at = end >= max * 0.4 ? (head[end] === "\n" ? end : end + 2) : max - 1;
  return `${t.slice(0, at).trimEnd()}…`;
}

const pct = (n) => (n == null ? "" : `${n > 0 ? "+" : ""}${n}%`);
const plus = (n) => (n == null ? "" : `${n > 0 ? "+" : ""}${n}`);
const md = (iso) => iso.slice(5).replace("-", ".");

/** 변동 기록에서 7일 안 「가격 내림」이 많은 매물(1년 기준 2번 이상) 상위 n */
export function topRepeatDrops(eventLog, n = 3) {
  const [u, cx, dong, area, price] = ["네이버 매물 주소", "단지명", "동", "전용면적(㎡)", "가격(만 원)"].map((c) => COLUMNS.indexOf(c));
  const by = new Map();
  for (const e of eventLog || []) {
    if (e?.type !== "priceDown" || !Array.isArray(e.row) || !e.row[u]) continue;
    const k = String(e.row[u]);
    const cur = by.get(k) || { n: 0, row: e.row, at: e.at };
    cur.n++;
    if (e.at >= cur.at) { cur.row = e.row; cur.at = e.at; }
    by.set(k, cur);
  }
  return [...by.values()].filter((x) => x.n >= 2).sort((a, b) => b.n - a.n || b.at.localeCompare(a.at)).slice(0, n)
    .map((x) => ({ complex: String(x.row[cx] ?? ""), dong: String(x.row[dong] ?? ""), area: String(x.row[area] ?? ""), price: String(x.row[price] ?? ""), drops: x.n, url: String(x.row[u]) }));
}

/** 주간 리포트 숫자·글 만들기. 기록이 없으면 null */
export function buildWeeklyReport({ history, eventLog, states, names = {}, now = Date.now(), aiText = "" }) {
  const input = buildAiInput(history, now);
  if (!input || !input.단지들.length) return null;
  const [from, to] = input.기간.split("~");
  const span = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / DAY));
  const short = span < 7 ? ` · 기록 ${span}일치 기준` : "";
  const drops = topRepeatDrops(eventLog);
  const stale = findStale(states, names, { now, minDays: 30, limit: 3 });
  const sum = { new: 0, down: 0, up: 0, gone: 0 };
  const lines = [`📅 [주간 리포트] ${md(from)}~${md(to)} (수집 ${input.기록회수}회${short})`];
  for (const c of input.단지들) {
    sum.new += c.이번주_새매물; sum.down += c.이번주_가격내림; sum.up += c.이번주_가격오름; sum.gone += c.이번주_목록에서_내려감;
    lines.push("", `🏢 ${c.단지}`,
      `매물 ${c.매물수}건${c.매물수변화 != null ? `(${plus(c.매물수변화)})` : ""}${c.매매평균가격 ? ` · 매매 평균 ${c.매매평균가격}${c.매매평균변화퍼센트 != null ? `(${pct(c.매매평균변화퍼센트)})` : ""}` : ""}`,
      `🆕 ${c.이번주_새매물} · 📉 ${c.이번주_가격내림} · 📈 ${c.이번주_가격오름} · 👋 ${c.이번주_목록에서_내려감}${c.실거래대비퍼센트 != null ? ` · 실거래 대비 ${pct(c.실거래대비퍼센트)}` : ""}`);
  }
  if (drops.length) {
    lines.push("", "📉 여러 번 내린 매물");
    for (const d of drops) lines.push(`· ${d.complex} ${d.dong} ${d.area}㎡ ${d.price} (${d.drops}번 내림)`);
  }
  if (stale.length) {
    lines.push("", "⏳ 오래 안 팔린 매물");
    for (const s of stale) lines.push(`· ${s.complex} ${s.dong} ${s.area}㎡ ${s.priceText} (${s.days}일${s.sinceStart ? " 이상" : ""})`);
  }
  const ai = cleanAiText(aiText, WEEKLY_AI_MAX);
  const text = [...lines, ...(ai ? ["", "🤖 AI 주간 요약", ai] : []), "", `📊 자세히: ${WEEKLY_URL}`].join("\n");
  const kakao = cutAtSentence(`📅 주간 리포트 ${md(from)}~${md(to)}\n단지 ${input.단지들.length}곳 · 🆕${sum.new} 📉${sum.down} 📈${sum.up} 👋${sum.gone}${ai ? `\n${ai}` : ""}`, 200);
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const html = `<div style="font-family:sans-serif;line-height:1.6">${ai ? `<div style="background:#eef6ff;border:1px solid #cfe0ff;border-radius:10px;padding:10px 14px;margin:0 0 14px"><b>🤖 AI 주간 요약</b><br>${esc(ai)}</div>` : ""}<pre style="white-space:pre-wrap;font:14px/1.6 sans-serif;margin:0">${esc(lines.join("\n"))}</pre><p><a href="${WEEKLY_URL}">📊 통계 화면에서 자세히 보기</a></p></div>`;
  return { text, kakao, html, subject: `📅 [매물 알림] 주간 리포트 ${md(from)}~${md(to)}`, from, to, at: new Date(now).toISOString() };
}

export function buildWeeklyPrompt(input, year = new Date().getFullYear()) {
  return [
    `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 모든 연도 표기는 ${year}년 기준으로 쓰고 과거 연도로 퇴행하지 마세요.]`,
    "너는 부동산 매물 알림 비서야. 아래는 회원이 감시하는 아파트 단지들의 지난 7일 네이버 매물 통계야. 가격은 이미 한국어 금액으로 적혀 있으니 그대로 옮겨 쓰고 단위를 바꾸거나 다시 계산하지 마.",
    `지난 한 주를 돌아보는 주간 정리를 한국어 존댓말 3~4문장, ${WEEKLY_AI_MAX}자 이내로 써. 단지별로 눈에 띄는 변화(매물 수 증감, 호가 오름/내림, 새 매물, 실거래 대비)를 숫자와 함께 짚고, 다음 주에 지켜볼 점을 한 문장 덧붙여. 투자 권유·단정은 하지 마. 제목·#·굵은 글씨·목록 기호 없이 평범한 문장으로만 써. 「목록에서_내려감」은 광고를 내린 것일 수도 있으니 「거래됐다」고 단정하지 마.`,
    "기록이 1~2회뿐이면 「아직 기록이 적어」라고 짧게 밝혀.",
    JSON.stringify(input),
  ].join("\n");
}

export const weekdayName = (d) => `${DAYS[Number(d) % 7] ?? "월"}요일`;
