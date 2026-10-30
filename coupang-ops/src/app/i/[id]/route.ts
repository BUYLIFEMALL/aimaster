import { NextResponse } from "next/server";
import sharp from "sharp";
import { UPSCALE_TO, needsUpscale } from "@/lib/coupang/imageRules";
import { createAdminClient } from "@/lib/supabase/admin";
import { IMAGE_ID_RE } from "@/lib/imageLinks";
import { SHOP_IMAGE_BUCKET } from "@/lib/shop";

export const dynamic = "force-dynamic";

/** C1-11 짧은 이미지 주소 — 쿠팡이 로그인 없이 받아 간다. 만료됐거나 회원 본인 폴더가 아니면 404 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!IMAGE_ID_RE.test(id)) return new NextResponse("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data: link } = await admin.from("coupang_ops_image_links").select("user_id,bucket,path,expires_at").eq("id", id).maybeSingle();
  if (!link || link.bucket !== SHOP_IMAGE_BUCKET || !String(link.path).startsWith(`${link.user_id}/`) || new Date(link.expires_at).getTime() < Date.now()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { data: file, error } = await admin.storage.from(link.bucket).download(link.path);
  if (error || !file) return new NextResponse("Not found", { status: 404 });
  // 쿠팡 최소 규격보다 작은 정사각형(대표 이미지)만 보낼 때 확대한다. 원본·저장소는 그대로다.
  const buf = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buf).metadata().catch(() => null);
  if (meta?.width && meta.height && needsUpscale({ width: meta.width, height: meta.height })) {
    const out = await sharp(buf).resize(UPSCALE_TO, UPSCALE_TO).jpeg({ quality: 90 }).toBuffer();
    return new NextResponse(new Uint8Array(out), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": file.type || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
