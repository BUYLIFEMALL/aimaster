// v1.44(V3): 상품 홍보 쇼츠 — 상품 정보 정리·넘겨받기(화면·서버 공용 순수 함수).
// 15초 6비트 구성은 product-shorts-studio의 「구성」만 참고해 문장은 새로 썼다(라이선스 없는 원본 — 코드·문구 사용 안 함).
//
// [다른 프로그램 → 원스톱 넘기기 형식] (예: shop-detail-page 「쇼츠로 만들기」, 이커머스 E9)
//   https://shorts-onestop-studio.buylife.xyz/topic#product-name=<상품명>&product-point=<장점>&product-point=…&product-offer=<혜택>&product-from=<보낸 프로그램>
//   - 주소 # 뒤에 실어 서버 기록에 남지 않게 한다(레퍼런스 대사 넘기기 v1.32와 같은 방식, 로그인을 거치면 탭 저장소에 잠시 보관).
//   - 값은 encodeURIComponent. 상품명 100자, 장점 최대 3개 각 60자, 혜택 80자, 보낸 프로그램 40자에서 자른다.
//   - 도매가·원가·재고·주문 정보는 넘기지 않는다(trending-product-finder/lib/shopDetailLink.ts와 같은 원칙).
//   - 상품 사진은 2단계(배경 형식에 「상품 사진」 추가 뒤)에 product-image로 받는다 — 지금은 받지 않는다.

import type { Bg, ShortsScript } from "./script";

export type ProductInfo = { name: string; points: string[]; offer: string };

export const PRODUCT_HASH = "product-name";
const POINT = "product-point";
const OFFER = "product-offer";
const FROM = "product-from";
export const PRODUCT_LIMITS = { name: 100, point: 60, points: 3, offer: 80, from: 40 } as const;
/** 상품 홍보 구성의 카드 수(인트로 1 + 카드 4 + 아웃트로 1 = 6비트) */
export const PRODUCT_CARDS = 4;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** 회원 입력·서버 요청을 같은 기준으로 정리. 상품명이 없으면 null */
export function normalizeProduct(raw: unknown): ProductInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = clean(r.name, PRODUCT_LIMITS.name);
  if (!name) return null;
  const points = (Array.isArray(r.points) ? r.points : [])
    .map((p) => clean(p, PRODUCT_LIMITS.point))
    .filter(Boolean)
    .slice(0, PRODUCT_LIMITS.points);
  return { name, points, offer: clean(r.offer, PRODUCT_LIMITS.offer) };
}

/** 보내는 쪽이 쓰는 주소 # 부분 */
export function productHandoffHash(product: ProductInfo, from?: string): string {
  const p = normalizeProduct(product);
  if (!p) return "";
  const parts = [`${PRODUCT_HASH}=${encodeURIComponent(p.name)}`];
  for (const pt of p.points) parts.push(`${POINT}=${encodeURIComponent(pt)}`);
  if (p.offer) parts.push(`${OFFER}=${encodeURIComponent(p.offer)}`);
  const f = clean(from, PRODUCT_LIMITS.from);
  if (f) parts.push(`${FROM}=${encodeURIComponent(f)}`);
  return `#${parts.join("&")}`;
}

/** 받는 쪽: 주소 # 부분에서 상품 정보와 보낸 프로그램 이름. 상품 넘기기가 아니면 null */
export function readProductHandoff(hash: string): { product: ProductInfo; from: string } | null {
  if (!hash.startsWith(`#${PRODUCT_HASH}=`)) return null;
  const values: Record<string, string[]> = {};
  for (const part of hash.slice(1).split("&")) {
    const at = part.indexOf("=");
    if (at < 1) continue;
    let value = "";
    try {
      value = decodeURIComponent(part.slice(at + 1));
    } catch {
      continue;
    }
    (values[part.slice(0, at)] ??= []).push(value);
  }
  const product = normalizeProduct({ name: values[PRODUCT_HASH]?.[0], points: values[POINT] ?? [], offer: values[OFFER]?.[0] });
  return product ? { product, from: clean(values[FROM]?.[0], PRODUCT_LIMITS.from) } : null;
}

