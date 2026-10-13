import type { ImageProvider, Inputs, ModelLevel, Plan, PlanSection } from "./types";
import { DEFAULT_INPUTS, PLAN_SECTIONS } from "./types";
import { TEMPLATES } from "./templates";
import { normalizePlan } from "./plan";

const PROVIDERS: ImageProvider[] = ["loremflickr", "unsplash", "pexels", "pixabay"];
const MODELS: ModelLevel[] = ["pro", "standard"];

/** 클라이언트가 보낸 입력값을 길이·허용값으로 정리한다 */
export function cleanInputs(v: unknown): Inputs {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const s = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const templateId = TEMPLATES.some((t) => t.id === o.templateId) ? String(o.templateId) : DEFAULT_INPUTS.templateId;
  return {
    topic: s(o.topic, 200),
    target: s(o.target, 400),
    goal: s(o.goal, 400),
    templateId,
    imageProvider: PROVIDERS.includes(o.imageProvider as ImageProvider) ? (o.imageProvider as ImageProvider) : "loremflickr",
    model: MODELS.includes(o.model as ModelLevel) ? (o.model as ModelLevel) : "pro",
  };
}

export function missingInputs(i: Inputs): string | null {
  if (!i.topic) return "주제를 입력해 주세요.";
  if (!i.target) return "타겟을 입력해 주세요.";
  if (!i.goal) return "목표를 입력해 주세요.";
  return null;
}

export function isPlanSection(v: unknown): v is PlanSection {
  return typeof v === "string" && PLAN_SECTIONS.some((s) => s.key === v);
}

export function cleanPlan(v: unknown): Plan | null {
  return normalizePlan(v);
}
