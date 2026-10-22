import "server-only";
import { checkSunoCredits, checkSunoGenerationStatus, requestSunoGeneration, translateSunoErrorMessage } from "@/lib/ai/suno";
import type { ProviderAdapter } from "../types";
import { APP_ORIGIN } from "@/lib/appUrl";

// Suno — 음악(SUNO)자동화(music/)의 sunoapi.org 연동 코드(lib/ai/suno.ts, 공용 기준 코드 사본)를 그대로 쓴다(2026-10-23 주인님 결정).
// v1.03부터 콜백 주소를 이 프로그램(/api/webhooks/suno)으로 넘긴다(기준 코드 `callbackOrigin` 선택값). 콜백은 신호로만 쓰고,
// 결과는 회원 본인 키로 상태를 조회(record-info)해 받는다(위조 콜백 방지 — music v1.37과 같은 방식).
export const sunoAdapter: ProviderAdapter = {
  synchronous: false,
  async start(model, input, apiKey) {
    const title = (input.title || input.prompt).trim().slice(0, 80) || "AI 음악 스튜디오";
    // v1.03 실측: 요청 직전 크레딧(무료 조회)을 기억했다가 완료 때 다시 조회해 차이를 기록한다
    const creditsBefore = await checkSunoCredits(apiKey).catch(() => null);
    const taskId = await requestSunoGeneration(
      {
        // custom 모드: 보컬곡은 prompt가 가사, 연주곡은 배경음악 설명
        prompt: input.instrumental ? input.prompt.trim() : input.lyrics.trim(),
        title,
        styleDescription: input.prompt.trim(),
        excludeStyles: "",
        instrumental: input.instrumental,
        model: model.model,
        callbackOrigin: APP_ORIGIN, // v1.03 이 프로그램 /api/webhooks/suno 로 신호를 받는다(기준 코드의 선택값)
      },
      apiKey,
    );
    return { kind: "queued", taskId, meta: creditsBefore == null ? {} : { credits_before: creditsBefore } };
  },
  async poll(_model, taskId, meta, apiKey) {
    const r = await checkSunoGenerationStatus(taskId, apiKey);
    if (r.state === "processing") return r;
    if (r.state === "failed") return { state: "failed", error: translateSunoErrorMessage(r.error) };
    const files = r.tracks
      .filter((t) => t.audio_url)
      .map((t) => ({ url: t.audio_url as string, durationS: t.duration, title: t.title }));
    if (!files.length) return { state: "failed", error: "Suno가 완료됐지만 음원 주소를 찾지 못했습니다." };
    const before = typeof meta.credits_before === "number" ? meta.credits_before : null;
    const after = before == null ? null : await checkSunoCredits(apiKey).catch(() => null);
    const used = before != null && after != null ? before - after : null;
    // 같은 시간에 같은 키로 다른 Suno 작업(음악(SUNO)자동화 포함)이 있으면 차이에 함께 잡힐 수 있어 「약」으로 표시
    return { state: "done", files, ...(used != null && used >= 0 ? { actual: `sunoapi.org 크레딧 약 ${used} 사용(남은 ${after})` } : {}) };
  },
};
