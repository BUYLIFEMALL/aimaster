import "server-only";
import { SHOP_IMAGE_BUCKET } from "@/lib/data";
import { registeredPostedPaths } from "@/lib/smartstore/posted";
import { markPosted } from "@/lib/storage/markPosted";

// 2026-11-15 주인님 결정 「상품 등록 = 발행으로 봐」: 「바로 등록」이 성공하면 이번 상품 사진(대표·추가·상세 섹션)을
// 「포스팅됨」으로 표시한다 → 저장 구독 회원은 포스팅 보관 기간을 받는다(일반 회원은 발행 무관 30일 그대로).
// 입력만·임시저장은 실제 상품이 아니라 표시하지 않는다.

type Admin = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/** 등록 성공 작업의 상품 사진을 표시한다. 실패해도 결과 기록에는 영향 없음(0을 돌려줌). */
export async function markRegisteredProductPosted(admin: Admin, userId: string, productId: string, marketProductNo: string | null): Promise<number> {
  try {
    const { data: product } = await admin
      .from("shop_products")
      .select("main_image_url,source_image_url,reference_image_urls")
      .eq("id", productId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!product) return 0;
    const { data: rows } = await admin.from("shop_product_images").select("image_url").eq("product_id", productId).eq("user_id", userId);
    const paths = registeredPostedPaths(userId, product, ((rows ?? []) as { image_url: string | null }[]).map((r) => r.image_url));
    if (!paths.length) return 0;
    return await markPosted(admin, {
      userId,
      files: paths.map((path) => ({ bucket: SHOP_IMAGE_BUCKET, path })),
      program: "smartstore-register",
      postUrl: marketProductNo ? `https://smartstore.naver.com/main/products/${marketProductNo}` : null,
    });
  } catch {
    return 0;
  }
}
