import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiProvider } from "@/lib/ai/models";
import type { AnalysisRecord, AnalysisSummary, DnaMode, DnaResult, PaletteColor, RefineEntry } from "./types";

export const BUCKET = "style-dna-images";
export const MAX_ANALYSES = 100;

const SIGN_SECONDS = 6 * 60 * 60;

/** 원본 이미지 서명 주소(버킷은 v1.23부터 비공개). 경로 → 주소 */
export async function signImagePaths(paths: string[]): Promise<Record<string, string>> {
  const list = Array.from(new Set(paths.filter(Boolean)));
  const out: Record<string, string> = {};
  if (!list.length) return out;
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(list, SIGN_SECONDS);
  for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}

/** 화면으로 보낼 기록(원본 이미지 서명 주소 포함) */
export async function toSignedRecord(row: Record<string, unknown>): Promise<AnalysisRecord> {
  return toRecord(row, await signImagePaths([row.image_path as string]));
}

/** DB 행 → 기록. signed가 없으면 imageUrl은 빈 값(서버 안에서만 쓰는 경우) */
export function toRecord(row: Record<string, unknown>, signed: Record<string, string> = {}): AnalysisRecord {
  return {
    id: row.id as string,
    title: row.title as string,
    mode: row.mode as DnaMode,
    guidance: (row.guidance as string) ?? "",
    engine: row.engine as { provider: AiProvider; model: string },
    imageUrl: signed[row.image_path as string] ?? "",
    aspectRatio: (row.aspect_ratio as string) ?? "1:1",
    palette: (row.palette as PaletteColor[]) ?? [],
    result: row.result as DnaResult,
    history: (row.history as RefineEntry[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function toSummary(row: Record<string, unknown>, signed: Record<string, string>): AnalysisSummary {
  return {
    id: row.id as string,
    title: row.title as string,
    mode: row.mode as DnaMode,
    imageUrl: signed[row.image_path as string] ?? "",
    palette: ((row.palette as PaletteColor[]) ?? []).slice(0, 5),
    createdAt: row.created_at as string,
  };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
