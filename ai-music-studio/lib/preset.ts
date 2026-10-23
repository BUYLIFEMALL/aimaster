// 「이 설정으로 다시 만들기」 — 지난 곡 기록에서 곡 만들기 화면에 미리 채울 값을 만든다(자동으로 만들지 않음).
// 순수 함수라 시험으로 확인한다. 숨김·없어진 모델이면 모델은 비우고 나머지만 채운다.
import { findModel } from "@/lib/providers/catalog";
import type { GenerationRow } from "@/lib/generationTypes";

export interface CreatePreset {
  fromTitle: string;
  modelKey: string | null;
  prompt: string;
  title: string;
  lyrics: string;
  instrumental: boolean;
  language: string;
  durationS: number;
  format: "mp3" | "wav";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isGenerationId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export function presetFromRow(row: Pick<GenerationRow, "provider" | "model" | "prompt" | "title" | "lyrics" | "instrumental" | "duration_s" | "options">): CreatePreset {
  const model = findModel(`${row.provider}:${row.model}`);
  const language = typeof row.options?.language === "string" && row.options.language ? row.options.language : "auto";
  const duration = Number.isFinite(row.duration_s) && (row.duration_s ?? 0) > 0 ? Math.round(row.duration_s as number) : 120;
  return {
    fromTitle: (row.title || row.prompt || "").slice(0, 60),
    modelKey: model?.key ?? null,
    prompt: row.prompt ?? "",
    title: row.title ?? "",
    lyrics: row.lyrics ?? "",
    instrumental: !!row.instrumental || (model ? !model.vocals : false),
    language,
    durationS: Math.max(10, Math.min(600, duration)),
    format: row.options?.format === "wav" && model?.wavOutput ? "wav" : "mp3",
  };
}
