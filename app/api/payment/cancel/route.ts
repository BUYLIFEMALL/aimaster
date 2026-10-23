import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    // 본인 주문만 취소 가능
    const { data: record } = await supabase
      .from("payment_records")
      .select("id, status, user_id")
      .eq("payapp_order_id", orderId)
      .single();

    if (!record || record.user_id !== user.id) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (record.status !== "pending") {
      return NextResponse.json({ error: "취소할 수 없는 상태입니다." }, { status: 400 });
    }

    await supabase.from("payment_records")
      .update({ status: "failed" })
      .eq("id", record.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "처리 실패" }, { status: 500 });
  }
}
