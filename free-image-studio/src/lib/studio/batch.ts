// 한 묶음(그림 24장까지)의 계획을 만들고, 엔진에 하나씩 맡긴다. 화면과 분리한 판단 로직이라 설치 없이 시험한다.
import { EngineError, SEED_MAX, TITLE_LIMIT, checkArtInput, type EngineClient, type KeyValueStore, type Submission, type SubmitInput } from "../engine.ts";
import { buildPrompt, type Preset } from "./presets.ts";

/** 한 묶음에 맡길 수 있는 그림 수(줄 수 × 줄마다 장수의 합) */
export const BATCH_MAX = 24;
export const COPIES_MAX = 2;

export type PlanItem = SubmitInput & { line: number; copy: number; source: string };
export type PlanError = { line: number; message: string };
export type Plan = { items: PlanItem[]; errors: PlanError[]; total: number; lines: number };

/** 설명 칸의 글을 줄로 나눈다(빈 줄은 뺀다). 한 줄 = 한 요청 */
export function parseLines(text: string): string[] {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** 줄 끝의 장수 표시 — 「설명 x2」(x·×·* 뒤에 숫자). 표시가 글 안에 있어 줄을 고치거나 옮겨도 장수가 그 줄을 따라간다 */
const COPIES_MARK = /\s+[x×*]\s*(\d+)\s*$/i;

export type LineEntry = {
  /** 장수 표시를 뗀 설명 */
  source: string;
  /** 이 줄의 장수(표시가 없으면 기본 장수) */
  copies: number;
  /** 장수 표시가 1~2가 아니면 그 숫자(오류로 알린다) */
  badCopies?: number;
};

const validCopies = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= COPIES_MAX;

/** 설명 칸의 글을 줄마다 설명과 장수로 나눈다. 장수 표시가 없는 줄은 기본 장수(1)를 쓴다 */
export function parseEntries(text: string, defaultCopies = 1): LineEntry[] {
  const base = validCopies(defaultCopies) ? defaultCopies : 1;
  return parseLines(text).map((line) => {
    const m = COPIES_MARK.exec(line);
    if (!m) return { source: line, copies: base };
    const n = Number(m[1]);
    const source = line.slice(0, m.index).trim();
    return validCopies(n) ? { source, copies: n } : { source, copies: base, badCopies: n };
  });
}

/** 설명 칸의 글에서 n번째 줄(빈 줄 제외, 0부터)의 장수 표시를 바꾼다. 기본 장수와 같으면 표시를 뗀다 */
export function setLineCopies(text: string, lineIndex: number, copies: number, defaultCopies = 1): string {
  if (!validCopies(copies)) return text;
  const base = validCopies(defaultCopies) ? defaultCopies : 1;
  let seen = -1;
  return String(text ?? "")
    .split(/\r?\n/)
    .map((raw) => {
      if (!raw.trim() || ++seen !== lineIndex) return raw;
      const bare = raw.replace(COPIES_MARK, "").trimEnd();
      return copies === base ? bare : `${bare} x${copies}`;
    })
    .join("\n");
}

const randomSeed = (): number => {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] & SEED_MAX;
};

/**
 * 묶음 계획. 문제가 하나라도 있으면 items는 비우고 errors에 줄 번호와 이유를 담는다(일부만 맡기지 않는다).
 * line 0은 묶음 전체의 문제다. 장수는 줄마다 정한다(줄 끝 「x2」). copies는 표시가 없는 줄에 쓰는 기본 장수다(기본 1).
 * 그림마다 접수 번호는 엔진에 맡길 때 따로 만들어진다(한 줄의 두 장도 서로 다른 접수 번호·다른 시드).
 */
