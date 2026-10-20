import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 「브라우저에서 만들기」 완성 MP4 30일 정리(최상위 규칙: 생성 데이터는 생성일 기준 30일 후 삭제) — 2026-10-21 v1.24.
// 버킷 shots-videos의 `<회원 id>/<영상 id>/<시각>.mp4` 중 만든 지 30일이 지난 파일을 지우고, 그 주소를 쓰던 영상의 완성 상태를 비운다.
// Vercel Cron(shots/vercel.json)이 매일 호출하며 CRON_SECRET이 맞을 때만 실행한다(회원 권한 확인 대상이 아닌 시스템 라우트).
const BUCKET = "shots-videos";
const RETENTION_DAYS = 30;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dryRun = request.nextUrl.searchParams.get("dry") === "1";
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const supabase = createAdminClient();
  const storage = supabase.storage.from(BUCKET);

  const list = async (prefix: string) => {
    const out: { name: string; id: string | null; created_at?: string | null }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.list(prefix, { limit: 1000, offset });
      if (error) throw new Error(error.message);
      out.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return out;
  };

  const expired: string[] = [];
  let checked = 0;
  try {
    for (const owner of (await list("")).filter((x) => x.id === null)) { // 폴더는 id가 null
      for (const video of (await list(owner.name)).filter((x) => x.id === null)) {
        for (const file of (await list(`${owner.name}/${video.name}`)).filter((x) => x.id !== null)) {
          checked += 1;
          if (file.created_at && new Date(file.created_at) < cutoff) expired.push(`${owner.name}/${video.name}/${file.name}`);
        }
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "list failed" }, { status: 500 });
  }

  let removed = 0, clearedVideos = 0;
  if (!dryRun) {
    for (let i = 0; i < expired.length; i += 100) {
      const batch = expired.slice(i, i + 100);
      const { error } = await storage.remove(batch);
      if (error) return NextResponse.json({ error: error.message, removed }, { status: 500 });
      removed += batch.length;
      for (const path of batch) {
        const { data } = await supabase.from("shorts_videos")
          .update({ rendered_video_url: null, render_status: null })
          .eq("rendered_video_url", storage.getPublicUrl(path).data.publicUrl)
          .select("id");
        clearedVideos += data?.length ?? 0;
      }
    }
  }
  console.log(`[cleanup-videos] cutoff ${cutoff.toISOString()} checked ${checked} expired ${expired.length} removed ${removed} cleared ${clearedVideos}${dryRun ? " (dry-run)" : ""}`);
  return NextResponse.json({ retentionDays: RETENTION_DAYS, cutoff: cutoff.toISOString(), checked, expired: expired.length, removed, clearedVideos, dryRun });
}
