// M2-2 주문 엑셀 내려받기 — 목록과 같은 조건(?status·q·from·to·no_tracking), 최대 3,000건. 「택배사·송장번호」 칸을 채워 다시 올리면 송장 일괄 등록
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { parseOrderListQuery } from "@/lib/order-list";
import { buildOrdersWorkbook, loadExportOrders } from "@/lib/order-excel-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request, { params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: store } = await supabase.from("mall_builder_stores").select("id, slug").eq("slug", slug).maybeSingle();
  if (!store) return NextResponse.json({ error: "몰을 찾을 수 없습니다." }, { status: 404 });
  const { data: can } = await supabase.rpc("mall_builder_staff_can", { p_store_id: store.id, p_perm: "orders" });
  if (can !== true) return NextResponse.json({ error: "주문 권한이 없습니다." }, { status: 403 });

  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseOrderListQuery(sp, Object.keys(ORDER_STATUS_LABEL));
  try {
    const orders = await loadExportOrders(supabase, store.id, f);
    const buf = await buildOrdersWorkbook(orders, ORDER_STATUS_LABEL);
    const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`주문_${store.slug}_${day}.xlsx`)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "엑셀을 만들지 못했습니다." }, { status: 500 });
  }
}
