// 생성 기록 타입 — 화면과 서버가 함께 쓴다(서버 전용 코드 없음).
import type { ProviderId } from "@/lib/providers/catalog";

export interface OutputFile {
  path: string;
  contentType: string;
  bytes: number;
  durationS?: number;
  title?: string;
}

export interface GenerationRow {
  id: string;
  user_id: string;
  compare_group: string | null;
  provider: ProviderId;
  model: string;
  status: "running" | "completed" | "failed";
  title: string | null;
  prompt: string;
  lyrics: string | null;
  instrumental: boolean;
  duration_s: number | null;
  options: Record<string, unknown>;
  provider_task_id: string | null;
  provider_meta: Record<string, unknown>;
  outputs: OutputFile[];
  lyrics_out: string | null;
  error_message: string | null;
  est_cost_usd: number | null;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientOutput extends OutputFile {
  url: string | null;
  downloadUrl: string | null;
}

export type ClientGeneration = Omit<GenerationRow, "outputs" | "locked_until" | "provider_meta" | "user_id" | "provider_task_id"> & {
  outputs: ClientOutput[];
  modelName: string;
  expiresAt: string;
};
