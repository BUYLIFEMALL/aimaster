// M2-8 유저 엑셀 내려받기 — 목록과 같은 조건(?approval·member·q·from·to), 최대 5,000명.
// 개인정보 파일이라 「유저 관리」 권한을 확인하고, 내려받을 때마다 직원 열람 기록(「엑셀 N명」)을 남긴다.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APPROVAL_LABEL } from "@/lib/business";
import { MEMBER_STATUS_LABEL } from "@/lib/closed";
import { parseCustomerListQuery } from "@/lib/customer-list";
import { buildCustomersWorkbook, loadExportCustomers } from "@/lib/customer-excel-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request, { params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: store } = await supabase.from("mall_builder_stores").select("id, slug").eq("slug", slug).maybeSingle();
  if (!store) return NextResponse.json({ error: "몰을 찾을 수 없습니다." }, { status: 404 });
  const { data: can } = await supabase.rpc("mall_builder_staff_can", { p_store_id: store.id, p_perm: "customers" });
  if (can !== true) return NextResponse.json({ error: "유저 관리 권한이 없습니다." }, { status: 403 });

  const f = parseCustomerListQuery(Object.fromEntries(new URL(req.url).searchParams));
  try {
    const rows = await loadExportCustomers(supabase, store.id, f);
    const buf = await buildCustomersWorkbook(rows, APPROVAL_LABEL, MEMBER_STATUS_LABEL);
    // 직원 열람 기록(0043 함수가 기록 대상인지 스스로 판단)
    await supabase.rpc("mall_builder_staff_log_view", { p_store_id: store.id, p_type: "customer", p_target: `엑셀 ${rows.length}명` });
    const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`유저_${store.slug}_${day}.xlsx`)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "엑셀을 만들지 못했습니다." }, { status: 500 });
  }
}
