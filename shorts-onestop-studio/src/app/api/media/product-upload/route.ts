import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { PRODUCT_PHOTO_MAX_BYTES, productUploadUrl } from "@/lib/media";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.52 상품 사진 업로드용 일회용 주소(본인 폴더 <user_id>/product/, JPG·PNG·WEBP 10MB 이하).
// 사진 권리 확인(내 사진·공급사 허락)을 체크해야만 부른다 — 체크 없는 요청은 거절.
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    if (g.body.rights !== "owned" && g.body.rights !== "supplier") throw new UserError(400, "사진 권리(내 사진 또는 공급사 허락)를 먼저 확인해 주세요.");
    const size = Number(g.body.size ?? 0);
    if (!(size > 0 && size <= PRODUCT_PHOTO_MAX_BYTES)) throw new UserError(400, "상품 사진은 한 장에 10MB 이하로 올려 주세요.");
    return json(await productUploadUrl(g.userId, String(g.body.type ?? "")));
  } catch (e) { return fail(e); }
}
