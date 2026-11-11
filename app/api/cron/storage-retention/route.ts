// 중앙 저장 정리 — 보관 연장(90일·1년 등) 회원의 파일 중 그 기간을 넘긴 것만 지운다.
// 연장 회원은 profiles.retention_exempt로 각 프로그램의 30일 정리에서 빠지므로(0063) 여기서 기간 초과분을 처리한다.
// 무기한(프로 구독·관리자 지정 무기한)·관리자·시험 계정은 대상이 아니다(DB 함수 member_storage_expired_files가 거름).
// 하루 1회 Vercel cron(vercel.json). 플랜: docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  if (!secret || (bearer !== `Bearer ${secret}` && req.nextUrl.searchParams.get("secret") !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createServiceClient();
  let removed = 0;
  const failures: string[] = [];
  const touched = new Set<string>();
  for (let round = 0; round < 10; round++) {
    const { data, error } = await service.rpc("member_storage_expired_files", { max_rows: 500 });
    if (error) return NextResponse.json({ error: error.message, removed }, { status: 500 });
    const rows = (data ?? []) as { bucket_id: string; name: string; user_id: string }[];
    if (rows.length === 0) break;
    const byBucket = new Map<string, string[]>();
    for (const row of rows) {
      byBucket.set(row.bucket_id, [...(byBucket.get(row.bucket_id) ?? []), row.name]);
      touched.add(row.user_id);
    }
    let progressed = false;
    for (const [bucket, names] of byBucket) {
      const { data: done, error: rmError } = await service.storage.from(bucket).remove(names);
      if (rmError) failures.push(`${bucket}: ${rmError.message}`);
      if (done?.length) {
        removed += done.length;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  for (const uid of touched) await service.rpc("member_storage_measure", { uid });
  return NextResponse.json({ ok: true, removed, users: touched.size, failures: failures.slice(0, 10) });
}
