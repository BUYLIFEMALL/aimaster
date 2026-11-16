// Threads 쇼핑제휴 자동화 — 네이버 브랜드커넥트 수집 확장(서비스 워커).
// 수집 함수(collectNaverPage)는 threads-auto(boksajang/threads-auto, MIT, 커밋 bd2fec7) chrome-extension/content-script.js의
// currentNaverIdentity·normalizeNaverImage·collectNaverImages·waitForNaverImages·collectNaverReviews·collectNaverFacts·productTitle에서 옮겼다.
// 원본의 네이티브 메시징(데스크톱 앱 연결)은 쓰지 않고, 웹 화면 ↔ web-bridge.js ↔ 이 서비스 워커로 바꿨다.
// 수집은 회원 PC·회원 브라우저에서만 일어난다. 새 창은 만들지 않고 지금 창에 백그라운드 탭을 열었다가 닫는다.
'use strict';

const ALLOWED_HOSTS = new Set(['brand.naver.com', 'smartstore.naver.com', 'shopping.naver.com', 'pkgtour.naver.com']);
const NAVIGATION_TIMEOUT_MS = 30000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isNaverMe(value) {
  try {
    const u = new URL(String(value).trim());
    return u.protocol === 'https:' && u.hostname === 'naver.me' && !u.username && !u.password && !u.port && u.pathname.length > 1;
  } catch { return false; }
}

function productIdentity(href) {
  try {
    const u = new URL(href);
    // 계정 정보·비표준 포트가 붙은 주소는 거부(서버 naverProductIdentity와 같은 규칙)
    if (u.username || u.password || u.port) return false;
    if (u.hostname === 'pkgtour.naver.com') return /^\/products\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);
    return ALLOWED_HOSTS.has(u.hostname) && /\/products\/\d+/.test(u.pathname);
  } catch { return false; }
}

async function waitForProductPage(tabId) {
  const deadline = Date.now() + NAVIGATION_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tabId);
    last = tab.url || tab.pendingUrl || last;
    if (tab.status === 'complete' && last) {
      let host = '';
      try { host = new URL(last).hostname; } catch { /* 주소 없음 */ }
      if (host !== 'naver.me') {
        if (!productIdentity(last)) {
          const err = new Error('링크가 네이버 상품 페이지로 이어지지 않았습니다(도착: ' + host + ').');
          err.code = 'PRODUCT_IDENTITY_MISMATCH';
          throw err;
        }
        return last;
      }
    }
    await sleep(400);
  }
  const err = new Error('상품 페이지가 30초 안에 열리지 않았습니다. 로그인·인증 화면이 떴는지 확인해 주세요.');
  err.code = 'NAVIGATION_TIMEOUT';
  throw err;
}

