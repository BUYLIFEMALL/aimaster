import "server-only";
import type { GenerationInput, MusicModel } from "./catalog";

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
  | { kind: "done"; files: AudioFile[]; lyricsOut?: string };

export type PollResult =
  | { state: "processing" }
  | { state: "done"; files: AudioFile[]; lyricsOut?: string }
  | { state: "failed"; error: string };

export interface ProviderAdapter {
  /** 요청 안에서 끝나는 공급자(Gemini·ElevenLabs)는 true — 서버가 응답 뒤에서 기다려 저장한다 */
  synchronous: boolean;
  start(model: MusicModel, input: GenerationInput, apiKey: string): Promise<StartResult>;
  poll?(model: MusicModel, taskId: string, meta: Record<string, unknown>, apiKey: string): Promise<PollResult>;
}

/** 공급자 오류를 회원이 알아볼 수 있는 한국어 문장으로 바꾼다(원문은 짧게 뒤에 남김, 키 값은 넣지 않음) */
export function providerError(providerName: string, status: number, body: string): Error {
  const hint =
    status === 401 || status === 403
      ? " API 키를 확인해 주세요(API키등록·플랫폼연동)."
      : status === 402
        ? " 크레딧·결제 등록이 필요합니다. 해당 플랫폼에서 충전해 주세요."
        : status === 429
          ? " 요청 한도에 걸렸거나 크레딧이 부족합니다. 잠시 뒤 다시 시도하거나 플랫폼에서 확인해 주세요."
          : status === 422 || status === 400
            ? " 입력값을 받아들이지 않았습니다(가사·설명 길이나 금지된 표현을 확인해 주세요)."
            : status >= 500
              ? " 플랫폼 서버 오류입니다. 잠시 뒤 다시 시도해 주세요."
              : "";
  const raw = body.replace(/\s+/g, " ").slice(0, 300);
  return new Error(`${providerName} 요청이 실패했습니다. (${status})${hint}${raw ? ` 원문: ${raw}` : ""}`);
}

/** 모델에 보낼 설명 문장(가사·길이·언어 포함) — 프롬프트 하나만 받는 모델용 */
export function composePrompt(input: GenerationInput, opts: { withLyrics: boolean; withDuration: boolean }): string {
  const parts = [input.prompt.trim()];
  if (input.language && input.language !== "auto") parts.push(`Language: ${input.language}.`);
  if (input.instrumental) parts.push("Instrumental only, no vocals.");
  if (opts.withDuration) parts.push(`Length: about ${input.durationS} seconds.`);
  if (opts.withLyrics && !input.instrumental && input.lyrics.trim()) parts.push(`Lyrics:\n${input.lyrics.trim()}`);
  return parts.join("\n\n");
}
