import { DEFAULT_CANVAS, EMPTY_SPEC, type ProjectDoc } from "@/lib/canvas/types";
import { isValidComponentsArray, sanitizeComponents } from "@/lib/canvas/model";

export const MAX_DOC_BYTES = 2_000_000;
export const MAX_COMPONENTS = 1500;

/** 클라이언트가 보낸 문서를 저장 가능한 모양으로 검증·정리한다. 잘못되면 null. */
export function sanitizeDoc(input: unknown): ProjectDoc | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  if (!isValidComponentsArray(d.components)) return null;
  if (d.components.length > MAX_COMPONENTS) return null;
  const spec = (d.spec && typeof d.spec === "object" ? d.spec : {}) as Record<string, unknown>;
  const canvas = (d.canvas && typeof d.canvas === "object" ? d.canvas : {}) as Record<string, unknown>;
  const width = Number(canvas.width);
  const height = Number(canvas.height);
  return {
    components: sanitizeComponents(d.components),
    spec: {
      appName: String(spec.appName ?? EMPTY_SPEC.appName).slice(0, 200),
      appDescription: String(spec.appDescription ?? "").slice(0, 8000),
      screenDescription: String(spec.screenDescription ?? "").slice(0, 8000),
    },
    canvas: {
      width: Number.isFinite(width) ? Math.min(4000, Math.max(200, Math.round(width))) : DEFAULT_CANVAS.width,
      height: Number.isFinite(height) ? Math.min(4000, Math.max(200, Math.round(height))) : DEFAULT_CANVAS.height,
    },
    dark: !!d.dark,
  };
}

export function cleanName(value: unknown): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return s || "제목 없는 디자인";
}

export const EMPTY_DOC: ProjectDoc = { components: [], spec: { ...EMPTY_SPEC }, canvas: { ...DEFAULT_CANVAS }, dark: false };
