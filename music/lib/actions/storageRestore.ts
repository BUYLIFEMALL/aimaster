"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

// D-68-02(2026-10-22): 우리 저장소 복사가 실패하면 persistSunoAssetToStorage가 Suno 임시 주소를 그대로 저장한다(약 14일 뒤 만료).
// 화면이 그런 결과에 「임시 보관」 표시와 이 버튼을 보여 주고, 버튼은 임시 주소에서 다시 받아 우리 저장소에 저장한다.
// 회원 본인 행만 고친다(user_id 조건). 곡 변주·MR·WAV 표에는 회원 수정 정책이 없어 본인 확인 뒤 관리자 클라이언트로 고친다.
// v1.41: 실패 원인 확인 — Supabase 프로젝트 전체 업로드 한도가 50MB라(2026-10-22 시험: 45MB 성공·60MB 413) 약 4분 20초보다 긴
// 곡의 WAV는 저장이 거절된다. 그 경우는 「만료」가 아니라 「크기 초과 — 직접 내려받기」로 안내한다. 12트랙·Suno 커버·영상도 처리.

export type RestoreKind = "variant" | "remix_variant" | "mr" | "wav" | "stems" | "media";

export interface RestoreState {
  error?: string;
  restored?: number;
}

const BUCKET = "music-audio";
type Failure = "expired" | "too_large" | "failed";

function isOurs(url: string | null | undefined): boolean {
  return !url || url.includes("/storage/v1/object/");
}

/** 임시 주소에서 내려받아 저장한다. 실패를 조용히 임시 주소로 덮지 않고 이유를 돌려준다. */
async function copyStrict(path: string, sourceUrl: string, contentType: string): Promise<{ url: string } | { failure: Failure }> {
  const db = createAdminClient();
  try {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) return { failure: response.status === 404 || response.status === 403 || response.status === 410 ? "expired" : "failed" };
    const buffer = Buffer.from(await response.arrayBuffer());
    const { error } = await db.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
    if (error) {
      const status = Number((error as { statusCode?: string | number }).statusCode);
      return { failure: status === 413 || /maximum allowed size/i.test(error.message) ? "too_large" : "failed" };
    }
    return { url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  } catch {
    return { failure: "failed" };
  }
}

// 한 결과 안의 임시 주소 칸 하나: 어디에 저장하고(path) 어떻게 다시 써 넣는지(put)
interface Slot {
  url: string | null | undefined;
  path: string;
  contentType: string;
  put: (stored: string) => void;
}

interface Target {
  table: "music_track_variants" | "music_track_remix_variants" | "music_track_mr" | "music_track_wav" | "music_track_media";
  slots: Slot[];
  update: Record<string, unknown>; // put이 채운다
  revalidate: string;
}

async function planningPathOfTrack(trackId: string | null | undefined): Promise<string> {
  if (!trackId) return "/plannings";
  const { data } = await createAdminClient().from("music_tracks").select("planning_id").eq("id", trackId).maybeSingle();
  return data ? `/plannings/${data.planning_id}` : "/plannings";
}

async function planningPathOfVariant(variantId: string | null | undefined): Promise<string> {
  if (!variantId) return "/plannings";
  const { data } = await createAdminClient().from("music_track_variants").select("track_id").eq("id", variantId).maybeSingle();
  return planningPathOfTrack(data?.track_id);
}

const MP3 = "audio/mpeg";
const JPG = "image/jpeg";

