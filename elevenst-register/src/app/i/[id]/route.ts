import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IMAGE_ID_RE } from "@/lib/imageLinks";
import { SHOP_IMAGE_BUCKET } from "@/lib/shop";
import { isRetentionExempt } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";

/** 짧은 이미지 주소 — 11번가가 로그인 없이 받아 간다(대표·추가 이미지, 유료 회원은 상세설명 섹션 이미지도). 회원 본인 폴더가 아니면 404.
 *  30일 만료가 지나도 보관 연장 회원(저장 구독·관리자·시험 계정, profiles.retention_exempt)이면 계속 보여 준다 — 구독이 끝나면 404(2026-11-13 주인님 결정 3안).
 *  11번가 손님이 상세설명을 열 때마다 불리므로 CDN에 하루 보관(s-maxage)해 서버 호출을 줄인다.
 *  11번가가 600×600으로 줄여 저장하므로 크기 조정은 하지 않는다(쿠팡 운영 사본에서 확대 부분만 뺌). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!IMAGE_ID_RE.test(id)) return new NextResponse("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data: link } = await admin.from("elevenst_register_image_links").select("user_id,bucket,path,expires_at").eq("id", id).maybeSingle();
  if (!link || link.bucket !== SHOP_IMAGE_BUCKET || !String(link.path).startsWith(`${link.user_id}/`)) return new NextResponse("Not found", { status: 404 });
  if (new Date(link.expires_at).getTime() < Date.now() && !(await isRetentionExempt(admin, link.user_id))) return new NextResponse("Not found", { status: 404 });
  const { data: file, error } = await admin.storage.from(link.bucket).download(link.path);
  if (error || !file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(await file.arrayBuffer()), {
    headers: {
      "Content-Type": file.type || "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
