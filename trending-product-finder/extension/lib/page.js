// 팝업(직접 읽기)과 뒤편(자동 검색)이 함께 쓰는 쿠팡 화면 읽기·계정 저장.
import { mergeProducts, pageState, parseCard } from "./parse.js";

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
    })),
  };
}

/** 탭을 읽어 상태와 상품을 돌려준다. 읽지 못하면 null. */
export async function readTab(tabId) {
  let result;
  try {
    [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: readVisiblePage });
  } catch {
    return null;
  }
  const state = pageState({ cardCount: result.cards.length, title: result.title, text: result.text });
  return { state, products: state === "ok" ? mergeProducts([], result.cards.map(parseCard)) : [] };
}

/** 이 PC 목록에 이어 담는다. 늘어난 개수를 돌려준다. */
export async function addToLocalList(products) {
  const { items = [] } = await chrome.storage.local.get("items");
  const merged = mergeProducts(items, products);
  await chrome.storage.local.set({ items: merged, savedAt: Date.now() });
  return merged.length - items.length;
}

/** 쿠팡이 아니라 우리 사이트로만 보낸다. 공개 상품 정보만 담긴다. */
export async function saveToAccount(keyword, products) {
  const { extToken } = await chrome.storage.local.get("extToken");
  if (!extToken) return "사이트의 「쿠팡 상품소싱기」에서 확장을 연결하면 내 계정에 저장됩니다.";
  try {
    const response = await fetch(`${SITE}/api/extension/coupang-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${extToken}` },
      body: JSON.stringify({ keyword, items: products }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? `내 계정에 ${data.saved}개를 저장했습니다.` : data.error || "내 계정에 저장하지 못했습니다.";
  } catch {
    return "내 계정에 저장하지 못했습니다. 인터넷 연결을 확인해 주세요.";
  }
}
