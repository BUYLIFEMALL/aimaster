// 지난 결과와 이번 결과를 매물 번호로 대조한다. 회원 PC(chrome.storage.local)에만 저장, 서버로 보내지 않는다. 기준: realty-listing-alert compare.js
// 규칙: 처음 수집한 화면은 기준만 저장 · 가격이 바뀌면 이전 가격과 함께 1번 · 사라짐은 목록을 끝까지 읽었을 때만 판단.
// 추가: 페이지 상한으로 끝까지 못 읽은 회차는 순위가 밀려 온 옛 매물이 신규처럼 보이므로, 최근 확인된 매물만 신규로 본다.

const DAY = 24 * 60 * 60 * 1000;

const ymdOf = (ms) => new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");

export function compareTarget(prevState, items, { now = Date.now(), complete = true, recentDays = 3 } = {}) {
  const prev = prevState && prevState.items ? prevState : null;
  const nextItems = {};
  const events = [];
  const nowIso = new Date(now).toISOString();
  const recentYmd = ymdOf(now - recentDays * DAY);

  for (const item of items) {
    if (!item.no) continue;
    const old = prev ? prev.items[item.no] : null;
    const entry = { price: item.price, rent: item.rent, priceText: item.priceText, firstSeen: old?.firstSeen || nowIso, lastSeen: nowIso, item };
    nextItems[item.no] = entry;
    if (!prev) continue;
    if (!old) {
      if (complete || String(item.confirmYmd) >= recentYmd) events.push({ type: "new", item, firstSeen: entry.firstSeen });
    } else if (old.price !== item.price || (old.rent ?? null) !== (item.rent ?? null)) {
      const down = (item.price ?? 0) < (old.price ?? 0) || ((item.price ?? 0) === (old.price ?? 0) && (item.rent ?? 0) < (old.rent ?? 0));
      events.push({ type: down ? "priceDown" : "priceUp", item, prevPriceText: old.priceText, firstSeen: entry.firstSeen });
    }
  }

  if (prev) {
    for (const [no, old] of Object.entries(prev.items)) {
      if (nextItems[no]) continue;
      if (complete) events.push({ type: "gone", item: old.item, prevPriceText: old.priceText, firstSeen: old.firstSeen });
      else if (now - new Date(old.lastSeen).getTime() < 30 * DAY) nextItems[no] = old;
    }
  }

  // 같은 매물을 번호만 바꿔 다시 올리면 「신규 + 사라짐」 대신 알리지 않는 「다시 올림」으로 묶는다
  const gones = events.filter((e) => e.type === "gone");
  const relisted = new Set();
  for (const e of events) {
    if (e.type !== "new") continue;
    const g = gones.find((x) => !relisted.has(x) && sameListing(x.item, e.item));
    if (!g) continue;
    relisted.add(g);
    e.type = "relisted";
    e.firstSeen = g.firstSeen;
    if (nextItems[e.item.no] && g.firstSeen) nextItems[e.item.no].firstSeen = g.firstSeen;
  }
  return {
    events: relisted.size ? events.filter((e) => !relisted.has(e)) : events,
    state: { items: nextItems, initializedAt: prev?.initializedAt || nowIso, updatedAt: nowIso },
    firstRun: !prev,
  };
}

export function sameListing(a, b) {
  if (!a || !b || !a.realtor) return false;
  return ["kind", "tradeType", "price", "rent", "area", "floor", "realtor"].every((k) => (a[k] ?? null) === (b[k] ?? null));
}

export function filterEvents(events, d) {
  return events.filter((e) => {
    if (e.type === "new") return d.notifyNew;
    if (e.type === "priceDown") return d.notifyDrop;
    if (e.type === "priceUp") return d.notifyRise;
    if (e.type === "gone") return d.notifyGone;
    return false;
  });
}

export const EVENT_LABEL = { new: "🆕 신규", priceDown: "📉 가격 내림", priceUp: "📈 가격 오름", gone: "👋 사라짐", relisted: "🔁 다시 올림", same: "" };