async function findTarget(kind: RestoreKind, id: string, userId: string): Promise<Target | null> {
  const db = createAdminClient();
  const update: Record<string, unknown> = {};

  if (kind === "variant") {
    const { data } = await db.from("music_track_variants").select("track_id, audio_url, image_url").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!data) return null;
    const dir = `${userId}/${data.track_id}`;
    return {
      table: "music_track_variants",
      update,
      slots: [
        { url: data.audio_url, path: `${dir}/${id}.mp3`, contentType: MP3, put: (u) => (update.audio_url = u) },
        { url: data.image_url, path: `${dir}/${id}.jpg`, contentType: JPG, put: (u) => (update.image_url = u) },
      ],
      revalidate: await planningPathOfTrack(data.track_id),
    };
  }

  if (kind === "remix_variant") {
    const { data } = await db.from("music_track_remix_variants").select("remix_id, audio_url, image_url").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!data) return null;
    const { data: remix } = await db.from("music_track_remixes").select("source_id").eq("id", data.remix_id).maybeSingle();
    const dir = `${userId}/remix/${data.remix_id}`;
    return {
      table: "music_track_remix_variants",
      update,
      slots: [
        { url: data.audio_url, path: `${dir}/${id}.mp3`, contentType: MP3, put: (u) => (update.audio_url = u) },
        { url: data.image_url, path: `${dir}/${id}.jpg`, contentType: JPG, put: (u) => (update.image_url = u) },
      ],
      revalidate: remix?.source_id ? `/remix/${remix.source_id}` : "/remix",
    };
  }

  if (kind === "mr" || kind === "stems") {
    const { data } = await db.from("music_track_mr").select("variant_id, instrumental_url, vocal_url, stems").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!data) return null;
    const dir = `${userId}/${data.variant_id}`;
    const revalidate = await planningPathOfVariant(data.variant_id);
    if (kind === "mr") {
      return {
        table: "music_track_mr",
        update,
        slots: [
          { url: data.instrumental_url, path: `${dir}/mr-instrumental.mp3`, contentType: MP3, put: (u) => (update.instrumental_url = u) },
          { url: data.vocal_url, path: `${dir}/mr-vocal.mp3`, contentType: MP3, put: (u) => (update.vocal_url = u) },
        ],
        revalidate,
      };
    }
    const stems = { ...((data.stems ?? {}) as Record<string, string>) };
    return {
      table: "music_track_mr",
      update,
      slots: Object.entries(stems).map(([key, url]) => ({
        url,
        path: `${dir}/stem-${key}.mp3`,
        contentType: MP3,
        put: (u: string) => {
          stems[key] = u;
          update.stems = stems;
        },
      })),
      revalidate,
    };
  }

  if (kind === "wav") {
    const { data } = await db.from("music_track_wav").select("variant_id, wav_url").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!data) return null;
    return {
      table: "music_track_wav",
      update,
      slots: [{ url: data.wav_url, path: `${userId}/${data.variant_id}/converted.wav`, contentType: "audio/wav", put: (u) => (update.wav_url = u) }],
      revalidate: await planningPathOfVariant(data.variant_id),
    };
  }

  // media: Suno 커버(이미지 여러 장) · 뮤직비디오(MP4 1개) — lib/mediaSync.ts와 같은 경로
  const { data } = await db.from("music_track_media").select("track_id, variant_id, kind, urls").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  const urls = [...((data.urls ?? []) as string[])];
  return {
    table: "music_track_media",
    update,
    slots: urls.map((url, i) => {
      const isVideo = data.kind === "video";
      const ext = isVideo ? "mp4" : /\.jpe?g(\?|$)/i.test(url) ? "jpg" : "png";
      return {
        url,
        path: isVideo ? `${userId}/${data.variant_id ?? data.track_id}/suno-video.mp4` : `${userId}/${data.track_id}/suno-cover-${i}.${ext}`,
        contentType: isVideo ? "video/mp4" : ext === "jpg" ? JPG : "image/png",
        put: (u: string) => {
          urls[i] = u;
          update.urls = urls;
        },
      };
    }),
    revalidate: await planningPathOfTrack(data.track_id),
  };
}

const FAILURE_MESSAGE: Record<Failure, string> = {
  too_large:
    "파일이 50MB를 넘어 내 보관함에 저장할 수 없습니다(보통 4분 이상 곡의 WAV). Suno 임시 주소가 만료되기 전(약 14일)에 직접 내려받아 주세요.",
  expired: "Suno 임시 주소가 이미 만료돼 받을 수 없었습니다. 이 결과는 다시 만들어 주세요.",
  failed: "다시 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

/** 「📥 내 보관함에 다시 저장」 — 임시 주소로 남은 칸만 우리 저장소로 옮긴다. */
export async function restoreToStorageAction(kind: RestoreKind, id: string): Promise<RestoreState> {
  const user = await requireProgramAccess();
  const target = await findTarget(kind, id, user.id);
  if (!target) return { error: "결과를 찾을 수 없습니다. 화면을 새로고침해 주세요." };

  let restored = 0;
  const failures = new Set<Failure>();
  for (const slot of target.slots) {
    if (isOurs(slot.url)) continue;
    const result = await copyStrict(slot.path, slot.url!, slot.contentType);
    if ("url" in result) {
      slot.put(result.url);
      restored += 1;
    } else {
      failures.add(result.failure);
    }
  }
  if (restored) {
    // 표 5개 중 하나라 칸 타입을 한 번에 좁힐 수 없다 — 칸 이름은 findTarget이 그 표 칸으로만 정한다.
    const { error } = await createAdminClient()
      .from(target.table)
      .update(target.update as never)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath(target.revalidate);
  }
  const reason = (["too_large", "expired", "failed"] as const).find((f) => failures.has(f));
  return reason ? { restored, error: FAILURE_MESSAGE[reason] } : { restored };
}
