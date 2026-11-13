// 원본 사진 참고 수집(2026-11-13 주인님 지정, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8 · 플랜 docs/PLAN_20261113_REFERENCE_PHOTO_COLLECT.md).
// 상품 원본 사진은 회원 참고·AI 분석 입력용이다. 회원 브라우저(이 확장)로만 받고 우리 서버는 마켓 이미지 서버를 부르지 않는다.
// 상품 이미지만(리뷰 사진·상세 설명 그림·판매자 정보 제외), 상품당 3장, 하루 50상품, 차단·로그인 화면이면 바로 멈춘다.

export const PHOTO_MAX = 3;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_DAILY_LIMIT = 50;
export const PHOTO_CONSENT_VERSION = 1;

// 받을 수 있는 이미지 서버(공식 API·검색 화면이 준 상품 사진 주소의 서버)
const IMAGE_HOSTS = [
  /(^|\.)coupangcdn\.com$/,
  /(^|\.)pstatic\.net$/,
  /(^|\.)alicdn\.com$/,
  /(^|\.)domeggook\.com$/,
  /(^|\.)domeme\.com$/,
  /(^|\.)011st\.com$/,
  /(^|\.)11st\.co\.kr$/,
];
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** //로 시작하는 주소를 https로, 그 밖에 https 이미지 서버가 아니면 빈 값 */
export function cleanImageUrl(raw) {
  let text = String(raw ?? "").trim();
  if (text.startsWith("//")) text = `https:${text}`;
  if (text.startsWith("http://")) text = `https://${text.slice(7)}`;
  return isAllowedImageUrl(text) ? text : "";
}

export function isAllowedImageUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && IMAGE_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/** 상품 페이지 주소 → { market, id }. 쿠팡 상품·네이버 스마트스토어/브랜드스토어 상품·네이버 가격비교 */
export function productKey(url) {
  try {
    const u = new URL(url);
    const coupang = u.hostname === "www.coupang.com" && u.pathname.match(/^\/vp\/products\/(\d{1,20})/);
    if (coupang) return { market: "coupang", id: coupang[1] };
    const store = /^(smartstore|brand)\.naver\.com$/.test(u.hostname) && u.pathname.match(/\/products\/(\d{1,20})/);
    if (store) return { market: "naver", id: store[1] };
    const catalog = u.hostname === "search.shopping.naver.com" && u.pathname.match(/^\/catalog\/(\d{1,20})/);
    if (catalog) return { market: "naver", id: catalog[1] };
  } catch {
    // 아래
  }
  return null;
}

/**
 * 회원이 연 상품 상세 페이지 탭 안에서 실행된다(바깥 변수를 쓸 수 없고 화면을 움직이지 않는다).
 * 대표 사진(og:image)과 상품 사진 영역의 큰 그림만 모은다. 리뷰·상세 설명·판매자 정보 영역 안 그림은 뺀다.
 */
export function readProductPagePhotos() {
  const skip = /review|detail|desc|seller|qna|inquiry|recommend|banner|se-main|se-component/i;
  const inSkipped = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (skip.test(`${n.id ?? ""} ${typeof n.className === "string" ? n.className : ""}`)) return true;
    }
    return false;
  };
  const urls = [];
  const og = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
  if (og) urls.push(og);
  for (const img of document.querySelectorAll("img")) {
    if (urls.length >= 8) break;
    const src = img.currentSrc || img.getAttribute("src") || "";
    if (!src || src.startsWith("data:")) continue;
    const w = img.naturalWidth || img.width;
    if (w < 300 || inSkipped(img)) continue;
    urls.push(src);
  }
  return { title: document.title, text: (document.body?.innerText ?? "").slice(0, 2000), urls };
}

const BLOCK_TEXT = /Access Denied|보안 문자|자동입력 방지|비정상적인|접근이 제한|일시적으로 제한|captcha|로그인이 필요/i;

/** 상품 페이지가 차단·로그인 화면인지 */
export function looksBlocked({ title, text }) {
  return BLOCK_TEXT.test(`${title ?? ""}\n${text ?? ""}`);
}

/** 큰 사진 → 이 PC 목록의 작은 사진 → API가 준 주소 순서로, 겹치지 않게 최대 3장 */
export function pickPhotoUrls({ pageUrls = [], itemUrl = "", apiUrls = [] }) {
  const out = [];
  for (const raw of [...pageUrls, itemUrl, ...apiUrls]) {
    const url = cleanImageUrl(raw);
    if (url && !out.includes(url)) out.push(url);
    if (out.length >= PHOTO_MAX) break;
  }
  return out;
}

/** 이미지 응답이 받아도 되는 사진인지(형식·크기). 아니면 이유 */
export function photoProblem(type, size) {
  if (!PHOTO_TYPES.includes(String(type).split(";")[0].trim())) return "사진(JPG·PNG·WEBP)이 아닌 응답";
  if (!size || size > PHOTO_MAX_BYTES) return "10MB를 넘거나 빈 사진";
  return "";
}

/** 하루 상한 기록 { day, count } — 날짜가 바뀌면 0부터 */
export function dailyCount(record, today) {
  return record && record.day === today ? record.count : 0;
}

export function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}
