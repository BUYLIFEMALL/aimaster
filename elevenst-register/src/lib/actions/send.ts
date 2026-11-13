"use server";

import { requireProgramAccess } from "@/lib/access";
import { getElevenstKeys } from "@/lib/setupStatus";
import { getShopProduct, productName, SHOP_IMAGE_BUCKET } from "@/lib/shop";
import { COLLECTED_PHOTO_ACK_REQUIRED, usesCollectedPhoto } from "@/lib/collectedPhoto";
import { markPosted, type PostedFile } from "@/lib/storage/markPosted";
import { createAdminClient } from "@/lib/supabase/admin";
import { createImageLinks } from "@/lib/imageLinks";
import { isRetentionExempt } from "@/lib/retentionExempt";
import { getCategoryTree } from "@/lib/elevenst/categoryStore";
import { ElevenstApiError, elevenstRequest } from "@/lib/elevenst/client";
import { buildProductXml, checkDraft, type ElevenstDraft } from "@/lib/elevenst/product";
import {
  classifySendError,
  detailImageMode,
  detailTextHtml,
  MAX_DETAIL_IMAGES,
  parseRegisterResponse,
  parseStopDisplayResponse,
  postedDetailFiles,
  sendBlockReason,
  type SendStatus,
} from "@/lib/elevenst/register";

// 4단계 「11번가에 보내기」 — 플랜 docs/PLAN_20261111_STAGE4_SEND.md
// 11번가는 임시저장이 없어 등록하면 바로 상품이 생긴다 → 등록 직후 전시중지를 건다.
// 결과가 불확실하면(unknown) 자동으로 다시 보내지 않는다(최상위 자동화 동작 조건). 회원 본인 키만 쓴다.

export type SendResult =
  | { ok: true; status: "stopped" | "registered"; productNo: string; message: string }
  | { ok: false; status: SendStatus | "blocked"; message: string };

const JOBS = "elevenst_register_jobs";

