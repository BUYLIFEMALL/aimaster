import type { Audience, BorderStyle, Gender, Inputs, Opt, Ratio, RefDoc, Size, Strategy, SubjectType } from "./types";
import { AGES, EMPTY_INPUTS, ETHNICITIES } from "./types";
import { normalizeStrategy } from "./strategy";

export const DOC_MAX_CHARS = 30_000;
const AUDIENCE_IDS: Audience[] = ["teens", "adults", "seniors", "all"];
const SUBJECT_TYPES: SubjectType[] = ["person", "animal", "object", "none"];
const BORDERS: BorderStyle[] = ["none", "solid", "neon", "sketch"];
const GENDERS: Gender[] = ["auto", "male", "female"];

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** 클라이언트가 보낸 입력을 안전한 값으로 정리한다 */
export function cleanInputs(raw: unknown): Inputs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (r.subject && typeof r.subject === "object" ? r.subject : {}) as Record<string, unknown>;
  const st = (r.style && typeof r.style === "object" ? r.style : {}) as Record<string, unknown>;
  const d = EMPTY_INPUTS;
  return {
    topic: clean(r.topic, 600),
    audience: AUDIENCE_IDS.includes(r.audience as Audience) ? (r.audience as Audience) : d.audience,
    subject: {
      type: SUBJECT_TYPES.includes(s.type as SubjectType) ? (s.type as SubjectType) : d.subject.type,
      gender: GENDERS.includes(s.gender as Gender) ? (s.gender as Gender) : d.subject.gender,
      age: (AGES as readonly string[]).includes(s.age as string) ? (s.age as string) : d.subject.age,
      ethnicity: (ETHNICITIES as readonly string[]).includes(s.ethnicity as string) ? (s.ethnicity as string) : d.subject.ethnicity,
      description: clean(s.description, 120),
    },
    style: {
      border: BORDERS.includes(st.border as BorderStyle) ? (st.border as BorderStyle) : d.style.border,
      channelName: clean(st.channelName, 30),
      withText: st.withText === false ? false : true,
      size: (st.size === "1K" ? "1K" : "2K") as Size,
      ratio: (st.ratio === "9:16" ? "9:16" : "16:9") as Ratio,
    },
    ...cleanRefDoc(r.doc),
    ...(clean(r.origin, 60) ? { origin: clean(r.origin, 60) } : {}),
  };
}

/** v1.12 참고 문서: 글이 있을 때만 남기고 길이·제어 문자 정리 */
function cleanRefDoc(raw: unknown): { doc?: RefDoc } {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const { text, truncated } = cleanDocText(o.text);
  if (!text) return {};
  return { doc: { name: clean(o.name, 80) || "참고 문서", text, truncated: truncated || o.truncated === true } };
}

export function missingInputs(i: Inputs): string | null {
  if (!i.topic) return "영상 주제를 입력해 주세요.";
  if ((i.subject.type === "animal" || i.subject.type === "object") && !i.subject.description) {
    return i.subject.type === "animal" ? "동물 종류를 입력해 주세요." : "사물 종류를 입력해 주세요.";
  }
  return null;
}

/** 대본 파일 텍스트 정리: 제어 문자 제거, 최대 길이로 자르고 잘림 여부를 알려 준다 */
export function cleanDocText(text: unknown): { text: string; truncated: boolean } {
  if (typeof text !== "string") return { text: "", truncated: false };
  // eslint-disable-next-line no-control-regex
  const t = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  return { text: t.slice(0, DOC_MAX_CHARS), truncated: t.length > DOC_MAX_CHARS };
}

export function cleanStrategy(raw: unknown): Strategy | null {
  return raw == null ? null : normalizeStrategy(raw);
}

export function cleanName(v: unknown, fallback = "제목 없는 썸네일"): string {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  return s || fallback;
}

export function isOpt(v: unknown): v is Opt {
  return v === "a" || v === "b";
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && new RegExp(`^${UUID}$`, "i").test(v);
}

/** 이미지 저장 경로 규칙: <uid>/<projectId>/<a|b>-<uuid>.jpg — 본인 프로젝트 폴더만 허용 */
export function imagePath(userId: string, projectId: string, opt: Opt, uuid: string): string {
  return `${userId}/${projectId}/${opt}-${uuid}.jpg`;
}
export function isOwnImagePath(userId: string, projectId: string, path: unknown): path is string {
  if (typeof path !== "string" || path.length > 160) return false;
  return new RegExp(`^${userId}/${projectId}/[ab]-${UUID}\\.jpg$`, "i").test(path);
}

export function stageOf(strategy: Strategy | null, hasImage: boolean): "input" | "strategy" | "image" {
  return hasImage ? "image" : strategy ? "strategy" : "input";
}

/** v1.13 참고 문서 글자 수 표시 — 1,000자 미만은 「40자」, 그 이상은 「1.2K자」 */
export function charsLabel(n: number): string {
  return n < 1000 ? `${n.toLocaleString("ko-KR")}자` : `${(n / 1000).toFixed(1)}K자`;
}
