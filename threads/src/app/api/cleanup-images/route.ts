import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanupPostImages } from "@/lib/postImageCleanup";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.30: 글 이미지 30일 정리(어떤 글에도 쓰이지 않는 파일만) — vercel.json 하루 1회(한국 시간 새벽 3시 30분). 예약 게시와 같은 CRON_SECRET.
async function handle(request: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await cleanupPostImages(createAdminClient() as unknown as SupabaseClient);
    console.log("cleanup-images:", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("cleanup-images failed:", err instanceof Error ? err.message.slice(0, 200) : err);
    return NextResponse.json({ ok: false, error: "정리하지 못했습니다." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
