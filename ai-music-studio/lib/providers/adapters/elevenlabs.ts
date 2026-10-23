import "server-only";
import { composePrompt, type ProviderAdapter } from "../types";
import { buildCompositionPlan, planSeconds } from "../elevenlabsPlan";
import { callElevenLabsMusic } from "../musicCalls";

// ElevenLabs Eleven Music — 2026-10-23 공식 문서(elevenlabs.io/docs/api-reference/music/compose) 기준.
// 호출 자체는 공용 기준 코드 `music-sync-calls`(../musicCalls.ts, 쇼츠가 사본 사용). 여기서는 요청 본문·비용 문구만.
// v1.03 가사에 [Verse]·[Chorus] 구간 표시가 있으면 작곡 계획(composition_plan — 구간별 가사·길이 지정)으로, 없으면 설명(prompt) 방식. 자동 재시도 없음(이중 과금 방지).
export const elevenlabsAdapter: ProviderAdapter = {
  synchronous: true,
  async start(model, input, apiKey) {
    const plan = input.instrumental ? null : buildCompositionPlan(input.lyrics, input.prompt, input.durationS);
    const body = plan
      ? { composition_plan: plan, model_id: model.model }
      : {
          prompt: composePrompt(input, { withLyrics: true, withDuration: false }).slice(0, 4000),
          music_length_ms: Math.min(600_000, Math.max(3_000, input.durationS * 1000)),
          model_id: model.model,
          force_instrumental: input.instrumental,
        };
    const out = await callElevenLabsMusic(body, apiKey);
    const seconds = plan ? planSeconds(plan) : input.durationS;
    return {
      kind: "done",
      files: [{ data: out.data, contentType: out.contentType, durationS: seconds }],
      actual: `${plan ? `작곡 계획 ${plan.chunks.length}구간 · ` : ""}${seconds}초 × 1분당 $0.15 ≈ $${((seconds / 60) * 0.15).toFixed(2)}`,
    };
  },
};
