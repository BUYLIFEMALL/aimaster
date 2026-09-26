import { NextResponse } from "next/server";
import { purgeExpiredDrafts } from "@/lib/draftRetention";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await purgeExpiredDrafts(createServiceClient());
  if (result.error) return NextResponse.json({ error: "보관 기한이 지난 초안을 정리하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ deleted: result.deleted });
}
