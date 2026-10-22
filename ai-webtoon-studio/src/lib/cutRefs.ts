import type { CharacterInfo, CutScene } from "./types";

/**
 * W8(v1.29): 컷 그림에 그 컷 인물의 캐릭터 시트(없으면 참고 사진)를 첨부해 컷마다 같은 얼굴·옷이 나오게 한다.
 * 브라우저·서버 공용 순수 함수 — 인물 고르기와 서버의 첨부 검사(4컷 만화 api/panel과 같은 기준).
 */
export const MAX_CUT_REFS = 3;
export const MAX_REF_B64 = 1_000_000;
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
const B64 = /^[A-Za-z0-9+/=]+$/;
const REF_MIMES = ["image/png", "image/jpeg", "image/webp"];

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** 컷에 나오는 인물의 그림 주소(시트 우선, 없으면 참고 사진). 브라우저 안 그림(data URL)만 — 외부 주소(무료 대체 그림)는 제외 */
export function pickCutRefUrls(cut: Pick<CutScene, "characterNames">, characters: CharacterInfo[], max = MAX_CUT_REFS): string[] {
  const names = new Set((cut.characterNames ?? []).map(norm).filter(Boolean));
  const out: string[] = [];
  for (const c of characters ?? []) {
    if (!names.has(norm(c.name ?? ""))) continue;
    const url = [c.characterSheetUrl, c.referenceImageUrl].find((u) => typeof u === "string" && DATA_URL.test(u));
    if (url && !out.includes(url)) out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

export interface CutRef { data: string; mimeType: string }

/** 서버: 요청의 refs를 검사한다. 잘못되면 회원에게 보여 줄 한국어 안내(string) */
export function parseCutRefs(raw: unknown): CutRef[] | string {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return "캐릭터 그림 형식이 올바르지 않습니다.";
  if (raw.length > MAX_CUT_REFS) return "캐릭터 그림은 컷마다 3장까지 보낼 수 있습니다.";
  const refs: CutRef[] = [];
  for (const r of raw) {
    const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    if (typeof o.data !== "string" || typeof o.mimeType !== "string" || !REF_MIMES.includes(o.mimeType)) return "캐릭터 그림 형식이 올바르지 않습니다.";
    if (o.data.length < 100 || o.data.length > MAX_REF_B64 || !B64.test(o.data)) return "캐릭터 그림 데이터가 올바르지 않습니다.";
    refs.push({ data: o.data, mimeType: o.mimeType });
  }
  return refs;
}

/** 첨부가 있을 때 프롬프트 앞에 붙이는 일관성 지시(웹툰 고유 문구) */
export function withRefInstruction(prompt: string, refCount: number): string {
  if (!refCount) return prompt;
  return `The attached image${refCount > 1 ? "s are character reference sheets" : " is a character reference sheet"} for the characters in this cut. Keep each character's face, hairstyle, outfit, colors and body proportions exactly consistent with the reference. Do not copy the sheet layout or its background; draw a single new webtoon panel.\n\n${prompt}`;
}
