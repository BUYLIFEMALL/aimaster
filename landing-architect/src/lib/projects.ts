import type { ProjectDoc } from "@/lib/lpa/types";
import { EMPTY_DOC } from "@/lib/lpa/types";
import { cleanInputs, cleanPlan } from "@/lib/lpa/validate";
import { MAX_HTML_BYTES, validateHtml } from "@/lib/lpa/html";

export const MAX_BODY_BYTES = 1_500_000;
export const MAX_PROJECTS = 50;
export { EMPTY_DOC };

/** 클라이언트가 보낸 문서를 저장 가능한 모양으로 정리한다. 잘못되면 null */
export function sanitizeDoc(input: unknown): ProjectDoc | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  const plan = d.plan == null ? null : cleanPlan(d.plan);
  if (d.plan != null && !plan) return null;
  let html = "";
  if (typeof d.html === "string" && d.html) {
    if (d.html.length > MAX_HTML_BYTES || validateHtml(d.html)) return null;
    html = d.html;
  }
  return { inputs: cleanInputs(d.inputs), plan, html };
}

export function stageOf(doc: ProjectDoc): "input" | "plan" | "code" {
  return doc.html ? "code" : doc.plan ? "plan" : "input";
}

export function cleanName(value: unknown): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return s || "제목 없는 기획";
}