// ↓ 이 함수는 상품 페이지 안에서 실행된다(밖의 변수를 쓰지 않는다).
async function collectNaverPage(request) {
  const compact = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const travelMatch = location.hostname === 'pkgtour.naver.com';
  function normalizeNaverImage(rawValue) {
    const raw = compact(rawValue); if (!raw) return null;
    try {
      const url = new URL(raw, location.href); const host = url.hostname.toLowerCase();
      if (!['http:', 'https:'].includes(url.protocol) || !(host === 'pstatic.net' || host.endsWith('.pstatic.net'))) return null;
      url.protocol = 'https:'; url.username = ''; url.password = ''; url.hash = ''; return url.toString();
    } catch { return null; }
  }
  function imageSource(image) {
    const srcset = image.getAttribute('srcset') || image.getAttribute('data-srcset') || '';
    const fromSet = srcset.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).pop();
    return image.currentSrc || image.getAttribute('src') || image.getAttribute('data-src') || fromSet || '';
  }
  function collectImages(maxImages) {
    const results = []; const seen = new Set();
    const nodes = document.querySelectorAll(travelMatch ? '[class*="DetailPhotoSlider"] img' : 'img[alt="대표이미지"], img[alt^="추가이미지"]');
    for (const image of nodes) {
      const normalized = normalizeNaverImage(imageSource(image)); if (!normalized) continue;
      const alt = compact(image.getAttribute('alt')); const width = Math.max(image.naturalWidth || 0, image.width || 0);
      if (!travelMatch && width < 80 && !/(대표이미지|추가이미지|상품)/.test(alt)) continue;
      const url = new URL(normalized); const identity = url.hostname + url.pathname;
      if (seen.has(identity)) continue; seen.add(identity); results.push(normalized);
      if (results.length >= maxImages) break;
    }
    return results;
  }
  async function waitForImages(maxImages) {
    const deadline = Date.now() + 15000; let best = []; let stable = 0;
    while (Date.now() < deadline) {
      const images = collectImages(maxImages);
      if (images.length > best.length) { best = images; stable = 0; } else if (best.length) stable += 1;
      if (best.length >= maxImages || (best.length && stable >= 5)) return best;
      await delay(400);
    }
    return best;
  }
  function productTitle() {
    if (travelMatch) return compact(document.querySelector('h1')?.textContent).slice(0, 300);
    for (const selector of ['#MAIN_CONTENT_ROOT_ID h3', 'main h3', 'h1', '[class*="product-title"]']) {
      const value = compact(document.querySelector(selector)?.textContent);
      if (value) return value.slice(0, 300);
    }
    return compact(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).slice(0, 300);
  }
  function collectReviews(maxReviews) {
    const reviews = []; const seen = new Set();
    for (const node of document.querySelectorAll('button, article, [class*="review"]')) {
      const text = compact(node.textContent);
      if (text.length < 20 || text.length > 4000 || !/(평점|리뷰)/.test(text) || seen.has(text)) continue;
      const cleaned = text.replace(/^review_image\s*/i, '').trim();
      if (cleaned.length < 20) continue; seen.add(cleaned);
      const match = /평점\s*([1-5](?:\.\d+)?)/.exec(cleaned); const rating = match ? Number(match[1]) : undefined;
      reviews.push({ text: cleaned.slice(0, 600), ...(rating ? { rating } : {}) }); if (reviews.length >= maxReviews) break;
    }
    return reviews;
  }
  function collectFacts() {
    if (travelMatch) {
      const facts = []; const add = (value) => { const text = compact(value); if (text && text.length <= 300 && !facts.includes(text)) facts.push(text); };
      for (const row of document.querySelectorAll('[class*="DetailDescription_col"]')) {
        const label = compact(row.querySelector('dt')?.textContent);
        for (const item of row.querySelectorAll('li')) add(label + ': ' + item.textContent);
      }
      return facts.slice(0, 30);
    }
    const facts = []; const seen = new Set();
    const pattern = /(상품번호|제조사|브랜드|모델명|품번|원산지|연결방식|전송방식|반응속도|무료배송|상품 가격|키스위치)/;
    for (const node of document.querySelectorAll('li, dt, dd, [class*="product"] div')) {
      const value = compact(node.textContent); if (value.length < 3 || value.length > 180 || !pattern.test(value) || seen.has(value)) continue;
      seen.add(value); facts.push(value); if (facts.length >= 30) break;
    }
    return facts;
  }
  const imageUrls = await waitForImages(request.maxImages);
  // 후기는 아래쪽에서 늦게 그려지므로 끝까지 한 번 내렸다가 읽는다
  window.scrollTo(0, document.body.scrollHeight); await delay(1500);
  const reviews = travelMatch ? [] : collectReviews(request.maxReviews);
  window.scrollTo(0, 0);
  return { finalUrl: location.href, title: productTitle(), imageUrls, reviews, facts: collectFacts() };
}

async function collect(url, windowId) {
  if (!isNaverMe(url)) return { ok: false, error: '네이버 브랜드커넥트에서 발급한 https://naver.me/… 링크만 열 수 있습니다.' };
  const tab = await chrome.tabs.create({ url, active: false, ...(typeof windowId === 'number' ? { windowId } : {}) });
  try {
    await waitForProductPage(tab.id);
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectNaverPage, args: [{ maxImages: 10, maxReviews: 8 }] });
    const data = injection?.result;
    if (!data) return { ok: false, error: '상품 페이지에서 정보를 읽지 못했습니다.' };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || '수집에 실패했습니다.', code: e?.code };
  } finally {
    chrome.tabs.remove(tab.id).catch(() => undefined);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'status') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version_name });
    return false;
  }
  if (message?.type === 'collect') {
    collect(message.url, sender.tab?.windowId).then(sendResponse, (e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    return true;
  }
  return false;
});
