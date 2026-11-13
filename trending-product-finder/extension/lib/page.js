// 팝업(직접 읽기)과 뒤편(자동 검색)이 함께 쓰는 쇼핑몰 화면 읽기·계정 저장.
import { mergeProducts, pageState, parseCard } from "./parse.js";
import { naverPageState, parseNaverRow, readNaverPage } from "./naver.js";

const SITE = "https://trending-product-finder.buylife.xyz";

/** 쿠팡 탭 안에서 실행된다. 바깥 변수를 쓸 수 없고, 화면을 움직이지 않는다. */
export function readVisiblePage() {
  const nodes = [...document.querySelectorAll('li[class*="ProductUnit_productUnit"]')];
  return {
    title: document.title,
    text: (document.body?.innerText ?? "").slice(0, 4000),
    cards: nodes.map((node) => ({
      lines: node.innerText.split("\n"),
      href: node.querySelector('a[href*="/vp/products/"]')?.getAttribute("href") ?? "",
      name: node.querySelector('[class*="productName"]')?.innerText ?? node.querySelector("img[alt]")?.getAttribute("alt") ?? "",
      // 2026-11-13 원본 사진 참고 수집: 카드의 상품 사진 주소(이 PC 목록에만 보관, 사진 자체는 「상세페이지」를 누를 때만 받음)
      image: node.querySelector("img")?.getAttribute("src") ?? node.querySelector("img")?.getAttribute("data-src") ?? "",
    })),
  };
}

/** 탭을 읽어 상태와 상품을 돌려준다. 읽지 못하면 null. market: "coupang"(기본) | "naver" */
export async function readTab(tabId, market = "coupang") {
  const naver = market === "naver";
  let result;
  try {
    [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: naver ? readNaverPage : readVisiblePage });
  } catch {
    return null;
  }
  if (naver) {
    const state = naverPageState(result);
    return { state, products: state === "ok" ? mergeProducts([], result.rows.map(parseNaverRow)) : [] };
  }
  const state = pageState({ cardCount: result.cards.length, title: result.title, text: result.text });
  return { state, products: state === "ok" ? mergeProducts([], result.cards.map(parseCard)) : [] };
}

// 확장 창(직접 읽기)과 뒤편(자동 검색)이 거의 동시에 담으면 「읽기→합치기→쓰기」가 겹쳐 한쪽 결과가 덮일 수 있어
// 이 PC 목록 쓰기는 잠금으로 한 번에 하나씩만 한다(2026-11-03, 목록 98→53 감소 조사 중 찾은 결함).
export function withListLock(work) {
  return navigator.locks ? navigator.locks.request("local-items", work) : work();
}

/** 이 PC 목록에 이어 담는다. 늘어난 개수를 돌려준다. */
export function addToLocalList(products) {
  return withListLock(async () => {
    const { items = [] } = await chrome.storage.local.get("items");
    const merged = mergeProducts(items, products);
    await chrome.storage.local.set({ items: merged, savedAt: Date.now() });
    return merged.length - items.length;
  });
}

/** 이 PC 목록을 지우고, 언제·왜·몇 개를 지웠는지 최근 10건을 남긴다(다음에 목록이 줄면 원인을 바로 보려고). */
export function clearLocalList(reason) {
  return withListLock(async () => {
    const { items = [], itemsClearLog = [] } = await chrome.storage.local.get(["items", "itemsClearLog"]);
    await chrome.storage.local.remove(["items", "savedAt"]);
    await chrome.storage.local.set({ itemsClearLog: [...itemsClearLog, { at: Date.now(), reason, count: items.length }].slice(-10) });
  });
}

/** 쇼핑몰이 아니라 우리 사이트로만 보낸다. 공개 상품 정보만 담긴다. */
export async function saveToAccount(keyword, products, market = "coupang") {
  const { extToken } = await chrome.storage.local.get("extToken");
  if (!extToken) return "사이트의 상품소싱기 화면에서 확장을 연결하면 내 계정에 저장됩니다.";
  try {
    const response = await fetch(`${SITE}/api/extension/coupang-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${extToken}` },
      body: JSON.stringify({ keyword, market, items: products }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? `내 계정에 ${data.saved}개를 저장했습니다.` : data.error || "내 계정에 저장하지 못했습니다.";
  } catch {
    return "내 계정에 저장하지 못했습니다. 인터넷 연결을 확인해 주세요.";
  }
}