export function buildPlan(input: {
  text: string;
  preset: Preset;
  width: number;
  height: number;
  /** 장수 표시가 없는 줄의 기본 장수(1~2, 기본 1). 예전의 「묶음 전체 장수」 값도 이렇게 읽는다 */
  copies?: number;
  variantId?: string | null;
  /** 고급: 시드를 직접 정하면 줄·장마다 1씩 늘려 쓴다 */
  fixedSeed?: number | null;
  random?: () => number;
}): Plan {
  const entries = parseEntries(input.text, input.copies);
  const total = entries.reduce((n, e) => n + e.copies, 0);
  const errors: PlanError[] = [];
  if (!entries.length) errors.push({ line: 0, message: "그림 설명을 한 줄 이상 적어 주세요." });
  if (total > BATCH_MAX) errors.push({ line: 0, message: `한 번에 ${BATCH_MAX}장까지 맡길 수 있습니다(지금 ${total}장). 줄 수나 장수를 줄여 주세요.` });
  const fixed = input.fixedSeed;
  if (fixed != null && !(Number.isInteger(fixed) && fixed >= 0 && fixed <= SEED_MAX)) errors.push({ line: 0, message: "시드는 0 이상의 정수로 적어 주세요." });
  const random = input.random ?? randomSeed;
  const items: PlanItem[] = [];
  const seen = new Set<number>();
  entries.forEach((entry, i) => {
    const source = entry.source;
    if (entry.badCopies !== undefined) errors.push({ line: i + 1, message: `한 줄에 ${COPIES_MAX}장까지 그릴 수 있습니다(x${entry.badCopies}). 줄 끝을 x1 또는 x2로 적어 주세요.` });
    for (let copy = 1; copy <= entry.copies; copy++) {
      let seed = fixed != null ? (fixed + items.length) % (SEED_MAX + 1) : random();
      // 같은 묶음 안에서 시드가 겹치면 같은 그림이 나오고, 접수 기록과 맞춰 볼 때도 구별되지 않는다.
      while (fixed == null && seen.has(seed)) seed = random();
      seen.add(seed);
      const title = `${input.preset.label} ${i + 1}번${entry.copies > 1 ? `-${copy}` : ""}`.slice(0, TITLE_LIMIT);
      const item: PlanItem = { line: i + 1, copy, source, title, prompt: buildPrompt(input.preset, source), width: input.width, height: input.height, seed };
      if (input.variantId) item.variantId = input.variantId;
      if (copy === 1) {
        const problem = !source ? "그림 설명을 적어 주세요." : /[^\x20-\x7e]/.test(source) ? "영문으로 적어 주세요(내 PC 그림 모델은 영어만 읽습니다)." : source.split(" ").length < 2 ? "조금 더 자세히 적어 주세요(두 단어 이상)." : checkArtInput(item);
        if (problem) errors.push({ line: i + 1, message: problem });
      }
      items.push(item);
    }
  });
  return { items: errors.length ? [] : items, errors, total, lines: entries.length };
}

// ── 만들기 화면에 적던 내용(브라우저 보관, 회원별) — 새로고침해도 적던 줄과 줄마다 장수가 그대로 돌아온다 ──
const composeKey = (memberId: string) => `fis.compose.v1:${memberId}`;
const COMPOSE_TEXT_MAX = 40_000;
export type Compose = { text: string; presetId: string; sizeId: string };

export function saveCompose(storage: KeyValueStore, memberId: string, compose: Compose): void {
  try {
    if (!compose.text.trim()) storage.removeItem(composeKey(memberId));
    else storage.setItem(composeKey(memberId), JSON.stringify({ v: 2, text: compose.text.slice(0, COMPOSE_TEXT_MAX), presetId: compose.presetId, sizeId: compose.sizeId }));
  } catch {
    // 적던 내용 보관은 편의 기능이라 실패해도 화면을 막지 않는다
  }
}
/**
 * 적던 내용 되돌리기. 예전 형식(묶음 전체 장수 copies를 따로 두던 값)은 장수 표시가 없는 줄에 그 장수를 붙여
 * 지금 형식(줄마다 장수)으로 옮긴다 — 예전에 2장으로 적어 둔 묶음이 1장으로 바뀌지 않는다.
 */
