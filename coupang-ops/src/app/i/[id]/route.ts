import { NextResponse } from "next/server";
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
  return new NextResponse(file, {
    headers: {
      "Content-Type": file.type || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
