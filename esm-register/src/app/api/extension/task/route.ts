import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromExtension } from "@/lib/extension/token";
import { SHOP_IMAGE_BUCKET, storagePathFromUrl, ownExtraPaths } from "@/lib/data";
import { orderSections, extCanRun, extMinVersion, isCurrentBuild, withoutBuilderMark } from "@/lib/esm/fields";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const JOB_COLS = "id,product_id,mode,category_keyword,steps,created_at";

/** 확장이 다음 작업을 하나 받는다 — 「확장 대기」를 「입력 중」으로 먼저 바꾼 작업만 넘긴다(두 번 실행 방지). */
export async function POST(req: Request) {
  const who = await userFromExtension(req);
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status });
  const admin = createAdminClient();

  const { data: next } = await admin
    .from("esm_register_jobs")
    .select("id,steps")
    .eq("user_id", who.userId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!next) return NextResponse.json({ job: null });
  // 오래 열어 둔 탭(옛 배포)이 만든 작업은 칸이 빠져 있을 수 있다 → 실행하지 않고 다시 보내 달라고 기록한다.
  if (!isCurrentBuild((next.steps ?? []) as { key: string; value?: string }[])) {
    await admin
      .from("esm_register_jobs")
      .update({ status: "failed", failed_step: "오래된 화면", error: "오래 열어 둔 화면에서 보낸 작업이라 칸이 빠졌을 수 있어 실행하지 않았습니다. 프로그램 화면을 새로고침한 뒤 다시 보내 주세요.", updated_at: new Date().toISOString() })
      .eq("id", next.id)
      .eq("user_id", who.userId)
      .eq("status", "queued");
    return NextResponse.json({ job: null });
  }
  // 옛 확장은 모르는 동작을 건너뛰므로 넘기지 않는다(작업은 「확장 대기」 그대로).
  if (!extCanRun((next.steps ?? []) as { action: string }[], req.headers.get("x-ext-version"))) {
    return NextResponse.json({ job: null, updateRequired: extMinVersion((next.steps ?? []) as { action: string }[]) });
  }

  const { data: job } = await admin
    .from("esm_register_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", next.id)
    .eq("user_id", who.userId)
    .eq("status", "queued")
    .select(JOB_COLS)
    .maybeSingle();
  if (!job) return NextResponse.json({ job: null });

  // 이미지: 대표(합성 대표사진 우선) + 추가(참고 사진 최대 14) + 섹션 이미지(상세설명 순서). 본인 폴더 경로만, 15분 서명 주소.
  const { data: product } = await admin
    .from("shop_products")
    .select("source_image_url,main_image_url,section_sequence,reference_image_urls")
    .eq("id", job.product_id)
    .eq("user_id", who.userId)
    .maybeSingle();
  const { data: rows } = await admin
    .from("shop_product_images")
    .select("section_key,section_order,image_url")
    .eq("product_id", job.product_id)
    .eq("user_id", who.userId);
  const own = (p: string | null) => (p && p.startsWith(`${who.userId}/`) ? p : null);
  const main = own(storagePathFromUrl(product?.main_image_url || product?.source_image_url));
  const sections = orderSections(((rows ?? []) as { section_key: string; section_order: number; image_url: string | null }[]).filter((r) => r.image_url), product?.section_sequence)
    .map((r) => ({ key: r.section_key, path: own(storagePathFromUrl(r.image_url)) }))
    .filter((r): r is { key: string; path: string } => Boolean(r.path));
  const extras = ownExtraPaths(who.userId, product?.reference_image_urls as string[] | null);
  const paths = [...(main ? [main] : []), ...sections.map((s) => s.path), ...extras];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await admin.storage.from(SHOP_IMAGE_BUCKET).createSignedUrls(paths, 900);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }
  const name = (p: string) => p.split("/").pop() ?? "image.jpg";

  return NextResponse.json({
    job: {
      id: job.id,
      mode: job.mode,
      categoryKeyword: job.category_keyword,
      steps: withoutBuilderMark((job.steps ?? []) as { key: string }[]),
      mainImage: main && signed.get(main) ? { url: signed.get(main), name: name(main) } : null,
      extraImages: extras.filter((p) => signed.get(p)).map((p) => ({ url: signed.get(p), name: name(p) })),
      detailImages: sections.filter((s) => signed.get(s.path)).map((s) => ({ key: s.key, url: signed.get(s.path), name: name(s.path) })),
    },
  });
}
