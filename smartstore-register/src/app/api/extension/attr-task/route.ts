import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromExtension } from "@/lib/extension/token";
import { extVersionNumber } from "@/lib/smartstore/fields";
import { ATTR_EXT_MIN } from "@/lib/smartstore/attributes";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 확장이 상품속성 읽기 요청을 하나 받는다(등록 작업이 없을 때만 부름) — 「대기」를 「읽는 중」으로 먼저 바꾼 것만 넘긴다. */
export async function POST(req: Request) {
  const who = await userFromExtension(req);
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status });
  if (extVersionNumber(req.headers.get("x-ext-version")) < extVersionNumber(ATTR_EXT_MIN)) return NextResponse.json({ lookup: null });
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 5분 넘게 「읽는 중」이면 확장이 멈춘 것 — 실패로 정리해 화면이 끝없이 기다리지 않게
  await admin
    .from("smartstore_register_attr_lookups")
    .update({ status: "failed", error: "확장이 응답하지 않았습니다. 다시 불러와 주세요.", updated_at: now })
    .eq("user_id", who.userId)
    .eq("status", "running")
    .lt("updated_at", new Date(Date.now() - 5 * 60_000).toISOString());

  const { data: next } = await admin
    .from("smartstore_register_attr_lookups")
    .select("id")
    .eq("user_id", who.userId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!next) return NextResponse.json({ lookup: null });
  const { data } = await admin
    .from("smartstore_register_attr_lookups")
    .update({ status: "running", updated_at: now })
    .eq("id", next.id)
    .eq("user_id", who.userId)
    .eq("status", "queued")
    .select("id,query,category_path,category_id")
    .maybeSingle();
  if (!data) return NextResponse.json({ lookup: null });
  return NextResponse.json({ lookup: { id: data.id, query: data.query, path: data.category_path, categoryId: data.category_id } });
}
