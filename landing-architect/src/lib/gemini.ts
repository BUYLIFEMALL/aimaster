import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import type { Inputs, ModelLevel, Plan, PlanSection } from "@/lib/lpa/types";
import { codePrompt, planPrompt, sectionPrompt, suggestPrompt, SYSTEM_INSTRUCTION } from "@/lib/lpa/prompts";
import { normalizePlan, normalizeSection, parseJsonLoose } from "@/lib/lpa/plan";
import { extractHtml, validateHtml } from "@/lib/lpa/html";
import { templateById } from "@/lib/lpa/templates";

// 모델명은 자주 바뀌므로 한곳에서 관리한다. 앞 모델을 쓸 수 없으면 다음 모델로 자동 폴백한다.
export const MODEL_CHAIN: Record<ModelLevel, string[]> = {
  pro: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
  standard: ["gemini-2.5-flash"],
};

export type AiErrorCode = "key" | "quota" | "timeout" | "parse" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message = "") { super(message); }
}

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키 값은 절대 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number } {
  const table: Record<AiErrorCode, { message: string; status: number }> = {
    key: { message: "등록한 Gemini API 키가 올바르지 않거나 이 기능을 쓸 권한이 없습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.", status: 400 },
    quota: { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google 계정의 한도를 확인해 주세요.", status: 429 },
    timeout: { message: "AI 응답이 늦어 중단되었습니다. 잠시 후 다시 시도해 주세요.", status: 504 },
    parse: { message: "AI가 올바른 형식으로 응답하지 못했습니다. 다시 시도해 주세요.", status: 502 },
    unknown: { message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 500 },
  };
  if (e instanceof AiError) return { code: e.code, ...table[e.code] };
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  if (/api key|api_key|permission|unauthenticated|\b401\b|\b403\b/.test(raw)) return { code: "key", ...table.key };
  if (/quota|resource_exhausted|\b429\b|rate/.test(raw)) return { code: "quota", ...table.quota };
  if (/timeout|deadline|\b503\b|\b504\b|unavailable|abort/.test(raw)) return { code: "timeout", ...table.timeout };
  return { code: "unknown", ...table.unknown };
}

function isModelUnavailable(e: unknown): boolean {
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  return /not found|\b404\b|is not supported|unsupported model|does not exist/.test(raw);
}

async function generate(apiKey: string, level: ModelLevel, contents: string, config: Record<string, unknown> = {}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  let last: unknown;
  for (const model of MODEL_CHAIN[level]) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7, ...config },
      });
      if (res.text) return res.text;
      last = new AiError("parse");
    } catch (e) {
      last = e;
      if (!isModelUnavailable(e)) throw e;
    }
  }
  throw last ?? new AiError("unknown");
}

export async function suggest(apiKey: string, topic: string): Promise<{ target: string; goal: string }> {
  const text = await generate(apiKey, "standard", suggestPrompt(topic), {
    responseMimeType: "application/json",
    responseSchema: { type: Type.OBJECT, properties: { target: { type: Type.STRING }, goal: { type: Type.STRING } }, required: ["target", "goal"] },
  });
  const o = parseJsonLoose(text) as { target?: unknown; goal?: unknown } | null;
  const target = typeof o?.target === "string" ? o.target.trim().slice(0, 400) : "";
  const goal = typeof o?.goal === "string" ? o.goal.trim().slice(0, 400) : "";
  if (!target || !goal) throw new AiError("parse");
  return { target, goal };
}

/** 기획안 생성. JSON 형식이 어긋나면 한 번 더 시도한다. */
export async function makePlan(apiKey: string, inputs: Inputs): Promise<Plan> {
  const layout = templateById(inputs.templateId).type;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await generate(apiKey, inputs.model, planPrompt(inputs), { responseMimeType: "application/json" });
    const plan = normalizePlan(parseJsonLoose(text), layout);
    if (plan) {
      // 화면 입력값이 기준이다(모델이 바꿔 쓴 경우 되돌린다)
      plan.projectInfo.topic = inputs.topic;
      plan.projectInfo.target = inputs.target;
      plan.projectInfo.goal = inputs.goal;
      return plan;
    }
  }
  throw new AiError("parse");
}

export async function remakeSection(apiKey: string, inputs: Inputs, plan: Plan, section: PlanSection): Promise<Plan[PlanSection]> {
  const text = await generate(apiKey, inputs.model, sectionPrompt(inputs, plan, section), { responseMimeType: "application/json" });
  const value = normalizeSection(section, parseJsonLoose(text), plan.projectInfo.layoutType);
  if (!value) throw new AiError("parse");
  return value;
}

/** 프로토타입 HTML 생성. 요청마다 기획안을 모두 담는 무상태 호출이다. */
export async function makeHtml(apiKey: string, level: ModelLevel, plan: Plan): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await generate(apiKey, level, codePrompt(plan), { temperature: 0.6, maxOutputTokens: 60000 });
    const html = extractHtml(text);
    if (html && !validateHtml(html)) return html;
  }
  throw new AiError("parse");
}
