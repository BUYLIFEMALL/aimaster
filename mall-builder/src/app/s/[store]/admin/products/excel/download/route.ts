// D23 엑셀 내려받기 — ?type=empty(빈 양식) / all(지금 상품 전체, 품번이 없는 상품은 먼저 P00001부터 매김)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWorkbook, fillMissingCodes, loadExcelContext } from "@/lib/product-excel-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request, { params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: store } = await supabase.from("mall_builder_stores").select("id, slug").eq("slug", slug).maybeSingle();
  if (!store) return NextResponse.json({ error: "몰을 찾을 수 없습니다." }, { status: 404 });
  const { data: can } = await supabase.rpc("mall_builder_staff_can", { p_store_id: store.id, p_perm: "products" });
  if (can !== true) return NextResponse.json({ error: "상품 권한이 없습니다." }, { status: 403 });

  const empty = new URL(req.url).searchParams.get("type") === "empty";
  try {
    const ctx = await loadExcelContext(supabase, store.id);
    if (!empty) await fillMissingCodes(supabase, ctx);
    const buf = await buildWorkbook(ctx, empty);
    const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
    const name = empty ? `상품_등록_양식.xlsx` : `상품_${store.slug}_${day}.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "엑셀을 만들지 못했습니다." }, { status: 500 });
  }
}
