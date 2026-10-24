import { UUID } from "../bots/core";
import { CompatibleChatError } from "../compatibleChat/config";

export const DOC_RETENTION_MS = 30 * 86400000;
export const PREVIEW_CHUNKS = 20;
export const EXTRACTION_WARNING = "possible_text_extraction_issue";
export const EXTRACTION_WARNING_TEXT = "글꼴 유니코드 매핑이나 텍스트 추출 문제로 일부 글자가 비정상일 수 있습니다. 미리보기에서 원문과 대조해 주세요. 자동 OCR·재파싱은 하지 않았습니다.";
export type DocumentInfo = { id: string; name: string; category: string; processing_status: "processing" | "ready"; extraction_warning: string | null; created_at: string; chunk_count: number; size_bytes: number };

export function documentCutoff(now = new Date()): string { return new Date(now.getTime() - DOC_RETENTION_MS).toISOString(); }

/** undefined/null=전체, []=잘못된 빈 선택. 옛 단일 ID와 새 선택이 충돌해도 조용히 넓히지 않는다. */
export function documentSelection(body: Record<string, unknown>): string[] | null {
  const legacy = body.documentId;
  if (legacy !== undefined && legacy !== null && (typeof legacy !== "string" || !UUID.test(legacy))) throw new CompatibleChatError("선택한 문서를 다시 확인해 주세요.");
  if (body.documentIds === undefined || body.documentIds === null) return typeof legacy === "string" ? [legacy.toLowerCase()] : null;
  if (!Array.isArray(body.documentIds) || !body.documentIds.length || body.documentIds.length > 30 || body.documentIds.some((id) => typeof id !== "string" || !UUID.test(id))) throw new CompatibleChatError("참고 문서를 1~30개 선택하거나 전체 문서를 선택해 주세요.");
  const ids = [...new Set((body.documentIds as string[]).map((id) => id.toLowerCase()))];
  if (typeof legacy === "string" && (ids.length !== 1 || ids[0] !== legacy.toLowerCase())) throw new CompatibleChatError("문서 선택값이 서로 다릅니다. 참고 문서를 다시 선택해 주세요.");
  return ids;
}

export function categoryValue(value: unknown): string {
  if (typeof value !== "string" || value.trim().length > 40 || /[\r\n\u0000-\u001f]/.test(value)) throw new CompatibleChatError("문서 분류는 줄바꿈 없이 40자 이하로 입력해 주세요.");
  return value.trim();
}

/** PDF 추출의 의심 신호일 뿐 파일 손상·한글 여부의 확정 진단이 아니다. */
export function pdfExtractionWarning(name: string, text: string): string | null {
  if (!/\.pdf$/i.test(name)) return null;
  const compact = text.normalize("NFC").replace(/\s/g, "");
  if (!compact.length) return EXTRACTION_WARNING;
  const replacements = (compact.match(/\ufffd/g) ?? []).length;
  const controls = (compact.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g) ?? []).length;
  const jamo = (compact.match(/[\u1100-\u11ff\u3130-\u318f]/g) ?? []).length;
  return (replacements >= 3 && replacements / compact.length >= 0.02) || (controls >= 3 && controls / compact.length >= 0.02) || (jamo >= 20 && jamo / compact.length > 0.6) ? EXTRACTION_WARNING : null;
}
