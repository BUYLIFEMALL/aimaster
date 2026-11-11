// D25 빠른 주문 양식(품번·옵션·수량) 내려받기 — 누구나(빈 양식)
import { NextResponse } from "next/server";
import { quickTemplate } from "@/lib/quick-order-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const buf = await quickTemplate();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("빠른_주문_양식.xlsx")}`,
      "Cache-Control": "no-store",
    },
  });
}