export function loadCompose(storage: KeyValueStore, memberId: string): Compose | null {
  try {
    const d = JSON.parse(storage.getItem(composeKey(memberId)) ?? "null") as { text?: unknown; presetId?: unknown; sizeId?: unknown; copies?: unknown } | null;
    if (!d || typeof d !== "object" || typeof d.text !== "string" || d.text.length > COMPOSE_TEXT_MAX) return null;
    let text = d.text;
    if (validCopies(d.copies) && d.copies !== 1) {
      const legacy = d.copies;
      text = parseEntries(d.text, 1).reduce((t, _e, i) => (COPIES_MARK.test(parseLines(t)[i] ?? "") ? t : setLineCopies(t, i, legacy, 1)), d.text);
    }
    return { text, presetId: typeof d.presetId === "string" ? d.presetId : "", sizeId: typeof d.sizeId === "string" ? d.sizeId : "" };
  } catch {
    return null;
  }
}

// ── 맡기는 중인 묶음(브라우저 보관, 회원별) — 새로고침 뒤 남은 장을 이어서 맡길 수 있게 ──
// 묶음을 만들 때 **모든 장에 접수 번호를 미리 정해 적어 둔다**. 엔진에는 그 번호로 맡긴다.
// 「이 장을 이미 맡겼는가」는 한 가지로만 정한다: 그 접수 번호가 접수 기록에 있는가.
// 내용(설명·크기·시드)이 같은 다른 접수를 이 장의 것으로 여기거나 지우지 않는다.
// 묶음은 만든 때의 연결 범위에 묶인다. 연결이 바뀌면 남은 장을 그대로 둔 채 멈춘다.
const draftKey = (memberId: string) => `fis.draft.v1:${memberId}`;
const sessionKeyOf = (memberId: string) => `fis.engineToken.v1:${memberId}`;
const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export type DraftItem = PlanItem & {
  /** 묶음 안에서 이 장을 가리키는 번호 */
  key: string;
  /** 이 장을 엔진에 맡길 때 쓰는 접수 번호 — 묶음을 만들 때 정해 적는다 */
  requestId: string;
};
export type Draft = {
  v: 3;
  batchId: string;
  /** 이 묶음을 만든 때의 연결 범위 표시. 지금 범위와 다르면 남은 장을 맡기지 않는다 */
  link: string;
  startedAt: number;
  items: DraftItem[];
};

const newId = (): string => globalThis.crypto.randomUUID();
const validItem = (it: unknown): it is PlanItem => !!it && typeof it === "object" && checkArtInput(it as PlanItem) === null && Number.isInteger((it as PlanItem).seed);

/** 이 회원의 연결 기록에서 지금 연결 범위 표시를 읽는다(연결돼 있지 않으면 null). engine.ts의 연결 기록과 같은 모양 */
function currentLink(storage: KeyValueStore, memberId: string): string | null {
  try {
    const d = JSON.parse(storage.getItem(sessionKeyOf(memberId)) ?? "null") as { v?: unknown; token?: unknown; link?: unknown } | null;
    return d && typeof d === "object" && d.v === 2 && typeof d.token === "string" && d.token && typeof d.link === "string" && d.link ? d.link : null;
  } catch {
    return null;
  }
}

function writeDraft(storage: KeyValueStore, memberId: string, draft: Draft): void {
  try {
    storage.setItem(draftKey(memberId), JSON.stringify(draft));
  } catch {
    throw new EngineError("storage", "브라우저에 맡길 목록을 적지 못했습니다. 저장 공간을 확인해 주세요.");
  }
}

/**
 * 새 묶음을 보관한다(앞의 묶음을 덮어쓴다 — 화면은 남은 장이 있으면 새 묶음을 시작하지 못하게 막는다).
 * 장마다 접수 번호를 정해 함께 적는다. 엔진과 연결돼 있지 않으면 만들지 않는다(어느 연결의 묶음인지 적을 수 없다).
 */
