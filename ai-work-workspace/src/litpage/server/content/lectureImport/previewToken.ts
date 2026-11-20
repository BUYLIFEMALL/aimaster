// 강의 일정 한 번 가져오기 전용 — 미리보기 표식(순수 함수, 입출력 없음).
// 2026-11-20 WS-20261118-02(플랜 docs/PLAN_20261120_NOTION_LECTURE_IMPORT.md §5-1).
// 미리보기가 내준 내용 그대로 확정 저장이 요청됐는지를 서버 상태 없이 입증한다: HMAC-SHA256 서명 + 만료 + 요청 묶음.
// 서명 없는 해시는 「값이 바뀌었는지」만 알려 줄 뿐 「이 서버가 이 내용으로 미리보기를 내주었는지」는 입증하지 못한다.
// 키는 인자로만 받는다 — 이 파일은 환경변수를 읽지 않고, 키를 만들거나 기록하지도 않는다. 아직 어디에서도 부르지 않는다.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** 용도 구분 문자열 — 같은 키로 다른 종류의 표식을 만들지 않기 위해 서명 입력 맨 앞에 붙인다 */
export const PREVIEW_TOKEN_PURPOSE = 'aww:lecture-import:preview:v1';
export const PREVIEW_TOKEN_VERSION = 'v1';
/** 발급 뒤 유효 시간 */
export const PREVIEW_TOKEN_TTL_MS = 30 * 60_000;
/** 서명 키의 최소 길이(바이트). 이보다 짧거나 없으면 「키 없음」 — 표식을 내주지도 받아 주지도 않는다 */
export const PREVIEW_KEY_MIN_BYTES = 32;

/** 요청 의도: 누가 · 어느 공간의 · 어느 대상에 · 어떤 파일을 · 어떤 설정으로 */
export interface PreviewIntent {
  userId: string;
  spaceId: string;
  /** 새 표 만들기 또는 기존 표(블록 id)에 합치기 */
  target: { kind: 'new' } | { kind: 'table'; blockId: string };
  /** 올린 파일의 id와 내용 SHA-256(소문자 16진 64자) — 확정 저장 때 서버가 저장된 파일에서 다시 계산한다 */
  fileId: string;
  fileSha256: string;
  /** 열 지정(머리줄의 열 이름) */
  mapping: { title: string; date: string };
  timeZone: string;
  /** 「표기된 시각 그대로 가져오기」 명시 선택 */
  wallClock: boolean;
}

/** 대상 표의 구조 — 열(id·이름·형식)과 보기 id. 새 표 만들기면 둘 다 빈 배열 */
export interface PreviewStructure {
  columns: { id: string; name: string; type: string }[];
  viewIds: string[];
}

export type PreviewTokenError =
  | 'key_missing' // 키가 없거나 너무 짧다(fail closed)
  | 'input_invalid' // 묶을 값의 모양이 틀렸다(빈 값·글자열 아님·너무 긺 등)
  | 'malformed' // 표식의 모양이 틀렸다
  | 'bad_signature' // 서명이 맞지 않는다(변조·다른 키·다른 용도)
  | 'expired'
  | 'not_yet_valid' // 발급 시각이 지금보다 미래
  | 'intent_mismatch' // 서명은 맞지만 회원·공간·대상·파일·열 지정·시간대·명시 선택이 미리보기 때와 다르다
  | 'structure_changed'; // 서명·의도는 맞지만 표의 열·보기가 미리보기 때와 다르다

const MAX_FIELD = 512;
const HEX64 = /^[0-9a-f]{64}$/;
const isText = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= MAX_FIELD;

/** 올린 파일 내용의 SHA-256(소문자 16진) */
export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * 값들을 한 줄로 늘어놓되 경계가 섞이지 않게 한다: JSON 배열로 직렬화하므로 칸 안에 구분자·따옴표·줄바꿈이 있어도
 * 서로 다른 값 묶음이 같은 글자열이 되지 않는다. 칸의 순서는 코드에 고정돼 있다(객체 키 순서에 기대지 않는다).
 */
const canonical = (parts: unknown[]) => JSON.stringify(parts);

/** 요청 의도의 지문. 모양이 틀리면 null */
export function intentHash(intent: PreviewIntent): string | null {
  if (!intent || typeof intent !== 'object') return null;
  const t = intent.target as { kind?: unknown; blockId?: unknown } | undefined;
  if (!t || (t.kind !== 'new' && t.kind !== 'table')) return null;
  if (t.kind === 'table' && !isText(t.blockId)) return null;
  const m = intent.mapping;
  if (!isText(intent.userId) || !isText(intent.spaceId) || !isText(intent.fileId) || !isText(intent.timeZone)) return null;
  if (typeof intent.fileSha256 !== 'string' || !HEX64.test(intent.fileSha256)) return null;
  if (!m || !isText(m.title) || !isText(m.date)) return null;
  if (typeof intent.wallClock !== 'boolean') return null;
  return sha256Hex(canonical(['intent', intent.userId, intent.spaceId, t.kind, t.kind === 'table' ? t.blockId : '', intent.fileId, intent.fileSha256, m.title, m.date, intent.timeZone, intent.wallClock]));
}

/**
 * 표 구조의 지문. 열은 id 순, 보기는 id 순으로 늘어놓아 읽어 온 순서에 좌우되지 않는다(열 추가·삭제·이름·형식 변경,
 * 보기 추가·삭제를 감지한다). 모양이 틀리거나 id가 겹치면 null.
 */