/** 대본 프롬프트에 넣는 상품 정보 블록(v1.52: 확정 설명·옵션이 있으면 함께 — 둘 다 판매자가 확정한 사실) */
export function productBlock(p: ProductInfo, extra?: Pick<ProductExtra, "desc" | "option">): string {
  return [
    `상품명: ${p.name}`,
    extra?.option ? `옵션: ${extra.option}` : "",
    p.points.length ? `판매자가 적은 장점:\n${p.points.map((pt, i) => `${i + 1}. ${pt}`).join("\n")}` : "판매자가 적은 장점: (없음 — 상품명에서 알 수 있는 일반적인 쓰임만)",
    extra?.desc ? `판매자가 확정한 상품 설명: ${extra.desc}` : "",
    p.offer ? `판매자가 적은 혜택·구매 안내: ${p.offer}` : "",
  ].filter(Boolean).join("\n");
}

// ── v1.52 메이커 후속 1단계: 추가 필드(상품ID·옵션·주소·확정 설명·사진 권리·판번호) ──
// 기존 넘기기 4개는 그대로 두고(하위 호환) 아래 값을 같은 주소 # 뒤에 덧붙인다.
//   …&product-id=<내부 상품ID>&product-option=<옵션>&product-url=<https 상품 주소>&product-desc=<확정 설명>&product-rights=owned|supplier&product-rev=<판번호>
// 상품 사진(product-image)은 2단계(자료함 sourceRef 참조, 복사하지 않음 — 주인님 2026-11-13 결정)에서 받는다.
// 근거: docs/IMPROVEMENT_HANDOFF_20261113_MAKER.md §3
export type ProductRights = "owned" | "supplier";
export type ProductExtra = { id: string; option: string; url: string; desc: string; rights: ProductRights | ""; rev: string };
export const EXTRA_LIMITS = { id: 64, option: 60, url: 300, desc: 300, rev: 32 } as const;
const EXTRA_KEYS = { id: "product-id", option: "product-option", url: "product-url", desc: "product-desc", rights: "product-rights", rev: "product-rev" } as const;
export const RIGHTS_LABEL: Record<ProductRights, string> = { owned: "내가 찍었거나 판매 권리가 있는 사진", supplier: "공급사가 사용을 허락한 사진" };

/** https 주소만(그 밖은 빈 값) */
function cleanUrl(v: unknown): string {
  const s = clean(v, EXTRA_LIMITS.url);
  try { return s && new URL(s).protocol === "https:" ? s : ""; } catch { return ""; }
}

export function normalizeProductExtra(raw: unknown): ProductExtra {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const id = clean(r.id, EXTRA_LIMITS.id);
  const rev = clean(r.rev, EXTRA_LIMITS.rev);
  return {
    id: /^[A-Za-z0-9_-]+$/.test(id) ? id : "",
    option: clean(r.option, EXTRA_LIMITS.option),
    url: cleanUrl(r.url),
    desc: clean(r.desc, EXTRA_LIMITS.desc),
    rights: r.rights === "owned" || r.rights === "supplier" ? r.rights : "",
    rev: /^[A-Za-z0-9_.:-]+$/.test(rev) ? rev : "",
  };
}

/** 보내는 쪽: productHandoffHash() 뒤에 붙일 추가 부분("&…", 값이 없으면 빈 문자열) */
export function productExtraHash(extra: Partial<ProductExtra>): string {
  const e = normalizeProductExtra(extra);
  return (Object.keys(EXTRA_KEYS) as (keyof ProductExtra)[]).filter((k) => e[k]).map((k) => `&${EXTRA_KEYS[k]}=${encodeURIComponent(e[k])}`).join("");
}

/** 받는 쪽: 주소 # 부분의 추가 필드(상품 넘기기가 아니면 null). 깨진 값·형식이 틀린 값은 빈 값 */
export function readProductExtra(hash: string): ProductExtra | null {
  if (!hash.startsWith(`#${PRODUCT_HASH}=`)) return null;
  const v: Record<string, string> = {};
  for (const part of hash.slice(1).split("&")) {
    const at = part.indexOf("=");
    if (at < 1) continue;
    const key = part.slice(0, at);
    if (key in v) continue;
    try { v[key] = decodeURIComponent(part.slice(at + 1)); } catch { /* 깨진 값은 건너뜀 */ }
  }
  return normalizeProductExtra(Object.fromEntries(Object.entries(EXTRA_KEYS).map(([k, name]) => [k, v[name]])));
}

/** 대본에 함께 저장하는 상품 기록(v1.52) — 같은 상품 재제작·결과 반환 연결용. 도매가·재고·고객 정보는 넣지 않는다 */
export type ProductRecord = ProductInfo & ProductExtra & { from: string; photos: number };

