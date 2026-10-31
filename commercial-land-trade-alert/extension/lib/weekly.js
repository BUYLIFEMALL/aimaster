// 주간 리포트. 기준: realty-listing-alert/extension/lib/weekly.js
// 회원이 팝업에서 켠 경우에만, 월요일 이후 첫 수집 때 7일 변화를 보낸다. 숫자는 회원 PC 기록으로만 만든다.
import { weekChanges } from "./stats.js";

const DAY = 24 * 3600 * 1000;
const KST = 9 * 3600 * 1000;
const URL_RESULTS = "https://commercial-land-trade-alert.buylife.xyz/results";

/** 이번 주 월요일(KST) 날짜 */
export function weeklyKey(now = Date.now()) {
  const kst = new Date(now + KST);
  const back = (kst.getUTCDay() + 6) % 7;
  return new Date(now + KST - back * DAY).toISOString().slice(0, 10);
}

export function shouldSendWeekly(on, sentKey, history, now = Date.now()) {
  if (!on || !Array.isArray(history) || history.length < 2) return null;
  const key = weeklyKey(now);
  return key === sentKey ? null : key;
}

const diff = (a, b) => (b - a > 0 ? `+${b - a}` : `${b - a}`);

export function buildWeeklyReport({ history, eventLog, now = Date.now() }) {
  const changes = weekChanges(history, now);
  if (!changes.length) return null;
  const to = new Date(now + KST).toISOString().slice(0, 10);
  const from = new Date(now + KST - 7 * DAY).toISOString().slice(0, 10);
  const lines = [`📅 [주간 리포트] ${from.slice(5)}~${to.slice(5)}`];
  const sum = { new: 0, priceDown: 0, priceUp: 0, gone: 0 };
  for (const c of changes) {
    for (const k of Object.keys(sum)) sum[k] += c[k];
    lines.push("", `📍 ${c.name}`, `매물 ${c.total}건(${diff(c.totalFrom, c.total)}) · 🆕 ${c.new} · 📉 ${c.priceDown} · 📈 ${c.priceUp} · 👋 ${c.gone}`);
  }
  const drops = new Map();
  for (const e of eventLog || []) if (e.type === "priceDown" && e.url) drops.set(e.url, { n: (drops.get(e.url)?.n || 0) + 1, e });
  const repeat = [...drops.values()].filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 3);
  if (repeat.length) {
    lines.push("", "📉 여러 번 내린 매물");
    for (const { n, e } of repeat) lines.push(`· ${e.kind} ${e.area}㎡ ${e.floor} ${e.price} (${n}번 내림)`);
  }
  const text = [...lines, "", `📊 자세히: ${URL_RESULTS}`].join("\n");
  return { text, kakao: `[주간 리포트] ${from.slice(5)}~${to.slice(5)}\n감시 ${changes.length}곳 · 새 매물 ${sum.new} · 내림 ${sum.priceDown} · 오름 ${sum.priceUp} · 사라짐 ${sum.gone}`.slice(0, 200), subject: `📅 [상가·건물·토지 매물] 주간 리포트 ${from.slice(5)}~${to.slice(5)}`, from, to, at: new Date(now).toISOString() };
}
