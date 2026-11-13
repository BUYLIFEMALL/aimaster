import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { deleteProductPhoto } from "@/lib/media";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.54 주제 화면에서 뺀 상품 사진 파일 지우기(본인 <user_id>/product/ 파일만, 저장된 대본이 쓰는 파일은 남김 → deleted: false)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    return json({ deleted: await deleteProductPhoto(g.userId, String(g.body.path ?? "")) });
  } catch (e) { return fail(e); }
}
