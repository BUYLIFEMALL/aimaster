import "server-only";
import { checkSunoGenerationStatus, requestSunoGeneration, translateSunoErrorMessage } from "@/lib/ai/suno";
import type { ProviderAdapter } from "../types";

// Suno — 음악(SUNO)자동화(music/)의 sunoapi.org 연동 코드(lib/ai/suno.ts, 공용 기준 코드 사본)를 그대로 쓴다(2026-10-23 주인님 결정).
// 콜백 주소는 기준 코드에 음악(SUNO)자동화 주소로 고정돼 있어 그쪽 웹훅이 「모르는 작업 번호」로 무시한다(비용·데이터 영향 없음).
// 이 프로그램은 콜백을 쓰지 않고 회원 본인 키로 상태를 조회(record-info)해 결과를 받는다.
export const sunoAdapter: ProviderAdapter = {
  synchronous: false,
  async start(model, input, apiKey) {
    const title = (input.title || input.prompt).trim().slice(0, 80) || "AI 음악 스튜디오";
    const taskId = await requestSunoGeneration(
      {
        // custom 모드: 보컬곡은 prompt가 가사, 연주곡은 배경음악 설명
        prompt: input.instrumental ? input.prompt.trim() : input.lyrics.trim(),
        title,
        styleDescription: input.prompt.trim(),
        excludeStyles: "",
        instrumental: input.instrumental,
        model: model.model,
      },
      apiKey,
    );
    return { kind: "queued", taskId };
  },
  async poll(_model, taskId, _meta, apiKey) {
    const r = await checkSunoGenerationStatus(taskId, apiKey);
    if (r.state === "processing") return r;
    if (r.state === "failed") return { state: "failed", error: translateSunoErrorMessage(r.error) };
    const files = r.tracks
      .filter((t) => t.audio_url)
      .map((t) => ({ url: t.audio_url as string, durationS: t.duration, title: t.title }));
    if (!files.length) return { state: "failed", error: "Suno가 완료됐지만 음원 주소를 찾지 못했습니다." };
    return { state: "done", files };
  },
};