// ── 상품 사진 배치 ──
/** 상품 사진을 넣을 장면 순서(장면 번호: 0=인트로, 1~4=카드1~4, 5=아웃트로).
 *  카드1(쓰기 전 불편)은 상품이 없는 장면이라 사진이 6장일 때만 쓴다. 사진이 적으면 앞의 다섯 자리를 돌아가며 채운다. */
export const PRODUCT_PHOTO_SLOTS = [2, 3, 4, 0, 5] as const;
export const MAX_PRODUCT_PHOTOS = 6;
export function productPhotoSlots(count: number): { scene: number; photo: number }[] {
  const n = Math.min(MAX_PRODUCT_PHOTOS, Math.max(0, Math.floor(count)));
  if (!n) return [];
  const out: { scene: number; photo: number }[] = PRODUCT_PHOTO_SLOTS.map((scene, k) => ({ scene, photo: k % n }));
  if (n === MAX_PRODUCT_PHOTOS) out.push({ scene: 1, photo: 5 });
  return out;
}

/** 아웃트로에 고정으로 보일 상품명(+옵션) 원문 — AI가 바꾸지 못하게 대본 생성 뒤 덮어쓴다 */
export function productCaption(p: { name: string }, option?: string): string {
  return option ? `${p.name} · ${option}` : p.name;
}

// ── v1.52 상품 사진·상품 기록을 대본에 넣기 ──
// 원칙(docs/IMPROVEMENT_HANDOFF_20261113_MAKER.md §4): 상품 장면에는 AI 이미지를 쓰지 않고 회원이 올린 원본 사진을 그대로 쓴다.
// 상품명(+옵션)은 아웃트로 부제에 원문 그대로 고정한다(AI가 바꾸지 못하게).

export type ProductPhoto = { path: string };

/** 상품 사진 배경 하나 — 서명 주소는 열 때마다 path로 다시 받는다(src는 비워 둠) */
export function productBg(path: string): Bg {
  return { type: "image", source: "product", src: "", path, credit: "상품 사진" };
}

function setSceneBg(s: ShortsScript, scene: number, bg: Bg | undefined) {
  const n = s.cards.length;
  if (scene === 0) s.intro.bg = bg; else if (scene === n + 1) s.outro.bg = bg; else if (s.cards[scene - 1]) s.cards[scene - 1].bg = bg;
}
function sceneBg(s: ShortsScript, scene: number): Bg | undefined {
  const n = s.cards.length;
  return scene === 0 ? s.intro.bg : scene === n + 1 ? s.outro.bg : s.cards[scene - 1]?.bg;
}

/** 상품 사진을 정해진 장면에 넣고, 배경 방식을 「장면마다」로, 글자 배치를 아래쪽(상품이 가려지지 않게)으로 맞춘다.
 *  - 비용을 들여 만든 AI 이미지·AI 영상(만드는 중 포함)이 있는 장면은 덮어쓰지 않는다.
 *  - 회원이 이미 고른 글자 배치가 있으면 그대로 둔다.
 *  - 사진 권리 표시가 없으면 사진은 넣지 않는다(상품 기록·고정 문구만). */
export function applyProduct(script: ShortsScript, record: ProductRecord, photos: ProductPhoto[]): ShortsScript {
  const s = structuredClone(script);
  const usable = record.rights ? photos.filter((p) => typeof p.path === "string" && p.path.includes("/product/")) : [];
  // 같은 대본에 다시 넣을 때: 이전 상품 사진은 지우고 새로 배치
  for (let i = 0; i < s.cards.length + 2; i++) if (sceneBg(s, i)?.source === "product") setSceneBg(s, i, undefined);
  for (const { scene, photo } of productPhotoSlots(usable.length)) {
    const cur = sceneBg(s, scene);
    if (cur && (cur.source === "ai" || cur.videoJob)) continue;
    setSceneBg(s, scene, productBg(usable[photo].path));
  }
  if (usable.length) {
    s.backdrop = { ...(s.backdrop ?? { dim: 0.45, style: "photo", character: "" }), mode: "scene" } as ShortsScript["backdrop"];
    if (!s.design?.layout) s.design = { ...(s.design ?? {}), layout: "bottom" };
  }
  s.outro.subtitle = productCaption(record, record.option);
  s.product = { ...record, photos: usable.length };
  return s;
}

/** 대본의 상품 장면 수(시험·화면 표시용) */
export function productSceneCount(s: ShortsScript): number {
  let n = 0; for (let i = 0; i < s.cards.length + 2; i++) if (sceneBg(s, i)?.source === "product") n++;
  return n;
}
