import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retentionCutoff } from "@/lib/retention";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 생성 콘텐츠 30일 자동 삭제(2026-10-21, lib/retention.ts). Vercel cron(vercel.json, 매일 새벽 3시 KST)이 부른다.
// 곡(트랙)·음원·커버·MR·WAV, 리믹스·리믹스 원곡을 생성일 기준 30일이 지나면 지운다(유예 마감 전에는 아무것도 안 함).
// 저장소 파일은 Storage API로 먼저 지우고 행을 지운다(행이 지워지면 파일 위치를 알 수 없어서).
// 정밀 기획 보관함(music_studio_projects)은 DB 예약 작업(pg_cron)이 따로 지운다.
const BUCKET = "music-audio";
const PREFIX = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
const BATCH = 100;

function pathOf(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith(PREFIX)) return null;
  return decodeURIComponent(url.slice(PREFIX.length).split("?")[0]) || null;
}

type Db = ReturnType<typeof createAdminClient>;

async function removeFiles(db: Db, urls: unknown[]): Promise<number> {
  const paths = Array.from(new Set(urls.map(pathOf).filter((p): p is string => !!p)));
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw new Error(`storage remove failed: ${error.message}`);
  }
  return paths.length;
}

export async function GET(request: NextRequest) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = retentionCutoff();
  if (!cutoff) return NextResponse.json({ ok: true, skipped: "grace period" });
  const iso = cutoff.toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const result = { tracks: 0, plannings: 0, remixes: 0, sources: 0, files: 0 };

  // 1) 곡(트랙): 음원·커버·MR·WAV 파일 → 트랙 행(변형·MR·WAV는 함께 지워짐)
  const { data: tracks } = await db
    .from("music_tracks")
    .select("id, music_track_variants!track_id(audio_url, image_url, music_track_mr(instrumental_url, vocal_url), music_track_wav(wav_url))")
    .lte("created_at", iso)
    .neq("status", "generating")
    .limit(BATCH);
  if (tracks?.length) {
    const urls: unknown[] = [];
    for (const t of tracks)
      for (const v of t.music_track_variants ?? []) {
        urls.push(v.audio_url, v.image_url);
        for (const m of v.music_track_mr ?? []) urls.push(m.instrumental_url, m.vocal_url);
        for (const w of v.music_track_wav ?? []) urls.push(w.wav_url);
      }
    result.files += await removeFiles(db, urls);
    const { error } = await db.from("music_tracks").delete().in("id", tracks.map((t: { id: string }) => t.id));
    if (error) throw new Error(`track delete failed: ${error.message}`);
    result.tracks = tracks.length;
  }

  // 2) 곡이 하나도 남지 않은 30일 지난 기획
  const { data: plannings } = await db
    .from("music_plannings")
    .select("id, music_tracks(id)")
    .lte("created_at", iso)
    .neq("status", "generating")
    .limit(BATCH);
  const emptyPlannings = (plannings ?? []).filter((p: { music_tracks: unknown[] }) => !p.music_tracks?.length);
  if (emptyPlannings.length) {
    await db.from("music_plannings").delete().in("id", emptyPlannings.map((p: { id: string }) => p.id));
    result.plannings = emptyPlannings.length;
  }

  // 3) 리믹스: 결과 음원·커버 → 리믹스 행(결과 행은 함께 지워짐)
  const { data: remixes } = await db
    .from("music_track_remixes")
    .select("id, music_track_remix_variants(audio_url, image_url)")
    .lte("created_at", iso)
    .neq("status", "generating")
    .limit(BATCH);
  if (remixes?.length) {
    const urls: unknown[] = [];
    for (const r of remixes) for (const v of r.music_track_remix_variants ?? []) urls.push(v.audio_url, v.image_url);
    result.files += await removeFiles(db, urls);
    await db.from("music_track_remixes").delete().in("id", remixes.map((r: { id: string }) => r.id));
    result.remixes = remixes.length;
  }

  // 4) 리믹스가 남지 않은 30일 지난 리믹스 원곡(직접 올린 원곡 파일만 지움 — 내 곡에서 고른 원곡은 그 곡이 지울 때 함께 지워짐)
  const { data: sources } = await db
    .from("music_remix_sources")
    .select("id, audio_url, music_track_remixes(id)")
    .lte("created_at", iso)
    .limit(BATCH);
  const emptySources = (sources ?? []).filter((s: { music_track_remixes: unknown[] }) => !s.music_track_remixes?.length);
  if (emptySources.length) {
    result.files += await removeFiles(
      db,
      emptySources.map((s: { audio_url: string }) => s.audio_url).filter((u: string) => u?.includes("/remix-sources/")),
    );
    await db.from("music_remix_sources").delete().in("id", emptySources.map((s: { id: string }) => s.id));
    result.sources = emptySources.length;
  }

  return NextResponse.json({ ok: true, cutoff: iso, ...result });
}
