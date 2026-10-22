import type { Aspect, ModelLevel, OutputItem } from "./types";

/**
 * 「이 컷만 다시」(v1.18): 연속 스토리·이미지 레시피 기록에서 한 장만 다시 만든다(이미지 1장 비용).
 * 스토리는 바로 앞 컷 그림 + 등장인물 설명 + 그 장면 문장으로, 레시피는 요리 이름 + 그 단계 설명으로 그린다.
 */
export interface RecutPlan {
  mode: "story" | "recipe";
  index: number;
  total: number;
  /** 스토리: 장면 문장 / 레시피: 그 단계 설명(화면에 그대로 다시 붙임) */
  text: string;
  /** 스토리: 참고할 앞 그림 경로(첫 컷은 처음 올린 원본, 이미 지워졌으면 없음) */
  prevPath: string | null;
  character: string;
  dish: string;
  stepPrompt: string;
  aspect: Aspect;
  model: ModelLevel;
}

export interface RecutRow { kind: string; prompt: string | null; options: unknown; outputs: unknown; input_paths: unknown }

/** 동시에 들어온 두 번째 요청을 막는 선점 시간(이미지 1장 + 저장이 끝나기에 넉넉한 시간) */
export const RECUT_LOCK_MS = 4 * 60 * 1000;

/** 기록과 컷 번호로 다시 만들 계획을 세운다. 안 되면 회원에게 보여 줄 한국어 안내(string)를 돌려준다. */
export function recutPlan(row: RecutRow, rawIndex: unknown): RecutPlan | string {
  if (row.kind !== "story" && row.kind !== "recipe") return "연속 스토리와 이미지 레시피만 한 장씩 다시 만들 수 있습니다.";
  const outputs = (Array.isArray(row.outputs) ? row.outputs : []) as OutputItem[];
  const index = Number(rawIndex);
  if (!Number.isInteger(index) || index < 0 || index >= outputs.length) return "다시 만들 컷을 찾을 수 없습니다.";
  const o = (row.options && typeof row.options === "object" ? row.options : {}) as Record<string, unknown>;
  const model: ModelLevel = o.model === "pro" ? "pro" : "flash";
  const text = typeof outputs[index]?.text === "string" ? outputs[index].text!.trim() : "";
  if (!text) return "이 컷의 장면 설명이 없어 다시 만들 수 없습니다.";

  if (row.kind === "story") {
    const inputs = (Array.isArray(row.input_paths) ? row.input_paths : []).filter((x): x is string => typeof x === "string");
    const prevPath = index > 0 ? outputs[index - 1]?.path || null : inputs[0] ?? null;
    const character = typeof o.storyCharacter === "string" ? o.storyCharacter.slice(0, 400) : "";
    return { mode: "story", index, total: outputs.length, text, prevPath, character, dish: "", stepPrompt: "", aspect: "16:9", model };
  }
  const steps = Array.isArray(o.stepPrompts) ? o.stepPrompts : [];
  const stepPrompt = typeof steps[index] === "string" && steps[index].trim() ? String(steps[index]).slice(0, 600) : text;
  const dish = (row.prompt ?? "").trim();
  if (!dish) return "요리 이름이 없어 다시 만들 수 없습니다.";
  return { mode: "recipe", index, total: outputs.length, text, prevPath: null, character: "", dish, stepPrompt, aspect: "4:3", model };
}

/** 한 칸만 바꾼 새 결과 목록(나머지 컷은 그대로) */
export function replaceOutput(outputs: OutputItem[], index: number, item: OutputItem): OutputItem[] {
  return outputs.map((x, i) => (i === index ? item : x));
}
