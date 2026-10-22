// 생성 기록 타입 — 화면과 서버가 함께 쓴다(서버 전용 코드 없음).
import type { AspectRatio, ProviderId } from "@/lib/providers/catalog";

export interface OutputFile {
  path: string;
  contentType: string;
  bytes: number;
}

export interface GenerationRow {
  id: string;
  user_id: string;
  provider: ProviderId;
  model: string;
  status: "running" | "completed" | "failed";
  prompt: string;
  aspect_ratio: AspectRatio | null;
  duration_s: number;
  /** 시작·끝 장면 사진(비공개 저장소 경로) — 업체에는 1시간짜리 서명 주소로 넘긴다 */
  start_image: string | null;
  end_image: string | null;
  options: Record<string, unknown>;
  provider_task_id: string | null;
  /** 공용 videoProviders의 VideoJob(작업 번호·상태 확인 주소) */
  provider_meta: Record<string, unknown>;
  outputs: OutputFile[];
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

export type ClientGeneration = Omit<GenerationRow, "outputs" | "locked_until" | "provider_meta" | "user_id" | "provider_task_id" | "start_image" | "end_image"> & {
  outputs: ClientOutput[];
  modelName: string;
  expiresAt: string;
  startImageUrl: string | null;
};
