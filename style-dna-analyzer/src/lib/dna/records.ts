import "server-only";
import type { AiProvider } from "@/lib/ai/models";
import type { AnalysisRecord, AnalysisSummary, DnaMode, DnaResult, PaletteColor, RefineEntry } from "./types";

export const BUCKET = "style-dna-images";
export const MAX_ANALYSES = 100;

export function publicImageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** DB 행 → 화면용 기록 */
export function toRecord(row: Record<string, unknown>): AnalysisRecord {
  return {
    id: row.id as string,
    title: row.title as string,
    mode: row.mode as DnaMode,
    guidance: (row.guidance as string) ?? "",
    engine: row.engine as { provider: AiProvider; model: string },
    imageUrl: publicImageUrl(row.image_path as string),
    aspectRatio: (row.aspect_ratio as string) ?? "1:1",
    palette: (row.palette as PaletteColor[]) ?? [],
    result: row.result as DnaResult,
    history: (row.history as RefineEntry[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function toSummary(row: Record<string, unknown>): AnalysisSummary {
  return {
    id: row.id as string,
    title: row.title as string,
    mode: row.mode as DnaMode,
    imageUrl: publicImageUrl(row.image_path as string),
    palette: ((row.palette as PaletteColor[]) ?? []).slice(0, 5),
    createdAt: row.created_at as string,
  };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
