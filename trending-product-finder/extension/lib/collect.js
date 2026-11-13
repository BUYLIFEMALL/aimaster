// 뒤편(background)에서 상품 원본 사진 1~3장을 회원 브라우저로 받는다(2026-11-13 원본 사진 참고 수집).
// 우리 사이트 화면(web-bridge)이 「상세페이지」를 누를 때만 부른다. 자동으로 돌지 않는다.
import { kstDay } from "./auto.js";
import { PHOTO_CONSENT_VERSION, PHOTO_DAILY_LIMIT, dailyCount, looksBlocked, photoProblem, pickPhotoUrls, productKey, readProductPagePhotos, toBase64 } from "./photos.js";

const FETCH_TIMEOUT_MS = 20_000;

/** 회원이 연 같은 상품 페이지 탭이 있으면 그 화면의 큰 사진 주소를 읽는다 */
async function readOpenProductTab(key) {
  if (!key) return { urls: [], blocked: false };
  const tabs = await chrome.tabs.query({ url: ["https://www.coupang.com/vp/products/*", "https://smartstore.naver.com/*", "https://brand.naver.com/*", "https://search.shopping.naver.com/catalog/*"] }).catch(() => []);
  const tab = tabs.find((t) => {
    const k = productKey(t.url ?? "");
    return k && k.market === key.market && k.id === key.id;
  });
  if (!tab?.id) return { urls: [], blocked: false };
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readProductPagePhotos });
    return { urls: looksBlocked(result) ? [] : result.urls, blocked: looksBlocked(result) };
  } catch {
    return { urls: [], blocked: false };
  }
}

async function fetchPhoto(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { credentials: "omit", signal: ctrl.signal, referrerPolicy: "no-referrer" });
    if (res.status === 403 || res.status === 429) return { stop: `이미지 서버가 거절했습니다(${res.status}). 잠시 뒤 다시 시도해 주세요.` };
    if (!res.ok) return { skip: true };
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const buf = await res.arrayBuffer();
    const problem = photoProblem(type, buf.byteLength);
    if (problem) return type.includes("html") ? { stop: "사진 대신 웹 화면이 왔습니다(차단·로그인 화면일 수 있음). 멈췄습니다." } : { skip: true };
    return { photo: { type, base64: toBase64(buf), sourceUrl: url } };
  } catch {
    return { skip: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * message: { market, id, productUrl, imageUrls, consent }
 * 결과: { ok: true, photos, big } | { ok: false, needConsent?: true, error }
 */
export async function collectPhotos(message) {
  const store = await chrome.storage.local.get(["photoConsent", "photoDaily", "items"]);
  let consent = store.photoConsent === PHOTO_CONSENT_VERSION;
  if (!consent && message.consent === true) {
    await chrome.storage.local.set({ photoConsent: PHOTO_CONSENT_VERSION });
    consent = true;
  }
  if (!consent) return { ok: false, needConsent: true, error: "원본 사진 참고 수집 안내에 먼저 동의해 주세요." };

  const today = kstDay();
  const used = dailyCount(store.photoDaily, today);
  if (used >= PHOTO_DAILY_LIMIT) return { ok: false, error: `오늘은 사진을 ${PHOTO_DAILY_LIMIT}개 상품까지 받았습니다. 내일 다시 받을 수 있습니다.` };

  const market = message.market === "naver" ? "naver" : message.market === "coupang" ? "coupang" : "";
  const id = /^\d{1,20}$/.test(String(message.id ?? "")) ? String(message.id) : "";
  const key = productKey(String(message.productUrl ?? "")) ?? (market && id ? { market, id } : null);
  const page = await readOpenProductTab(key);
  if (page.blocked) return { ok: false, error: "열려 있는 상품 페이지가 차단·로그인 화면입니다. 사진을 받지 않고 멈췄습니다." };
  const item = key ? (store.items ?? []).find((x) => (x.market ?? "coupang") === key.market && x.id === key.id) : null;
  const apiUrls = Array.isArray(message.imageUrls) ? message.imageUrls.slice(0, 3).map(String) : [];
  const urls = pickPhotoUrls({ pageUrls: page.urls, itemUrl: item?.imageUrl ?? "", apiUrls });
  if (!urls.length) {
    return { ok: false, error: key ? "받을 사진 주소가 없습니다. 쿠팡·네이버 상품이면 그 상품 페이지를 크롬에서 열어 두거나, 검색 화면을 확장으로 다시 읽은 뒤 눌러 주세요." : "받을 사진 주소가 없습니다." };
  }

  const photos = [];
  for (const url of urls) {
    const r = await fetchPhoto(url);
    if (r.stop) return { ok: false, error: r.stop };
    if (r.photo) photos.push(r.photo);
  }
  if (!photos.length) return { ok: false, error: "사진을 받지 못했습니다." };
  await chrome.storage.local.set({ photoDaily: { day: today, count: used + 1 } });
  return { ok: true, photos, big: page.urls.length > 0 };
}