export function structureHash(structure: PreviewStructure): string | null {
  if (!structure || !Array.isArray(structure.columns) || !Array.isArray(structure.viewIds)) return null;
  const cols: [string, string, string][] = [];
  const seen = new Set<string>();
  for (const c of structure.columns) {
    if (!c || !isText(c.id) || typeof c.name !== 'string' || c.name.length > MAX_FIELD || !isText(c.type) || seen.has(c.id)) return null;
    seen.add(c.id);
    cols.push([c.id, c.name, c.type]);
  }
  const views = new Set<string>();
  for (const v of structure.viewIds) {
    if (!isText(v) || views.has(v)) return null;
    views.add(v);
  }
  cols.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return sha256Hex(canonical(['structure', cols, [...views].sort()]));
}

function usableKey(key: unknown): Uint8Array | null {
  return key instanceof Uint8Array && key.byteLength >= PREVIEW_KEY_MIN_BYTES ? key : null;
}

function sign(key: Uint8Array, issuedAt: number, expiresAt: number, intent: string, structure: string): Buffer {
  // 줄바꿈으로 나눈 고정 칸: 용도 · 판 · 발급 · 만료 · 의도 지문 · 구조 지문(모두 줄바꿈이 들어갈 수 없는 값이다)
  return createHmac('sha256', key).update([PREVIEW_TOKEN_PURPOSE, PREVIEW_TOKEN_VERSION, issuedAt, expiresAt, intent, structure].join('\n')).digest();
}

const validTime = (ms: unknown): ms is number => typeof ms === 'number' && Number.isSafeInteger(ms) && ms > 0;

export type IssueResult = { ok: true; token: string; issuedAt: number; expiresAt: number } | { ok: false; code: 'key_missing' | 'input_invalid' };

/**
 * 미리보기 표식을 내준다. 표식에는 발급·만료 시각과 두 지문, 서명만 들어간다(회원 id·파일 내용·열 이름·키는 들어가지 않는다).
 * 키가 없거나 짧으면 내주지 않는다 — 그러면 확정 저장을 할 수 없다(fail closed).
 * 모양: `v1.<발급 ms>.<만료 ms>.<의도 지문 64자>.<구조 지문 64자>.<서명 base64url 43자>`
 */
export function issuePreviewToken(key: Uint8Array, intent: PreviewIntent, structure: PreviewStructure, nowMs: number): IssueResult {
  const k = usableKey(key);
  if (!k) return { ok: false, code: 'key_missing' };
  const ih = intentHash(intent);
  const sh = structureHash(structure);
  if (!ih || !sh || !validTime(nowMs)) return { ok: false, code: 'input_invalid' };
  const expiresAt = nowMs + PREVIEW_TOKEN_TTL_MS;
  const mac = sign(k, nowMs, expiresAt, ih, sh).toString('base64url');
  return { ok: true, token: `${PREVIEW_TOKEN_VERSION}.${nowMs}.${expiresAt}.${ih}.${sh}.${mac}`, issuedAt: nowMs, expiresAt };
}

const TOKEN = /^v1\.([1-9]\d{0,15})\.([1-9]\d{0,15})\.([0-9a-f]{64})\.([0-9a-f]{64})\.([A-Za-z0-9_-]{43})$/;

export type VerifyResult = { ok: true; issuedAt: number; expiresAt: number } | { ok: false; code: PreviewTokenError };

/**
 * 확정 저장 때 표식을 확인한다. `intent`·`structure`는 표식에서 꺼내지 않고 **서버가 지금 요청과 지금 표에서 다시 만든 값**이다.
 * 순서: 키 → 모양 → 서명(상수 시간 비교) → 발급·만료 → 의도 → 구조. 서명이 맞기 전에는 표식의 어떤 값도 믿지 않는다.
 * 실패하면 한 줄도 쓰지 않는다(0쓰기). 사유는 화면 안내를 고르는 데만 쓴다.
 */
export function verifyPreviewToken(key: Uint8Array, token: string, intent: PreviewIntent, structure: PreviewStructure, nowMs: number): VerifyResult {
  const k = usableKey(key);
  if (!k) return { ok: false, code: 'key_missing' };
  const ih = intentHash(intent);
  const sh = structureHash(structure);
  if (!ih || !sh || !validTime(nowMs)) return { ok: false, code: 'input_invalid' };
  const m = typeof token === 'string' && token.length <= 256 ? TOKEN.exec(token) : null;
  if (!m) return { ok: false, code: 'malformed' };
  const issuedAt = Number(m[1]);
  const expiresAt = Number(m[2]);
  if (!validTime(issuedAt) || !validTime(expiresAt)) return { ok: false, code: 'malformed' };
  const given = Buffer.from(m[5], 'base64url');
  // 43자는 258비트라 끝의 2비트가 남는다 — 그 비트만 다른 글자열이 같은 서명으로 읽히지 않게 정규 표기만 받는다
  if (given.toString('base64url') !== m[5]) return { ok: false, code: 'malformed' };
  const expected = sign(k, issuedAt, expiresAt, m[3], m[4]);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, code: 'bad_signature' };
  // 여기부터 표식의 값은 이 키로 서명된 것이다
  if (expiresAt - issuedAt !== PREVIEW_TOKEN_TTL_MS) return { ok: false, code: 'malformed' };
  if (issuedAt > nowMs) return { ok: false, code: 'not_yet_valid' };
  if (nowMs >= expiresAt) return { ok: false, code: 'expired' };
  if (m[3] !== ih) return { ok: false, code: 'intent_mismatch' };
  if (m[4] !== sh) return { ok: false, code: 'structure_changed' };
  return { ok: true, issuedAt, expiresAt };
}
