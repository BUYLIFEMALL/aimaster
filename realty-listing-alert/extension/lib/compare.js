// 지난 결과와 이번 결과를 매물 번호(articleNo)로 대조한다 — 확장 안(chrome.storage.local)에만 저장, 서버로 보내지 않는다.
// 단지(complexNo)마다 상태 하나: { items: { [no]: { price, rent, priceText, firstSeen, lastSeen, item } }, initializedAt }
// 규칙: 처음 수집한 단지는 기준만 저장(전부 「신규」로 알리지 않음) · 가격이 바뀌면 이전 가격과 함께 1번 · 사라짐은
//       목록을 끝까지 읽었을 때만 판단(페이지 상한에 걸리면 사라짐 판단 안 함) · 30일 넘게 안 보인 기록은 정리.

const DAY = 24 * 60 * 60 * 1000;

export function compareComplex(prevState, items, { now = Date.now(), complete = true } = {}) {
  const prev = prevState && prevState.items ? prevState : null;
  const nextItems = {};
  const events = [];
  const nowIso = new Date(now).toISOString();

  for (const item of items) {
    if (!item.no) continue;
    const old = prev ? prev.items[item.no] : null;
    const entry = { price: item.price, rent: item.rent, priceText: item.priceText, firstSeen: old?.firstSeen || nowIso, lastSeen: nowIso, item };
    nextItems[item.no] = entry;
    if (!prev) continue; // 첫 수집: 기준만 저장
    if (!old) {
      events.push({ type: "new", item, firstSeen: entry.firstSeen });
    } else if (old.price !== item.price || (old.rent ?? null) !== (item.rent ?? null)) {
      const down = (item.price ?? 0) < (old.price ?? 0) || ((item.price ?? 0) === (old.price ?? 0) && (item.rent ?? 0) < (old.rent ?? 0));
      events.push({ type: down ? "priceDown" : "priceUp", item, prevPriceText: old.priceText, firstSeen: entry.firstSeen });
    }
  }

  if (prev) {
    for (const [no, old] of Object.entries(prev.items)) {
      if (nextItems[no]) continue;
      if (complete) {
        events.push({ type: "gone", item: old.item, prevPriceText: old.priceText, firstSeen: old.firstSeen });
      } else if (now - new Date(old.lastSeen).getTime() < 30 * DAY) {
        nextItems[no] = old; // 끝까지 못 읽은 회차: 판단 보류하고 유지
      }
    }
  }

  // J(2026-10-26): 중개사가 같은 매물을 번호만 바꿔 다시 올리면 「신규 + 사라짐」 2건 대신 「🔁 다시 올림」 1건(알림 안 함). 처음 발견일은 예전 매물 것을 잇는다.
  const gones = events.filter((e) => e.type === "gone");
  const relisted = new Set();
  for (const e of events) {
    if (e.type !== "new") continue;
    const g = gones.find((x) => !relisted.has(x) && sameListing(x.item, e.item));
    if (!g) continue;
    relisted.add(g);
    e.type = "relisted";
    e.prevNo = g.item.no;
    e.firstSeen = g.firstSeen;
    if (nextItems[e.item.no] && g.firstSeen) nextItems[e.item.no].firstSeen = g.firstSeen;
  }
  const outEvents = relisted.size ? events.filter((e) => !relisted.has(e)) : events;

  return { events: outEvents, state: { items: nextItems, initializedAt: prev?.initializedAt || nowIso, updatedAt: nowIso }, firstRun: !prev };
}

/** 같은 매물을 다시 올린 것인지 — 단지·동·거래 종류·가격·월세·면적·층·중개사가 모두 같고 비어 있지 않을 때만 */
export function sameListing(a, b) {
  if (!a || !b || !a.realtor || !a.floor) return false;
  return ["complexNo", "dong", "tradeType", "price", "rent", "area", "floor", "realtor"].every((k) => (a[k] ?? null) === (b[k] ?? null));
}

/** 회원 알림 기준으로 거른다(같은 매물은 같은 일로 1번만 — compareComplex가 바뀐 때만 내므로 보장됨). */
export function filterEvents(events, d) {
  return events.filter((e) => {
    if (e.type === "new") return d.notifyNew;
    if (e.type === "priceDown") return d.notifyPriceDrop || d.notifyPriceChange;
    if (e.type === "priceUp") return d.notifyPriceChange;
    if (e.type === "gone") return d.notifyGone;
    return false;
  });
}

export const EVENT_LABEL = { new: "🆕 신규", priceDown: "📉 가격 내림", priceUp: "📈 가격 오름", gone: "👋 사라짐", relisted: "🔁 다시 올림", same: "유지" };
