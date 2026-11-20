// v1.33 다른 프로그램이 넘긴 레퍼런스 대사(주소 # 뒤)를 로그인 화면을 거쳐도 잃지 않게 — 이 탭 저장소(sessionStorage)에 잠깐 보관
// v1.34 보낸 프로그램 이름도 함께 보관
import { readRefHandoff, readRefHandoffFrom } from "./reference";
import { PRODUCT_HASH, normalizeProductExtra, readProductExtra, readProductHandoff, type ProductExtra, type ProductInfo } from "./productShorts";

const KEY = "onestop-ref-handoff";

export type RefHandoff = { text: string; from: string };

/** 로그인 화면: 주소 # 뒤에 대사가 있으면 보관(있었으면 true) */
export function stashRefHandoff(hash: string): boolean {
  const text = readRefHandoff(hash);
  if (!text) return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ text, from: readRefHandoffFrom(hash) }));
  } catch {
    /* 저장소를 못 쓰는 브라우저 — 이 경우 대사는 넘어가지 않음 */
  }
  return true;
}

/** 로그인 직후 주제 화면으로 보낼지(레퍼런스 대사 또는 v1.44 상품 정보) */
export function hasStashedRefHandoff(): boolean {
  try {
    return !!sessionStorage.getItem(KEY) || !!sessionStorage.getItem(PRODUCT_KEY);
  } catch {
    return false;
  }
}

// v1.44(V3) 다른 프로그램이 넘긴 상품 정보(#product-name=…)도 같은 방식으로 보관
const PRODUCT_KEY = "onestop-product-handoff";

/** 2026-11-20: 상품 넘기기 주소 모양(#product-name=…)인지 — 읽을 수 있는지와 별개 */
export function isProductHandoffHash(hash: string): boolean {
  return hash.startsWith(`#${PRODUCT_HASH}=`);
}

/** 2026-11-20: 상품 넘기기 주소인데 상품명을 읽지 못함(잘리거나 깨짐) — 주제 화면 안내 한 줄용 */
export function isBrokenProductHandoff(hash: string): boolean {
  return isProductHandoffHash(hash) && !readProductHandoff(hash);
}

/** 깨진 넘기기 안내(주인님 승인 2026-11-20 — 안내만, 처리 방식은 그대로 무시) */
export const BROKEN_PRODUCT_HANDOFF_NOTICE = "넘겨받은 상품 정보를 읽지 못했습니다(주소가 잘렸거나 깨졌을 수 있음). 보낸 프로그램에서 다시 눌러 주세요.";

/** 로그인 화면: 주소 # 뒤에 상품 정보가 있으면 보관(있었으면 true). 2026-11-20: 깨진 넘기기도 보관해 로그인 뒤 안내할 수 있게 */
export function stashProductHandoff(hash: string): boolean {
  if (!isProductHandoffHash(hash)) return false;
  try {
    sessionStorage.setItem(PRODUCT_KEY, hash);
  } catch {
    /* 저장소를 못 쓰는 브라우저 — 이 경우 상품 정보는 넘어가지 않음 */
  }
  return true;
}

/** 주제 화면: 주소 # 뒤 상품 정보를 먼저, 없으면 보관분 — 꺼낸 보관분은 바로 지움. v1.52 추가 필드(extra)도 같은 주소에서 */
export function takeProductHandoff(hash: string): { product: ProductInfo; from: string; extra: ProductExtra } | null {
  let stored = "";
  try {
    stored = sessionStorage.getItem(PRODUCT_KEY) ?? "";
    sessionStorage.removeItem(PRODUCT_KEY);
  } catch {
    /* 무시 */
  }
  const src = readProductHandoff(hash) ? hash : stored;
  const got = src ? readProductHandoff(src) : null;
  return got ? { ...got, extra: readProductExtra(src) ?? normalizeProductExtra({}) } : null;
}

/** 2026-11-20: 주제 화면용 — 받은 상품 정보, 깨진 넘기기(안내 한 줄), 없음을 구분. 보관분은 한 번 꺼내면 지움 */
export type ProductHandoffResult =
  | { status: "ok"; product: ProductInfo; from: string; extra: ProductExtra }
  | { status: "broken" }
  | { status: "none" };
export function takeProductHandoffResult(hash: string): ProductHandoffResult {
  let stored = "";
  try {
    stored = sessionStorage.getItem(PRODUCT_KEY) ?? "";
    sessionStorage.removeItem(PRODUCT_KEY);
  } catch {
    /* 무시 */
  }
  const src = isProductHandoffHash(hash) ? hash : stored;
  if (!src) return { status: "none" };
  const got = readProductHandoff(src);
  if (!got) return isProductHandoffHash(src) ? { status: "broken" } : { status: "none" };
  return { status: "ok", ...got, extra: readProductExtra(src) ?? normalizeProductExtra({}) };
}

function parseStored(raw: string): RefHandoff {
  try {
    const v = JSON.parse(raw) as Partial<RefHandoff>;
    if (typeof v?.text === "string") return { text: v.text, from: typeof v.from === "string" ? v.from : "" };
  } catch {
    /* v1.33 때 보관한 글자 그대로의 대사 */
  }
  return { text: raw, from: "" };
}

/** 주제 화면: 주소 # 뒤 대사를 먼저, 없으면 보관한 대사 — 꺼낸 보관분은 바로 지움 */
export function takeRefHandoff(hash: string): RefHandoff {
  let stored = "";
  try {
    stored = sessionStorage.getItem(KEY) ?? "";
    sessionStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
  const text = readRefHandoff(hash);
  if (text) return { text, from: readRefHandoffFrom(hash) };
  return stored ? parseStored(stored) : { text: "", from: "" };
}
