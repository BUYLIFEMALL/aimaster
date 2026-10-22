import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REEL_COVER_BUCKET, reelCoverFolder } from "@/lib/instagram/reelCover";
import { pruneSegmentImages } from "@/lib/sceneImageCleanup";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 「브라우저에서 만들기」 완성 MP4 30일 정리(최상위 규칙: 생성 데이터는 생성일 기준 30일 후 삭제) — 2026-10-21 v1.24.
// 버킷 shots-videos의 `<회원 id>/<영상 id>/<시각>.mp4` 중 만든 지 30일이 지난 파일을 지우고, 그 주소를 쓰던 영상의 완성 상태를 비운다.
// v1.35·v1.36: 릴스 표지·장면 이미지(shorts-images)도 30일 지나면 지운다(장면 기록의 주소도 비움).
// v1.27: 보관 음성(shots-bgm `<회원 id>/<영상 id>/voice/*.mp3`)도 만든 지 30일이 지나면 지운다(배경음악 트랙 파일은 대상 아님).
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

  const list = async (prefix: string, bucket = storage) => {
    const out: { name: string; id: string | null; created_at?: string | null; updated_at?: string | null }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
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

  const voiceStorage = supabase.storage.from("shots-bgm");
  const expiredVoices: string[] = [];
  try {
    for (const owner of (await list("", voiceStorage)).filter((x) => x.id === null)) {
      for (const video of (await list(owner.name, voiceStorage)).filter((x) => x.id === null)) {
        for (const file of (await list(`${owner.name}/${video.name}/voice`, voiceStorage)).filter((x) => x.id !== null)) {
          checked += 1;
          if (file.created_at && new Date(file.created_at) < cutoff) expiredVoices.push(`${owner.name}/${video.name}/voice/${file.name}`);
        }
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "voice list failed" }, { status: 500 });
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
  let removedVoices = 0;
  if (!dryRun) {
    for (let i = 0; i < expiredVoices.length; i += 100) {
      const batch = expiredVoices.slice(i, i + 100);
      const { error } = await voiceStorage.remove(batch);
      if (error) return NextResponse.json({ error: error.message, removed, removedVoices }, { status: 500 });
      removedVoices += batch.length;
    }
  }

  // v1.35: 릴스 표지(shorts-images `<회원 id>/covers/<영상 id>.jpg`)도 만든(마지막으로 올린) 지 30일이 지나면 지운다
  const coverStorage = supabase.storage.from(REEL_COVER_BUCKET);
  const expiredCovers: string[] = [];
  let removedCovers = 0;
  try {
    for (const owner of (await list("", coverStorage)).filter((x) => x.id === null)) {
      for (const file of (await list(reelCoverFolder(owner.name), coverStorage)).filter((x) => x.id !== null)) {
        checked += 1;
        const at = file.updated_at ?? file.created_at;
        if (at && new Date(at) < cutoff) expiredCovers.push(`${reelCoverFolder(owner.name)}/${file.name}`);
      }
    }
    if (!dryRun) {
      for (let i = 0; i < expiredCovers.length; i += 100) {
        const batch = expiredCovers.slice(i, i + 100);
        const { error } = await coverStorage.remove(batch);
        if (error) throw new Error(error.message);
        removedCovers += batch.length;
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "cover cleanup failed", removed, removedVoices, removedCovers }, { status: 500 });
  }
  console.log(`[cleanup-videos] covers expired ${expiredCovers.length} removed ${removedCovers}`);

  // v1.36: 장면 이미지(shorts-images `<회원 id>/<영상 id>-<장면>-<uuid>.*`)도 만든 지 30일이 지나면 지우고,
  // 장면 기록(image_urls 이력·image_url 선택)에서 그 주소를 뺀다 → 화면은 기존 「이 이미지 생성」 상태로 보인다.
  const expiredImages: string[] = [];
  let removedImages = 0, clearedSegments = 0;
  try {
    for (const owner of (await list("", coverStorage)).filter((x) => x.id === null)) {
      for (const file of (await list(owner.name, coverStorage)).filter((x) => x.id !== null)) {
        checked += 1;
        if (file.created_at && new Date(file.created_at) < cutoff) expiredImages.push(`${owner.name}/${file.name}`);
      }
    }
    if (!dryRun) {
      for (let i = 0; i < expiredImages.length; i += 100) {
        const batch = expiredImages.slice(i, i + 100);
        const { error } = await coverStorage.remove(batch);
        if (error) throw new Error(error.message);
        removedImages += batch.length;
        const urls = batch.map((p) => coverStorage.getPublicUrl(p).data.publicUrl);
        const removedSet = new Set(urls);
        const [byHistory, bySelected] = await Promise.all([
          supabase.from("shorts_video_segments").select("id, image_url, image_urls").overlaps("image_urls", urls),
          supabase.from("shorts_video_segments").select("id, image_url, image_urls").in("image_url", urls),
        ]);
        if (byHistory.error || bySelected.error) throw new Error((byHistory.error ?? bySelected.error)!.message);
        const segs = new Map([...(byHistory.data ?? []), ...(bySelected.data ?? [])].map((s) => [s.id, s]));
        for (const seg of segs.values()) {
          const next = pruneSegmentImages(seg, removedSet);
          if (!next) continue;
          const { error: upErr } = await supabase.from("shorts_video_segments").update(next).eq("id", seg.id);
          if (upErr) throw new Error(upErr.message);
          clearedSegments += 1;
        }
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "scene image cleanup failed", removed, removedVoices, removedCovers, removedImages, clearedSegments }, { status: 500 });
  }
  console.log(`[cleanup-videos] scene images expired ${expiredImages.length} removed ${removedImages} segments ${clearedSegments}`);
  console.log(`[cleanup-videos] voices expired ${expiredVoices.length} removed ${removedVoices}`);
  console.log(`[cleanup-videos] cutoff ${cutoff.toISOString()} checked ${checked} expired ${expired.length} removed ${removed} cleared ${clearedVideos}${dryRun ? " (dry-run)" : ""}`);
  return NextResponse.json({ retentionDays: RETENTION_DAYS, cutoff: cutoff.toISOString(), checked, expired: expired.length, removed, clearedVideos, expiredVoices: expiredVoices.length, removedVoices, expiredCovers: expiredCovers.length, removedCovers, expiredImages: expiredImages.length, removedImages, clearedSegments, dryRun });
}