export function saveDraft(storage: KeyValueStore, memberId: string, items: PlanItem[], opts: { now?: () => number; uuid?: () => string } = {}): Draft {
  const link = currentLink(storage, memberId);
  if (!link) throw new EngineError("needPair", "엔진과 연결한 뒤에 맡길 수 있습니다. 「시작하기」에서 연결해 주세요.", 401);
  const uuid = opts.uuid ?? newId;
  const draft: Draft = { v: 3, batchId: uuid(), link, startedAt: (opts.now ?? Date.now)(), items: items.map((it) => ({ ...it, key: uuid(), requestId: uuid() })) };
  if (!draft.items.every((it) => REQUEST_ID.test(it.requestId)) || new Set(draft.items.map((it) => it.requestId)).size !== draft.items.length) throw new EngineError("invalid", "접수 번호를 만들지 못했습니다.");
  writeDraft(storage, memberId, draft);
  return draft;
}

type Stored = { v?: unknown; batchId?: unknown; link?: unknown; startedAt?: unknown; items?: unknown };
function readStored(storage: KeyValueStore, memberId: string): Stored | null {
  try {
    const data = JSON.parse(storage.getItem(draftKey(memberId)) ?? "null") as Stored | null;
    return data && typeof data === "object" && Array.isArray(data.items) && data.items.length <= BATCH_MAX ? data : null;
  } catch {
    return null;
  }
}

/** 보관한 묶음(지금 형식만). 손상됐거나 예전 형식이면 null — 엔진에 보내지 않는다 */
export function readDraft(storage: KeyValueStore, memberId: string): Draft | null {
  const data = readStored(storage, memberId);
  if (!data || data.v !== 3) return null;
  const raw = data.items as DraftItem[];
  if (typeof data.batchId !== "string" || !data.batchId || typeof data.link !== "string" || !data.link || !Number.isFinite(data.startedAt)) return null;
  if (!raw.every((it) => validItem(it) && typeof it.key === "string" && !!it.key && typeof it.requestId === "string" && REQUEST_ID.test(it.requestId))) return null;
  if (new Set(raw.map((it) => it.key)).size !== raw.length || new Set(raw.map((it) => it.requestId)).size !== raw.length) return null;
  return { v: 3, batchId: data.batchId, link: data.link, startedAt: data.startedAt as number, items: raw };
}
/** 보관한 묶음의 장들(없으면 빈 목록) */
export const loadDraft = (storage: KeyValueStore, memberId: string): DraftItem[] => readDraft(storage, memberId)?.items ?? [];

/**
 * 예전 형식(v1·v2)으로 보관된 묶음의 장들. 그 형식은 장마다 접수 번호를 미리 적지 않아,
 * 어느 장이 이미 맡겨졌는지 **근거가 없다**. 그래서 자동으로 이어 맡기지 않고 「확인이 필요한 장」으로만 보여 준다.
 * 사용자가 중복 가능성을 알고 고르면 adoptLegacyDraft()로 새 묶음으로 옮긴다.
 */
export function legacyDraftItems(storage: KeyValueStore, memberId: string): PlanItem[] {
  const data = readStored(storage, memberId);
  if (!data || (data.v !== 1 && data.v !== 2)) return [];
  const raw = data.items as PlanItem[];
  return raw.every(validItem) ? raw.map(({ line, copy, source, title, prompt, width, height, seed, variantId }) => ({ line, copy, source, title, prompt, width, height, seed, ...(variantId ? { variantId } : {}) })) : [];
}

export function clearDraft(storage: KeyValueStore, memberId: string): void {
  try {
    storage.removeItem(draftKey(memberId));
  } catch {}
}

