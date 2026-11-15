import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getRecentStorageKey,
  getRecentProducts,
  addRecentProduct,
  removeRecentProduct,
  clearRecentProducts,
} from "../src/lib/recent-products.ts";

// Node 환경용 가상 LocalStorage 및 Window Event 모의
const storeMap = new Map();
let dispatchedEvents = [];

globalThis.localStorage = {
  getItem: (key) => storeMap.get(key) ?? null,
  setItem: (key, val) => storeMap.set(key, String(val)),
  removeItem: (key) => storeMap.delete(key),
  clear: () => storeMap.clear(),
};

globalThis.window = {
  dispatchEvent: (event) => {
    dispatchedEvents.push(event);
    return true;
  },
};

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

beforeEach(() => {
  storeMap.clear();
  dispatchedEvents = [];
});

test("E5: getRecentStorageKey는 몰별 접두사 키를 생성한다", () => {
  assert.equal(getRecentStorageKey("aimaster-b2b"), "mb_recent_aimaster-b2b");
  assert.equal(getRecentStorageKey("sample-mall"), "mb_recent_sample-mall");
});

test("E5: 비어있는 저장소는 빈 배열 반환", () => {
  const items = getRecentProducts("aimaster-b2b");
  assert.deepEqual(items, []);
});

test("E5: addRecentProduct는 상품을 최상단에 추가하고 이벤트를 발생시킨다", () => {
  addRecentProduct("aimaster-b2b", {
    id: "prod-1",
    name: "고급 볼펜 세트",
    price: 15000,
    image: "https://example.com/pen.jpg",
  });

  const items = getRecentProducts("aimaster-b2b");
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "prod-1");
  assert.equal(items[0].name, "고급 볼펜 세트");
  assert.equal(items[0].price, 15000);
  assert.equal(items[0].image, "https://example.com/pen.jpg");
  assert.ok(items[0].viewedAt > 0);

  assert.equal(dispatchedEvents.length, 1);
  assert.equal(dispatchedEvents[0].type, "mb_recent_updated");
  assert.equal(dispatchedEvents[0].detail.slug, "aimaster-b2b");
  assert.equal(dispatchedEvents[0].detail.count, 1);
});

test("E5: 동일 상품 재방문 시 중복 없이 맨 앞으로 이동", () => {
  addRecentProduct("aimaster-b2b", { id: "prod-1", name: "상품 1", price: 1000 });
  addRecentProduct("aimaster-b2b", { id: "prod-2", name: "상품 2", price: 2000 });
  addRecentProduct("aimaster-b2b", { id: "prod-1", name: "상품 1 갱신", price: 1200 });

  const items = getRecentProducts("aimaster-b2b");
  assert.equal(items.length, 2);
  assert.equal(items[0].id, "prod-1");
  assert.equal(items[0].price, 1200);
  assert.equal(items[1].id, "prod-2");
});

test("E5: 최대 10개 초과 시 가장 오래된 상품 자동 밀려남", () => {
  for (let i = 1; i <= 12; i++) {
    addRecentProduct("aimaster-b2b", { id: `p-${i}`, name: `상품 ${i}`, price: i * 100 });
  }

  const items = getRecentProducts("aimaster-b2b");
  assert.equal(items.length, 10);
  assert.equal(items[0].id, "p-12"); // 가장 최근
  assert.equal(items[9].id, "p-3"); // 10번째 (1, 2는 밀려남)
});

test("E5: 몰(slug) 간 격리 검증", () => {
  addRecentProduct("mall-a", { id: "prod-a", name: "몰 A 상품", price: 100 });
  addRecentProduct("mall-b", { id: "prod-b", name: "몰 B 상품", price: 200 });

  assert.equal(getRecentProducts("mall-a").length, 1);
  assert.equal(getRecentProducts("mall-a")[0].id, "prod-a");

  assert.equal(getRecentProducts("mall-b").length, 1);
  assert.equal(getRecentProducts("mall-b")[0].id, "prod-b");
});

test("E5: removeRecentProduct 및 clearRecentProducts 동작 검증", () => {
  addRecentProduct("aimaster-b2b", { id: "p-1", name: "상품 1", price: 100 });
  addRecentProduct("aimaster-b2b", { id: "p-2", name: "상품 2", price: 200 });

  removeRecentProduct("aimaster-b2b", "p-1");
  let items = getRecentProducts("aimaster-b2b");
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "p-2");

  clearRecentProducts("aimaster-b2b");
  items = getRecentProducts("aimaster-b2b");
  assert.equal(items.length, 0);
});
