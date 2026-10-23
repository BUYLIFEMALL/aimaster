import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHOP_IMAGE_BUCKET, storagePathFromUrl } from "@/lib/imageSrc";
import { isInRetentionGrace, retentionCutoff, RETENTION_DAYS, RETENTION_GRACE_END } from "@/lib/retention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const PRODUCTS_PER_RUN = 200;
const LIST_LIMIT = 1000;

// trending-product-finder와 같은 CRON_SECRET Bearer 인증. 비어 있으면 통과시키지 않는다.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

type Admin = ReturnType<typeof createAdminClient>;

/** prefix 바로 아래 항목. 폴더는 id가 null, 파일은 id·created_at이 있다. */
async function listEntries(admin: Admin, prefix: string) {
  const { data, error } = await admin.storage.from(SHOP_IMAGE_BUCKET).list(prefix, { limit: LIST_LIMIT });
  if (error) throw new Error(`목록 실패(${prefix}): ${error.message}`);
  return data ?? [];
}

/** prefix 아래 파일 경로를 한 단계 하위 폴더까지 모은다(products/<id>/{generated,custom,merged}/파일). */
async function listFilesDeep(admin: Admin, prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await listEntries(admin, prefix)) {
    if (e.id) out.push(`${prefix}/${e.name}`);
    else for (const f of await listEntries(admin, `${prefix}/${e.name}`)) if (f.id) out.push(`${prefix}/${e.name}/${f.name}`);
  }
  return out;
}

async function removePaths(admin: Admin, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from(SHOP_IMAGE_BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw new Error(`파일 삭제 실패: ${error.message}`);
  }
}

/**
 * v1.15 생성 자료 30일 자동 정리. 매일 1회(vercel.json).
 * ① 만든 지 30일 지난 상품: 상품 폴더 파일 + 대표·참고 이미지 파일을 지우고 상품 행을 지운다
 *    (섹션 이미지·긴 PNG 기록 행은 on delete cascade로 함께 지워짐).
 * ② 상품에 연결되지 않은 채 30일 지난 업로드 파일(분석만 하고 저장하지 않은 경우 등)과
 *    DB에 상품이 없는 상품 폴더의 30일 지난 파일을 지운다.
 * 로그·응답에는 개수만 남긴다(회원 자료 내용 없음).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isInRetentionGrace()) {
    return NextResponse.json({ skipped: "grace", graceEnd: RETENTION_GRACE_END, retentionDays: RETENTION_DAYS });
  }

  const admin = createAdminClient();
  const cutoff = retentionCutoff();
  const errors: string[] = [];
  let productsDeleted = 0;
  let filesDeleted = 0;
  let orphanFilesDeleted = 0;

  // ① 만료 상품
  const { data: expired, error: expiredError } = await admin
    .from("shop_products")
    .select("id, user_id, source_image_url, reference_image_urls")
    .lt("created_at", cutoff)
    .limit(PRODUCTS_PER_RUN);
  if (expiredError) errors.push(`shop_products: ${expiredError.message}`);

  for (const p of expired ?? []) {
    try {
      const own = (u: string | null) => {
        const path = storagePathFromUrl(u);
        return path && path.startsWith(`${p.user_id}/`) ? path : null;
      };
      const paths = new Set(await listFilesDeep(admin, `${p.user_id}/products/${p.id}`));
      for (const u of [p.source_image_url, ...(p.reference_image_urls ?? [])]) {
        const path = own(u);
        if (path) paths.add(path);
      }
      await removePaths(admin, Array.from(paths));
      const { error } = await admin.from("shop_products").delete().eq("id", p.id);
      if (error) throw new Error(error.message);
      productsDeleted += 1;
      filesDeleted += paths.size;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // ② 상품 없이 남은 파일
  try {
    const { data: remaining, error } = await admin
      .from("shop_products")
      .select("id, user_id, source_image_url, reference_image_urls");
    if (error) throw new Error(`shop_products: ${error.message}`);
    const liveProducts = new Set((remaining ?? []).map((p) => p.id));
    const referenced = new Set<string>();
    for (const p of remaining ?? []) {
      for (const u of [p.source_image_url, ...(p.reference_image_urls ?? [])]) {
        const path = storagePathFromUrl(u);
        if (path) referenced.add(path);
      }
    }

    for (const userFolder of await listEntries(admin, "")) {
      if (userFolder.id) continue; // 루트에 바로 놓인 파일은 이 앱이 만들지 않는다
      const base = `${userFolder.name}/products`;
      const stale: string[] = [];
      for (const e of await listEntries(admin, base)) {
        if (e.id) {
          const path = `${base}/${e.name}`;
          if (!referenced.has(path) && e.created_at && e.created_at < cutoff) stale.push(path);
        } else if (!liveProducts.has(e.name)) {
          for (const sub of await listEntries(admin, `${base}/${e.name}`)) {
            if (sub.id) {
              if (sub.created_at && sub.created_at < cutoff) stale.push(`${base}/${e.name}/${sub.name}`);
              continue;
            }
            for (const f of await listEntries(admin, `${base}/${e.name}/${sub.name}`)) {
              if (f.id && f.created_at && f.created_at < cutoff) stale.push(`${base}/${e.name}/${sub.name}/${f.name}`);
            }
          }
        }
      }
      await removePaths(admin, stale);
      orphanFilesDeleted += stale.length;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const result = { cutoff, retentionDays: RETENTION_DAYS, productsDeleted, filesDeleted, orphanFilesDeleted };
  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
