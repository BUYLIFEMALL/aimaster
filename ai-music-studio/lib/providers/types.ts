import "server-only";
import type { GenerationInput, MusicModel } from "./catalog";
import { musicProviderError } from "./musicCalls";

/** 공급자가 돌려준 음원 하나 — 바로 받은 바이트(data) 또는 받아 갈 주소(url) */
export interface AudioFile {
  data?: Uint8Array;
  url?: string;
  /** 주소에서 받을 때 붙일 인증 머리글(Replicate 결과 주소 등) */
  fetchHeaders?: Record<string, string>;
  contentType?: string;
  durationS?: number;
  title?: string;
}

export type StartResult =
  /** 작업만 접수됨 — 상태 확인(poll)으로 결과를 받는다 */
  | { kind: "queued"; taskId: string; meta?: Record<string, unknown> }
  /** 요청 안에서 바로 완성됨 */
  | { kind: "done"; files: AudioFile[]; lyricsOut?: string; actual?: string };

export type PollResult =
  | { state: "processing" }
  | { state: "done"; files: AudioFile[]; lyricsOut?: string; actual?: string }
  | { state: "failed"; error: string };

export interface ProviderAdapter {
  /** 요청 안에서 끝나는 공급자(Gemini·ElevenLabs)는 true — 서버가 응답 뒤에서 기다려 저장한다 */
  synchronous: boolean;
  /** actual: v1.03 실측 비용·사용량 문구(공급자가 알려 주는 값만 — 없으면 비움) */
  start(model: MusicModel, input: GenerationInput, apiKey: string): Promise<StartResult>;
  poll?(model: MusicModel, taskId: string, meta: Record<string, unknown>, apiKey: string): Promise<PollResult>;
}

/** 공급자 오류 → 한국어 안내(공용 기준 코드 `music-sync-calls`의 함수를 그대로 쓴다 — fal·Replicate·Suno 어댑터도 같은 문구) */
export const providerError = musicProviderError;

/** 모델에 보낼 설명 문장(가사·길이·언어 포함) — 프롬프트 하나만 받는 모델용 */
export function composePrompt(input: GenerationInput, opts: { withLyrics: boolean; withDuration: boolean }): string {
  const parts = [input.prompt.trim()];
  if (input.language && input.language !== "auto") parts.push(`Language: ${input.language}.`);
  if (input.instrumental) parts.push("Instrumental only, no vocals.");
  if (opts.withDuration) parts.push(`Length: about ${input.durationS} seconds.`);
  if (opts.withLyrics && !input.instrumental && input.lyrics.trim()) parts.push(`Lyrics:\n${input.lyrics.trim()}`);
  return parts.join("\n\n");
}
