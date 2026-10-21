"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

// D-68-02(2026-10-22): 우리 저장소 복사가 실패하면 persistSunoAssetToStorage가 Suno 임시 주소를 그대로 저장한다(약 14일 뒤 만료).
// 화면이 그런 결과에 「임시 보관」 표시와 이 버튼을 보여 주고, 버튼은 임시 주소에서 다시 받아 우리 저장소에 저장한다.
// 회원 본인 행만 고친다(user_id 조건). 곡 변주·MR·WAV 표에는 회원 수정 정책이 없어 본인 확인 뒤 관리자 클라이언트로 고친다.

export type RestoreKind = "variant" | "remix_variant" | "mr" | "wav";

export interface RestoreState {
  error?: string;
  restored?: number;
}

const BUCKET = "music-audio";

function isOurs(url: string | null): boolean {
  return !url || url.includes("/storage/v1/object/");
}

/** 임시 주소에서 내려받아 저장한다. 받을 수 없으면(만료 등) null — 실패를 조용히 임시 주소로 덮지 않는다. */
async function copyStrict(path: string, sourceUrl: string, contentType: string): Promise<string | null> {
  const db = createAdminClient();
  try {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const { error } = await db.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
    if (error) return null;
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

interface Target {
  table: "music_track_variants" | "music_track_remix_variants" | "music_track_mr" | "music_track_wav";
  // 칸 이름 → 저장 경로(확장자 포함)·형식
  columns: Record<string, { path: string; contentType: string }>;
  row: Record<string, string | null>;
  revalidate: string;
}

async function findTarget(kind: RestoreKind, id: string, userId: string): Promise<Target | null> {
  const db = createAdminClient();
  if (kind === "variant") {
    const { data } = await db.from("music_track_variants").select("id, track_id, audio_url, image_url").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!data) return null;
    const { data: track } = await db.from("music_tracks").select("planning_id").eq("id", data.track_id).maybeSingle();
    return {
      table: "music_track_variants",
      row: data,
      columns: {
        audio_url: { path: `${userId}/${data.track_id}/${id}.mp3`, contentType: "audio/mpeg" },
        image_url: { path: `${userId}/${data.track_id}/${id}.jpg`, contentType: "image/jpeg" },
      },
      revalidate: track ? `/plannings/${track.planning_id}` : "/plannings",
    };
  }
  if (kind === "remix_variant") {
    const { data } = await db.from("music_track_remix_variants").select("id, remix_id, audio_url, image_url").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!data) return null;
    const { data: remix } = await db.from("music_track_remixes").select("source_id").eq("id", data.remix_id).maybeSingle();
    return {
      table: "music_track_remix_variants",
      row: data,
      columns: {
        audio_url: { path: `${userId}/remix/${data.remix_id}/${id}.mp3`, contentType: "audio/mpeg" },
        image_url: { path: `${userId}/remix/${data.remix_id}/${id}.jpg`, contentType: "image/jpeg" },
      },
      revalidate: remix?.source_id ? `/remix/${remix.source_id}` : "/remix",
    };
  }
  const table = kind === "mr" ? "music_track_mr" : "music_track_wav";
  const cols = kind === "mr" ? "id, variant_id, instrumental_url, vocal_url" : "id, variant_id, wav_url";
  const { data } = await db.from(table).select(cols).eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  const row = data as unknown as Record<string, string | null>;
  const { data: variant } = await db.from("music_track_variants").select("track_id").eq("id", row.variant_id!).maybeSingle();
  const { data: track } = variant ? await db.from("music_tracks").select("planning_id").eq("id", variant.track_id).maybeSingle() : { data: null };
  const base = `${userId}/${row.variant_id}`;
  return {
    table,
    row,
    columns:
      kind === "mr"
        ? {
            instrumental_url: { path: `${base}/mr-instrumental.mp3`, contentType: "audio/mpeg" },
            vocal_url: { path: `${base}/mr-vocal.mp3`, contentType: "audio/mpeg" },
          }
        : { wav_url: { path: `${base}/converted.wav`, contentType: "audio/wav" } },
    revalidate: track ? `/plannings/${track.planning_id}` : "/plannings",
  };
}

/** 「📥 내 보관함에 다시 저장」 — 임시 주소로 남은 칸만 우리 저장소로 옮긴다. */
export async function restoreToStorageAction(kind: RestoreKind, id: string): Promise<RestoreState> {
  const user = await requireProgramAccess();
  const target = await findTarget(kind, id, user.id);
  if (!target) return { error: "결과를 찾을 수 없습니다. 화면을 새로고침해 주세요." };

  const update: Record<string, string> = {};
  let expired = 0;
  for (const [column, { path, contentType }] of Object.entries(target.columns)) {
    const url = target.row[column];
    if (isOurs(url)) continue;
    const stored = await copyStrict(path, url!, contentType);
    if (stored) update[column] = stored;
    else expired += 1;
  }
  if (Object.keys(update).length) {
    // 표 4개 중 하나라 칸 타입을 한 번에 좁힐 수 없다 — 칸 이름은 findTarget이 그 표 칸으로만 정한다.
    const { error } = await createAdminClient()
      .from(target.table)
      .update(update as never)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath(target.revalidate);
  }
  if (expired) {
    return {
      restored: Object.keys(update).length,
      error: "Suno 임시 주소가 이미 만료돼 받을 수 없었습니다. 이 결과는 다시 만들어 주세요.",
    };
  }
  return { restored: Object.keys(update).length };
}