export async function sendProductAction(productId: string, draft: ElevenstDraft, opts: { collectedAck?: boolean } = {}): Promise<SendResult> {
  const user = await requireProgramAccess();
  const keys = await getElevenstKeys(user.id);
  if (!keys) return { ok: false, status: "blocked", message: "먼저 「API키등록·플랫폼연동」에서 11번가 API 키를 저장해 주세요." };
  const shop = await getShopProduct(user.id, productId);
  if (!shop) return { ok: false, status: "blocked", message: "상품을 찾지 못했습니다(본인 상품만 보낼 수 있습니다)." };

  // 1) 검사를 다시 한다(화면에서 검사한 뒤 값이 바뀌었을 수 있음)
  let categoryIsLeaf: boolean | null = null;
  try {
    const c = (await getCategoryTree()).byNo.get(draft.categoryNo);
    categoryIsLeaf = c ? c.leaf : false;
  } catch {
    return { ok: false, status: "blocked", message: "11번가 카테고리 목록을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  const check = checkDraft(draft, { categoryIsLeaf, hasMainImage: Boolean(shop.mainImage) });
  if (check.errors.length || !shop.mainImage) return { ok: false, status: "blocked", message: `검사를 통과하지 못했습니다: ${check.errors[0] ?? "대표 이미지가 없습니다."}` };

  // 1-1) 수집 원본 사진이면 회원의 허가·권리 확인이 있어야 보낸다(막지 않고 회원이 고름 — 2026-11-13 주인님 결정)
  if (usesCollectedPhoto(shop.product) && !opts.collectedAck) return { ok: false, status: "blocked", message: COLLECTED_PHOTO_ACK_REQUIRED };

  // 2) 중복 막기 — 같은 상품의 마지막 기록이 보내는 중·확인 필요·등록됨이면 보내지 않는다
  const admin = createAdminClient();
  const { data: last } = await admin.from(JOBS).select("status").eq("user_id", user.id).eq("product_id", productId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const blocked = sendBlockReason(last?.status as SendStatus | undefined);
  if (blocked) return { ok: false, status: "blocked", message: blocked };

  // 3) 「보내는 중」 기록. 거의 동시에 두 번 눌렀으면 먼저 생긴 기록만 진행한다
  const name = draft.name.trim() || productName(shop.product);
  const { data: job, error: jobError } = await admin
    .from(JOBS)
    .insert({ user_id: user.id, product_id: productId, product_name: name.slice(0, 200), category_no: draft.categoryNo, status: "sending", stop_display: true })
    .select("id")
    .single();
  if (jobError || !job) return { ok: false, status: "blocked", message: "등록 기록을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  const { data: sendingRows } = await admin.from(JOBS).select("id").eq("user_id", user.id).eq("product_id", productId).eq("status", "sending").order("created_at", { ascending: true }).limit(1);
  const update = (patch: Record<string, unknown>) => admin.from(JOBS).update({ ...patch, updated_at: new Date().toISOString() }).eq("id", job.id);
  if (sendingRows?.[0]?.id !== job.id) {
    await update({ status: "failed", message: "같은 상품을 동시에 두 번 보내 나중 요청은 멈췄습니다." });
    return { ok: false, status: "blocked", message: "같은 상품을 이미 보내는 중입니다. 잠시 뒤 등록 기록을 확인해 주세요." };
  }

  // 4) 대표·추가 이미지 짧은 주소(11번가가 받아 가서 자기 서버에 저장).
  //    상세설명: 유료(보관 연장) 회원·관리자·시험 계정은 상세페이지 섹션 이미지, 그 밖은 글(이미지 없음 → 30일 뒤에도 깨지지 않음)
  let xml: string;
  let postedFiles: PostedFile[] = [];
  try {
    const extraPaths = shop.extraImages.slice(0, 3).map((i) => i.path);
    const sectionPaths = shop.sectionImages.slice(0, MAX_DETAIL_IMAGES).map((i) => i.path);
    const mode = detailImageMode(await isRetentionExempt(admin, user.id), sectionPaths.length);
    postedFiles = postedDetailFiles(mode, sectionPaths, SHOP_IMAGE_BUCKET);
    const links = await createImageLinks(user.id, [shop.mainImage.path, ...extraPaths, ...(mode === "images" ? sectionPaths : [])]);
    const [main, ...rest] = links;
    const extras = rest.slice(0, extraPaths.length);
    const p = shop.product;
    xml = buildProductXml(draft, {
      main,
      extras,
      details: rest.slice(extraPaths.length),
      detailHtml: mode === "images" ? undefined : detailTextHtml({ name, key_features: p.key_features, specs: p.specs, how_to_use: p.how_to_use, target_customer: p.target_customer }),
    });
  } catch {
    await update({ status: "failed", message: "이미지 주소를 만들지 못해 보내지 않았습니다." });
    return { ok: false, status: "failed", message: "이미지 주소를 만들지 못해 보내지 않았습니다. 잠시 뒤 다시 시도해 주세요." };
  }

  // 5) 등록(재시도 없음)
  let productNo: string;
  try {
    const res = await elevenstRequest(keys.apiKey, "POST", "/rest/prodservices/product", xml);
    const r = parseRegisterResponse(res.text);
    if (!r.ok) {
      await update({ status: "failed", message: r.message, response: { code: r.code, message: r.message } });
      return { ok: false, status: "failed", message: `11번가가 등록을 거절했습니다: ${r.message}` };
    }
    productNo = r.productNo;
    await update({ status: "registered", elevenst_product_no: Number(productNo), message: r.message, response: { code: r.code, message: r.message } });
  } catch (e) {
    const status = e instanceof ElevenstApiError ? classifySendError(e.status, e.body) : "unknown";
    const message = e instanceof ElevenstApiError ? e.message : "11번가 응답을 받지 못했습니다.";
    await update({ status, message });
    return {
      ok: false,
      status,
      message: status === "unknown" ? `${message} 상품이 만들어졌을 수도 있으니 11번가 셀러오피스에서 먼저 확인해 주세요. 자동으로 다시 보내지 않습니다.` : message,
    };
  }

  // 5-1) 등록 성공이면 상세설명에 넣은 섹션 사진을 「포스팅됨」으로 표시(저장 구독 회원의 포스팅 보관 기간 적용).
  //      실패·결과 불확실은 위에서 이미 돌아갔다. 표시 실패는 등록 결과에 영향 없음(공용 코드가 삼킴).
  if (postedFiles.length > 0) {
    try {
      await markPosted(admin, { userId: user.id, files: postedFiles, program: "elevenst-register", postUrl: `https://www.11st.co.kr/products/${productNo}` });
    } catch {
      /* 등록 결과에 영향 없음 */
    }
  }

  // 6) 바로 전시중지 — 실패해도 상품은 이미 생겼으므로 「등록됨」으로 두고 직접 전시중지를 안내한다
  try {
    const res = await elevenstRequest(keys.apiKey, "PUT", `/rest/prodstatservice/stat/stopdisplay/${productNo}`);
    const s = parseStopDisplayResponse(res.text);
    if (s.ok) {
      await update({ status: "stopped", message: s.message || "전시중지" });
      return { ok: true, status: "stopped", productNo, message: "11번가에 등록하고 바로 전시중지했습니다. 셀러오피스에서 확인한 뒤 판매를 시작해 주세요." };
    }
    await update({ message: `전시중지 실패: ${s.message}` });
  } catch (e) {
    await update({ message: `전시중지 실패: ${e instanceof Error ? e.message : ""}`.slice(0, 300) });
  }
  return { ok: true, status: "registered", productNo, message: "11번가에 등록했지만 전시중지를 걸지 못했습니다. 지금 손님에게 보일 수 있으니 셀러오피스에서 직접 전시중지해 주세요." };
}
