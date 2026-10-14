import { genreById, isAspect, isImageModel, isPanelCount, styleById } from "./options";
import { MAX_FIELD, MAX_TOPIC, PANEL_COUNT, normalizeScript } from "./script";
import type { Script } from "./script";

// 요청 본문 검증(서버 라우트용 순수 함수). 옵션은 id만 받고 자유 텍스트는 길이를 제한한다.

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = <T,>(error: string): Parsed<T> => ({ ok: false, error });

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
export const MAX_SHEET_B64 = 1_000_000;
export const MAX_SHEETS = 3;

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  return v.length > max ? null : v;
}

export type ScriptRequest =
  | { kind: "ideas"; genreId: string }
  | { kind: "script"; genreId: string; topic: string; format: "single" | "serial"; panelCount: number }
  | { kind: "followup"; genreId: string; topic: string; script: Script; nextTopic: string; ending: "continue" | "end" };

export function parseScriptRequest(b: Record<string, unknown>): Parsed<ScriptRequest> {
  const genreId = typeof b.genreId === "string" ? b.genreId : "";
  if (!genreById(genreId)) return fail("장르가 올바르지 않습니다.");
  if (b.kind === "ideas") return { ok: true, value: { kind: "ideas", genreId } };
  const topic = str(b.topic, MAX_TOPIC)?.trim() ?? "";
  if (b.kind === "script") {
    if (!topic) return fail("주제를 입력해 주세요.");
    const format = b.format === "serial" ? "serial" : "single";
    const panelCount = isPanelCount(b.panelCount) ? b.panelCount : PANEL_COUNT;
    return { ok: true, value: { kind: "script", genreId, topic, format, panelCount } };
  }
  if (b.kind === "followup") {
    const prevCount = Array.isArray((b.script as { panels?: unknown } | null)?.panels) ? ((b.script as { panels: unknown[] }).panels.length) : PANEL_COUNT;
    const script = normalizeScript(b.script, prevCount);
    if (!script) return fail("이전 대본이 올바르지 않습니다.");
    const nextTopic = str(b.nextTopic ?? "", MAX_TOPIC) ?? "";
    const ending = b.ending === "end" ? "end" : "continue";
    return { ok: true, value: { kind: "followup", genreId, topic, script, nextTopic, ending } };
  }
  return fail("요청 종류가 올바르지 않습니다.");
}

export interface CharacterRequest { name: string; description: string; styleId: string; model: string }

export function parseCharacterRequest(b: Record<string, unknown>): Parsed<CharacterRequest> {
  const name = str(b.name, 40)?.trim() ?? "";
  const description = str(b.description, MAX_FIELD)?.trim() ?? "";
  if (!name || !description) return fail("인물 이름과 설명이 필요합니다.");
  if (typeof b.styleId !== "string" || !styleById(b.styleId)) return fail("그림 스타일이 올바르지 않습니다.");
  if (!isImageModel(b.model)) return fail("그림 모델이 올바르지 않습니다.");
  return { ok: true, value: { name, description, styleId: b.styleId, model: b.model } };
}

export interface PanelRequest { description: string; styleId: string; model: string; aspect: string; sheets: { data: string; mimeType: string }[] }

export function parsePanelRequest(b: Record<string, unknown>): Parsed<PanelRequest> {
  const description = str(b.description, MAX_FIELD)?.trim() ?? "";
  if (!description) return fail("장면 묘사가 필요합니다.");
  if (typeof b.styleId !== "string" || !styleById(b.styleId)) return fail("그림 스타일이 올바르지 않습니다.");
  if (!isImageModel(b.model)) return fail("그림 모델이 올바르지 않습니다.");
  const raw = Array.isArray(b.sheets) ? b.sheets : [];
  if (raw.length > MAX_SHEETS) return fail("캐릭터 그림이 너무 많습니다.");
  const sheets: { data: string; mimeType: string }[] = [];
  for (const s of raw) {
    const o = (s ?? {}) as { data?: unknown; mimeType?: unknown };
    if (typeof o.data !== "string" || typeof o.mimeType !== "string") return fail("캐릭터 그림 형식이 올바르지 않습니다.");
    if (!["image/png", "image/jpeg", "image/webp"].includes(o.mimeType)) return fail("지원하지 않는 이미지 형식입니다.");
    if (o.data.length < 100 || o.data.length > MAX_SHEET_B64 || !B64.test(o.data)) return fail("캐릭터 그림 데이터가 올바르지 않습니다.");
    sheets.push({ data: o.data, mimeType: o.mimeType });
  }
  const aspect = isAspect(b.aspect) ? b.aspect : "1:1";
  return { ok: true, value: { description, styleId: b.styleId, model: b.model, aspect, sheets } };
}

export interface BalloonRequest { dialogue: string; character: string; image: { data: string; mimeType: string } }

/** 말풍선 위치 요청: 완성된 컷(768px JPEG 등)과 대사·화자 */
export function parseBalloonRequest(b: Record<string, unknown>): Parsed<BalloonRequest> {
  const dialogue = str(b.dialogue, MAX_FIELD)?.trim() ?? "";
  if (!dialogue) return fail("대사가 없는 컷에는 말풍선을 놓지 않습니다.");
  const character = str(b.character ?? "", 40)?.trim() ?? "";
  const o = (b.image ?? {}) as { data?: unknown; mimeType?: unknown };
  if (typeof o.data !== "string" || typeof o.mimeType !== "string") return fail("컷 그림이 필요합니다.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(o.mimeType)) return fail("지원하지 않는 이미지 형식입니다.");
  if (o.data.length < 100 || o.data.length > MAX_SHEET_B64 || !B64.test(o.data)) return fail("컷 그림 데이터가 올바르지 않습니다.");
  return { ok: true, value: { dialogue, character, image: { data: o.data, mimeType: o.mimeType } } };
}

export interface InstaRequest { topic: string; script: Script }

export function parseInstaRequest(b: Record<string, unknown>): Parsed<InstaRequest> {
  const topic = str(b.topic ?? "", MAX_TOPIC)?.trim() ?? "";
  const count = Array.isArray((b.script as { panels?: unknown } | null)?.panels) ? ((b.script as { panels: unknown[] }).panels.length) : PANEL_COUNT;
  const script = normalizeScript(b.script, count);
  if (!script) return fail("대본이 올바르지 않습니다.");
  return { ok: true, value: { topic, script } };
}
