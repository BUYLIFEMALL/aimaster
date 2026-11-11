"use server";

import { requireProgramAccess } from "@/lib/access";
import { getElevenstKeys } from "@/lib/setupStatus";
import { getShopProduct } from "@/lib/shop";
import { getCategoryTree } from "@/lib/elevenst/categoryStore";
import { childrenOf, pathLabel, searchLeaves, suggestCategory, type CategoryHit } from "@/lib/elevenst/category";
import { ElevenstApiError, elevenstRequest } from "@/lib/elevenst/client";
import { parseAreas, type Area } from "@/lib/elevenst/areas";
import { parseSendCloseTemplates, type SendCloseTemplate } from "@/lib/elevenst/sendClose";
import { buildProductXml, checkDraft, type DraftCheck, type ElevenstDraft } from "@/lib/elevenst/product";
import { encodeEucKr } from "@/lib/elevenst/xml";

// 3단계 등록 화면용 액션 — 11번가에 아무것도 만들거나 바꾸지 않는다(카테고리·주소·발송마감 템플릿 읽기와 검사만).
// 모든 액션은 프로그램 이용 권한 확인부터 한다(CLAUDE.md 멀티테넌시 원칙 1).

export interface CategoryNodeView {
  no: string;
  name: string;
  leaf: boolean;
}

const CATEGORY_ERROR = "11번가 카테고리 목록을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.";

/** 카테고리 찾아보기: no가 "0"이면 맨 위 목록 */
export async function browseCategoryAction(no: string): Promise<{ ok: true; path: { no: string; name: string }[]; children: CategoryNodeView[] } | { ok: false; error: string }> {
  await requireProgramAccess();
  try {
    const tree = await getCategoryTree();
    const parent = no === "0" ? null : tree.byNo.get(no);
    if (no !== "0" && !parent) return { ok: false, error: "없는 카테고리 번호입니다." };
    const path: { no: string; name: string }[] = [];
    for (let cur = parent; cur; cur = cur.parent === "0" ? undefined : tree.byNo.get(cur.parent)) path.unshift({ no: cur.no, name: cur.name });
    return { ok: true, path, children: childrenOf(tree, no).map((c) => ({ no: c.no, name: c.name, leaf: c.leaf })) };
  } catch {
    return { ok: false, error: CATEGORY_ERROR };
  }
}

/** 상품명·검색어로 맨 아래 카테고리 후보 찾기(AI 없이 이름 맞추기) */
export async function searchCategoryAction(query: string): Promise<{ ok: true; hits: CategoryHit[] } | { ok: false; error: string }> {
  await requireProgramAccess();
  const q = query.trim().slice(0, 100);
  if (!q) return { ok: true, hits: [] };
  try {
    return { ok: true, hits: searchLeaves(await getCategoryTree(), q, 12) };
  } catch {
    return { ok: false, error: CATEGORY_ERROR };
  }
}

/** 상세페이지 카테고리 + 상품명으로 후보와 미리 고를 1건(확실할 때만) */
export async function suggestCategoryAction(detailCategory: string, name: string): Promise<{ ok: true; hits: CategoryHit[]; picked: CategoryHit | null } | { ok: false; error: string }> {
  await requireProgramAccess();
  try {
    return { ok: true, ...suggestCategory(await getCategoryTree(), detailCategory.slice(0, 200), name.slice(0, 100), 12) };
  } catch {
    return { ok: false, error: CATEGORY_ERROR };
  }
}

/** 번호 하나의 경로·맨 아래 여부(직접 입력한 번호 확인용) */
export async function describeCategoryAction(no: string): Promise<{ ok: true; path: string; leaf: boolean } | { ok: false; error: string }> {
  await requireProgramAccess();
  try {
    const tree = await getCategoryTree();
    const c = tree.byNo.get(no.trim());
    if (!c) return { ok: false, error: "11번가에 없는 카테고리 번호입니다." };
    return { ok: true, path: pathLabel(tree, c.no), leaf: c.leaf };
  } catch {
    return { ok: false, error: CATEGORY_ERROR };
  }
}

export type SellerSetup =
  | { ok: true; outbound: Area[]; inbound: Area[]; templates: SendCloseTemplate[]; templateError: string }
  | { ok: false; error: string };

/** 배송 기본값용: 출고지·반품/교환지·발송마감 템플릿(회원 본인 키, 읽기만) */
export async function loadSellerSetupAction(): Promise<SellerSetup> {
  const user = await requireProgramAccess();
  const keys = await getElevenstKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 11번가 API 키를 저장해 주세요." };
  try {
    const [out, inn] = await Promise.all([
      elevenstRequest(keys.apiKey, "GET", "/rest/areaservice/outboundarea"),
      elevenstRequest(keys.apiKey, "GET", "/rest/areaservice/inboundarea"),
    ]);
    let templates: SendCloseTemplate[] = [];
    let templateError = "";
    try {
      templates = parseSendCloseTemplates((await elevenstRequest(keys.apiKey, "GET", "/rest/prodservices/sendCloseList")).text);
    } catch (e) {
      templateError = e instanceof ElevenstApiError ? e.message : "발송마감 템플릿을 읽지 못했습니다.";
    }
    return { ok: true, outbound: parseAreas(out.text).areas, inbound: parseAreas(inn.text).areas, templates, templateError };
  } catch (e) {
    return { ok: false, error: e instanceof ElevenstApiError ? e.message : "11번가에 연결하지 못했습니다." };
  }
}

export type CheckResult = DraftCheck & { categoryPath: string; xmlBytes: number; preview: string };

/** 「검사하기」: 초안 검사 + 등록 본문을 실제로 만들어 크기·글자를 확인한다. 11번가에는 보내지 않는다 */
export async function checkDraftAction(productId: string, draft: ElevenstDraft): Promise<{ ok: true; result: CheckResult } | { ok: false; error: string }> {
  const user = await requireProgramAccess();
  const shop = await getShopProduct(user.id, productId);
  if (!shop) return { ok: false, error: "상품을 찾지 못했습니다(본인 상품만 열 수 있습니다)." };

  let categoryIsLeaf: boolean | null = null;
  let categoryPath = "";
  if (draft.categoryNo) {
    try {
      const tree = await getCategoryTree();
      const c = tree.byNo.get(draft.categoryNo);
      categoryIsLeaf = c ? c.leaf : false;
      categoryPath = c ? pathLabel(tree, c.no) : "";
      if (!c) categoryPath = "(11번가에 없는 번호)";
    } catch {
      categoryIsLeaf = null;
    }
  }
  const check = checkDraft(draft, { categoryIsLeaf, hasMainImage: Boolean(shop.mainImage) });

  // 이미지 공개 주소는 4단계(보내기)에서 만든다. 지금은 같은 길이의 자리표시 주소로 본문 크기만 잰다.
  const slot = (i: number) => `https://elevenst-register.buylife.xyz/i/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-${i}.jpg`;
  const xml = buildProductXml(draft, {
    main: slot(0),
    extras: shop.extraImages.slice(0, 3).map((_, i) => slot(i + 1)),
    details: shop.sectionImages.map((_, i) => slot(i + 10)),
  });
  if (!shop.sectionImages.length) check.warnings.push("상세 섹션 이미지가 없어 상세설명이 비어 보일 수 있습니다.");
  return { ok: true, result: { ...check, categoryPath, xmlBytes: encodeEucKr(xml).length, preview: xml.slice(0, 1200) } };
}