/** 묶음에서 아직 맡기지 않은 장 — 그 장의 접수 번호가 접수 기록에 없는 것 */
function unsent(draft: Draft, subs: Submission[]): DraftItem[] {
  const have = new Set(subs.map((s) => s.requestId));
  return draft.items.filter((it) => !have.has(it.requestId));
}
export function remainingItems(client: Pick<EngineClient, "submissions" | "memberId">, storage: KeyValueStore): DraftItem[] {
  const draft = readDraft(storage, client.memberId);
  return draft ? unsent(draft, client.submissions()) : [];
}

export type DraftStatus = {
  /** 지금 연결에서 이어 맡길 수 있는 남은 장 */
  remaining: number;
  /** 묶음을 만든 뒤 엔진 연결이 바뀌어 그대로는 맡길 수 없는 남은 장 */
  otherScope: number;
  /** 예전 형식으로 보관돼 맡겼는지 알 수 없는 장 */
  legacy: number;
};
export function draftStatus(client: Pick<EngineClient, "submissions" | "memberId" | "scopeId">, storage: KeyValueStore): DraftStatus {
  const legacy = legacyDraftItems(storage, client.memberId).length;
  const draft = readDraft(storage, client.memberId);
  if (!draft) return { remaining: 0, otherScope: 0, legacy };
  const left = unsent(draft, client.submissions()).length;
  return draft.link === client.scopeId() ? { remaining: left, otherScope: 0, legacy } : { remaining: 0, otherScope: left, legacy };
}

/**
 * 접수 기록을 지우거나 새로 맡길 때, 보관한 묶음에서 **그 접수 번호의 장**을 뺀다.
 * 접수 번호가 같은 장만 뺀다 — 내용이 같은 다른 장은 건드리지 않는다.
 */
export function dropFromDraft(storage: KeyValueStore, memberId: string, requestId: string): void {
  const draft = readDraft(storage, memberId);
  if (!draft) return;
  const kept = draft.items.filter((it) => it.requestId !== requestId);
  if (kept.length === draft.items.length) return;
  if (kept.length) writeDraft(storage, memberId, { ...draft, items: kept });
  else clearDraft(storage, memberId);
}

/**
 * 사용자가 고른 경우에만: 지금 연결에서 맡길 수 없는 남은 장을 **새 묶음**(새 접수 번호, 지금 연결 범위)으로 옮긴다.
 *  - 연결이 바뀐 묶음: 아직 접수 기록이 없는 장만 옮긴다(접수 기록이 없으면 엔진에 보낸 적이 없다 — 기록을 먼저 적고 보내기 때문).
 *  - 예전 형식 묶음: 어느 장이 맡겨졌는지 알 수 없으므로 전부 옮긴다. 이미 그린 장이 있으면 같은 그림이 한 번 더 나온다(화면이 먼저 알린다).
 */
export function adoptDraft(client: Pick<EngineClient, "submissions" | "memberId" | "scopeId">, storage: KeyValueStore, acknowledged: boolean): Draft | null {
  if (!acknowledged) throw new EngineError("invalid", "남은 장을 새 묶음으로 맡기려면 먼저 확인해 주세요.");
  const memberId = client.memberId;
  const draft = readDraft(storage, memberId);
  const strip = ({ line, copy, source, title, prompt, width, height, seed, variantId }: PlanItem): PlanItem => ({ line, copy, source, title, prompt, width, height, seed, ...(variantId ? { variantId } : {}) });
  const items = draft ? (draft.link === client.scopeId() ? [] : unsent(draft, client.submissions()).map(strip)) : legacyDraftItems(storage, memberId);
  if (!items.length) return null;
  return saveDraft(storage, memberId, items);
}

export type RunResult = {
  /** 이번에 엔진에 보낸 수 */
  sent: number;
  /** 이 묶음에서 이미 맡겨져 있어 건너뛴 수 */
  skipped: number;
  /** 아직 보내지 못한 수 */
  remaining: number;
  /** 중간에 멈춘 이유(끝까지 갔으면 없음) */
  stopped?: { kind: string; message: string };
};

