import { filterProducts, isExpired, mergeProducts, pageState, parseCard, toCsv } from "./lib/parse.js";

const READ_GAP_MS = 10_000;
const SITE = "https://trending-product-finder.buylife.xyz";
const $ = (id) => document.getElementById(id);
let items = [];
let lastReadAt = 0;

function setStatus(message, bad = false) {
  $("status").textContent = message;
  $("status").className = bad ? "bad" : "";
}

function criteria() {
  const picked = document.querySelector('input[name="min"]:checked').value;
  const minReviews = picked === "custom" ? Math.max(0, Number($("custom").value) || 0) : Number(picked);
  return { minReviews, excludeAds: $("excludeAds").checked };
}

function render() {
  const shown = filterProducts(items, criteria());
  $("summary").textContent = `담은 상품 ${items.length}개 중 기준에 맞는 상품 ${shown.length}개`;
  const body = $("rows");
  body.replaceChildren(
    ...shown.map((item) => {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.isAd ? `[광고] ${item.name}` : item.name;
      name.append(link);
      const price = document.createElement("td");
      price.className = "num";
      price.textContent = item.price ? `${item.price.toLocaleString("ko-KR")}원` : "-";
      const reviews = document.createElement("td");
      reviews.className = "num";
      reviews.textContent = item.reviews.toLocaleString("ko-KR");
      row.append(name, price, reviews);
      return row;
    }),
  );
}

async function save() {
  await chrome.storage.local.set({ items, savedAt: Date.now() });
}

/** 쿠팡 탭 안에서 실행된다. 바깥 변수를 쓸 수 없고, 화면을 움직이지 않는다. */
function readVisiblePage() {
  const nodes = [...document.querySelectorAll('li[class*="ProductUnit_productUnit"]')];
  return {
    title: document.title,
    text: (document.body?.innerText ?? "").slice(0, 4000),
    cards: nodes.map((node) => ({
      lines: node.innerText.split("\n"),
      href: node.querySelector('a[href*="/vp/products/"]')?.getAttribute("href") ?? "",
    })),
  };
}

async function readPage() {
  const wait = READ_GAP_MS - (Date.now() - lastReadAt);
  if (wait > 0) return setStatus(`${Math.ceil(wait / 1000)}초 뒤에 다시 눌러 주세요.`, true);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!/^https:\/\/www\.coupang\.com\/np\/search/.test(tab?.url ?? "")) {
    return setStatus("쿠팡에서 직접 검색한 결과 화면을 연 뒤 눌러 주세요.", true);
  }
  lastReadAt = Date.now();
  let result;
  try {
    [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readVisiblePage });
  } catch {
    return setStatus("화면을 읽지 못했습니다. 쿠팡 탭을 새로고침한 뒤 다시 눌러 주세요.", true);
  }

  const state = pageState({ cardCount: result.cards.length, title: result.title, text: result.text });
  if (state === "blocked") return setStatus("⛔ 쿠팡 확인 화면이 떠서 멈췄습니다. 오늘은 더 읽지 말고 쉬어 주세요.", true);
  if (state === "no-result") return setStatus("이 화면에 검색 결과가 없습니다. 다음 페이지에서 이렇게 나오면 쿠팡이 제한했을 수 있으니 잠시 쉬어 주세요.", true);
  if (state === "unknown") return setStatus("상품을 찾지 못했습니다. 쿠팡 화면이 바뀌었을 수 있습니다.", true);

  const before = items.length;
  const products = mergeProducts([], result.cards.map(parseCard));
  items = mergeProducts(items, products);
  await save();
  render();
  setStatus(`읽기 완료: 새 상품 ${items.length - before}개를 담았습니다. 저장 중…`);
  const keyword = new URL(tab.url).searchParams.get("q") ?? "";
  setStatus(`새 상품 ${items.length - before}개를 담았습니다. ${await saveToAccount(keyword, products)}`);
}

/** 쿠팡이 아니라 우리 사이트로만 보낸다. 공개 상품 정보만 담긴다. */
async function saveToAccount(keyword, products) {
  const { extToken } = await chrome.storage.local.get("extToken");
  if (!extToken) return "사이트의 「쿠팡 리뷰 거르기」에서 확장을 연결하면 내 계정에 저장됩니다.";
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

function downloadCsv() {
  const shown = filterProducts(items, criteria());
  if (!shown.length) return setStatus("저장할 상품이 없습니다.", true);
  const url = URL.createObjectURL(new Blob([toCsv(shown)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `쿠팡_리뷰거르기_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`CSV에 ${shown.length}개를 저장했습니다.`);
}

async function clearList() {
  items = [];
  await chrome.storage.local.remove(["items", "savedAt"]);
  setStatus("목록을 비웠습니다.");
  render();
}

async function init() {
  $("version").textContent = chrome.runtime.getManifest().version_name;
  const stored = await chrome.storage.local.get(["agreed", "items", "savedAt"]);
  if (isExpired(stored.savedAt)) await chrome.storage.local.remove(["items", "savedAt"]);
  else items = stored.items ?? [];

  const showMain = () => {
    $("consent").hidden = true;
    $("main").hidden = false;
    render();
  };
  if (stored.agreed) showMain();
  else $("consent").hidden = false;

  $("agree").addEventListener("change", async (event) => {
    if (!event.target.checked) return;
    await chrome.storage.local.set({ agreed: true });
    showMain();
  });
  $("read").addEventListener("click", readPage);
  $("csv").addEventListener("click", downloadCsv);
  $("clear").addEventListener("click", clearList);
  document.querySelectorAll('input[name="min"], #excludeAds, #custom').forEach((el) => el.addEventListener("input", render));
}

init();
