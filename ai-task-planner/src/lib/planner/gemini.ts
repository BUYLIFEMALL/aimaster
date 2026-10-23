import "server-only";
import { analysisSchema, analysisPrompt, type analysisData } from "./ai";
import { z } from "zod";
import { PlannerError } from "./engine";

export async function analyzeWithGemini(apiKey: string, model: string, data: ReturnType<typeof analysisData>) {
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, cache: "no-store", signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({ contents: [{ parts: [{ text: analysisPrompt(data) }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(analysisSchema), maxOutputTokens: 4096 } })
    });
  } catch { throw new PlannerError("AI 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.", 503); }
  // 공급사의 오류 본문에는 키/내부 요청이 있을 수 있어 반환하거나 기록하지 않습니다.
  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403 || status === 400) throw new PlannerError("등록한 본인 Gemini 키와 모델 사용 권한을 확인해주세요.", 400);
    if (status === 429) throw new PlannerError("본인 Gemini 계정의 사용 한도를 확인하거나 잠시 후 다시 시도해주세요.", 429);
    if (status === 404) throw new PlannerError("선택한 Gemini 모델을 사용할 수 없습니다. 설정에서 다른 모델을 선택해주세요.", 400);
    throw new PlannerError("AI 서버에 일시적인 오류가 발생했습니다. 다시 시도해주세요.", 503);
  }
  try {
    const body = await response.json();
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason !== "STOP") throw new Error("incomplete");
    const text = candidate.content?.parts?.filter((p: { text?: string; thought?: boolean }) => !p.thought && typeof p.text === "string").map((p: { text: string }) => p.text).join("");
    return analysisSchema.parse(JSON.parse(text));
  } catch { throw new PlannerError("AI 응답 형식이 올바르지 않습니다. 기록은 보존됐으며 다시 분석할 수 있습니다.", 502); }
}