/**
 * 보관해 둔 묶음에서 아직 맡기지 않은 장만 하나씩 맡긴다.
 * - 장마다 미리 정해 둔 접수 번호로 맡긴다. 그 번호가 접수 기록에 있으면(상태가 무엇이든) 다시 보내지 않는다.
 * - 장을 보내기 직전마다 엔진 연결 범위가 묶음을 만든 때와 같은지 본다. 다르면 남은 장을 그대로 두고 멈춘다.
 * - 엔진이 꺼졌거나 연결이 필요하거나 엔진이 이 사이트의 작업을 닫았으면 거기서 멈춘다(남은 장은 보관).
 * - 예전 형식 묶음은 맡기지 않는다(확인이 필요한 장으로 남는다).
 * - 모두 맡기면 보관한 묶음을 지운다.
 */
export async function submitRemaining(client: EngineClient, storage: KeyValueStore, opts: { onProgress?: (done: number, total: number) => void; shouldStop?: () => boolean } = {}): Promise<RunResult> {
  const memberId = client.memberId;
  const first = readDraft(storage, memberId);
  if (!first) return { sent: 0, skipped: 0, remaining: 0 };
  const batchId = first.batchId;
  const total = first.items.length;
  let sent = 0;
  let skipped = 0;
  let stopped: RunResult["stopped"];
  for (const key of first.items.map((it) => it.key)) {
    if (opts.shouldStop?.()) {
      stopped = { kind: "user", message: "맡기기를 멈췄습니다." };
      break;
    }
    // 매번 다시 읽는다 — 다른 탭이 이 묶음을 이어 맡겼거나, 기록을 지워 장이 빠졌거나, 새 묶음으로 바뀌었을 수 있다.
    const draft = readDraft(storage, memberId);
    if (!draft || draft.batchId !== batchId) {
      stopped = { kind: "changed", message: "맡길 목록이 다른 화면에서 바뀌어 멈췄습니다." };
      break;
    }
    const item = draft.items.find((it) => it.key === key);
    if (!item) continue; // 그사이 기록에서 지운 장
    if (client.submissions().some((s) => s.requestId === item.requestId)) {
      skipped += 1;
      opts.onProgress?.(sent + skipped, total);
      continue;
    }
    // 보내기 직전: 연결 범위가 묶음을 만든 때와 같은가. 한 묶음의 그림이 두 연결 범위에 나뉘어 들어가지 않게 한다.
    if (client.scopeId() !== draft.link) {
      stopped = { kind: "scope", message: "엔진 연결이 바뀌어 남은 장을 맡기지 않았습니다. 남은 장은 그대로 두었습니다." };
      break;
    }
    try {
      const { line: _line, copy: _copy, source: _source, key: _key, requestId, ...input } = item;
      const res = await client.submit(input, { requestId, tag: `batch:${batchId}:${key}` });
      sent += 1;
      if (res.state !== "accepted" && ["offline", "needPair", "closed", "forbidden"].includes(res.error.kind)) {
        stopped = { kind: res.error.kind, message: res.error.message };
        opts.onProgress?.(sent + skipped, total);
        break;
      }
    } catch (e) {
      // 접수 기록을 적지 못했거나 연결이 없어 보내지 않은 경우 — 이 장은 맡기지 않은 것이다.
      const err = e instanceof EngineError ? e : new EngineError("error", "맡기지 못했습니다.");
      stopped = { kind: err.kind, message: err.message };
      break;
    }
    opts.onProgress?.(sent + skipped, total);
  }
  const after = readDraft(storage, memberId);
  const same = !!after && after.batchId === batchId;
  const remaining = same ? unsent(after, client.submissions()).length : 0;
  if (same && !remaining) clearDraft(storage, memberId);
  return { sent, skipped, remaining, ...(stopped ? { stopped } : {}) };
}
