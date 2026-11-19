// 한 묶음(그림 24장까지)의 계획을 만들고, 엔진에 하나씩 맡긴다. 화면과 분리한 판단 로직이라 설치 없이 시험한다.
import { EngineError, SEED_MAX, TITLE_LIMIT, checkArtInput, type EngineClient, type KeyValueStore, type Submission, type SubmitInput } from "../engine.ts";
import { buildPrompt, type Preset } from "./presets.ts";
import { crossTabLock, submitLockName, type Lock } from "./lock.ts";

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
  /**
   * 이 장을 엔진에 보내려고 한 시각. **보내기 직전에** 적는다(접수 기록과 별도의 근거).
   * 접수 기록은 300건을 넘으면 오래된 것부터 정리되므로, 「접수 기록에 없다」만으로는 보내지 않았다고 할 수 없다.
   * 이 표시가 있으면 접수 기록이 사라져도 「보냈을 수 있음」으로 다룬다 — 다시 보내지도 새 묶음으로 옮기지도 않는다.
   */
  tried?: number;
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
  if (!raw.every((it) => validItem(it) && typeof it.key === "string" && !!it.key && typeof it.requestId === "string" && REQUEST_ID.test(it.requestId) && (it.tried === undefined || Number.isFinite(it.tried)))) return null;
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

/**
 * 묶음의 장을 세 가지로 가른다.
 *  - sent      접수 기록에 그 접수 번호가 있다(상태가 무엇이든 맡긴 것)
 *  - uncertain 보내려 한 표시(tried)는 있는데 접수 기록에 없다 — 보내는 도중 닫혔거나, 접수 기록이 정리돼 사라졌다.
 *              엔진이 받았을 수 있다. 다시 보내지도 새 묶음으로 옮기지도 않는다.
 *  - unsent    보내려 한 적도 없고 접수 기록에도 없다 — 엔진에 간 적이 없다
 */
function classify(draft: Draft, subs: Submission[]): { sent: DraftItem[]; uncertain: DraftItem[]; unsent: DraftItem[] } {
  const have = new Set(subs.map((s) => s.requestId));
  const out = { sent: [] as DraftItem[], uncertain: [] as DraftItem[], unsent: [] as DraftItem[] };
  for (const it of draft.items) (have.has(it.requestId) ? out.sent : it.tried !== undefined ? out.uncertain : out.unsent).push(it);
  return out;
}

/** 묶음에서 아직 엔진에 보낸 적이 없는 장 */
export function remainingItems(client: Pick<EngineClient, "submissions" | "memberId">, storage: KeyValueStore): DraftItem[] {
  const draft = readDraft(storage, client.memberId);
  return draft ? classify(draft, client.submissions()).unsent : [];
}

export type DraftStatus = {
  /** 지금 연결에서 이어 맡길 수 있는 남은 장 */
  remaining: number;
  /** 묶음을 만든 뒤 엔진 연결이 바뀌어 그대로는 맡길 수 없는 남은 장 */
  otherScope: number;
  /** 예전 형식으로 보관돼 맡겼는지 알 수 없는 장 */
  legacy: number;
  /** 보내려 한 흔적은 있는데 접수 기록이 없어, 엔진이 받았는지 알 수 없는 장 */
  uncertain: number;
};
export function draftStatus(client: Pick<EngineClient, "submissions" | "memberId" | "scopeId">, storage: KeyValueStore): DraftStatus {
  const legacy = legacyDraftItems(storage, client.memberId).length;
  const draft = readDraft(storage, client.memberId);
  if (!draft) return { remaining: 0, otherScope: 0, legacy, uncertain: 0 };
  const { unsent, uncertain } = classify(draft, client.submissions());
  return draft.link === client.scopeId() ? { remaining: unsent.length, otherScope: 0, legacy, uncertain: uncertain.length } : { remaining: 0, otherScope: unsent.length, legacy, uncertain: uncertain.length };
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
 * 사용자가 고른 경우에만: 엔진이 받았는지 알 수 없는 장(uncertain)을 묶음에서 지운다.
 * 엔진이 이미 그렸다면 그 그림은 엔진 창에 남는다. 지운 뒤 필요하면 사용자가 새로 적어 맡긴다.
 */
export function discardUncertain(client: Pick<EngineClient, "submissions" | "memberId">, storage: KeyValueStore, acknowledged: boolean): number {
  if (!acknowledged) throw new EngineError("invalid", "지우기 전에 먼저 확인해 주세요.");
  const draft = readDraft(storage, client.memberId);
  if (!draft) return 0;
  const { uncertain, unsent } = classify(draft, client.submissions());
  if (!uncertain.length) return 0;
  const gone = new Set(uncertain.map((it) => it.key));
  // 보낸 적 없는 장이 남아 있으면 묶음을 유지하고, 이미 맡긴 장만 남으면 더 할 일이 없으므로 묶음을 비운다.
  if (unsent.length) writeDraft(storage, client.memberId, { ...draft, items: draft.items.filter((it) => !gone.has(it.key)) });
  else clearDraft(storage, client.memberId);
  return gone.size;
}

/**
 * 사용자가 고른 경우에만: 지금 연결에서 맡길 수 없는 남은 장을 **새 묶음**(새 접수 번호, 지금 연결 범위)으로 옮긴다.
 *  - 연결이 바뀐 묶음: **보낸 적이 없는 장만** 옮긴다. 접수 기록이 있는 장, 보내려 한 흔적이 있는 장(받았는지 모름)은 옮기지 않는다.
 *    받았는지 모르는 장이 남아 있으면 옮기지 않고 먼저 그것을 정리하게 한다(새 묶음이 그 장을 덮어써 흔적이 사라지지 않게).
 *  - 예전 형식 묶음: 어느 장이 맡겨졌는지 알 수 없으므로 전부 옮긴다. 이미 그린 장이 있으면 같은 그림이 한 번 더 나온다(화면이 먼저 알린다).
 */
export function adoptDraft(client: Pick<EngineClient, "submissions" | "memberId" | "scopeId">, storage: KeyValueStore, acknowledged: boolean): Draft | null {
  if (!acknowledged) throw new EngineError("invalid", "남은 장을 새 묶음으로 맡기려면 먼저 확인해 주세요.");
  const memberId = client.memberId;
  const draft = readDraft(storage, memberId);
  const strip = ({ line, copy, source, title, prompt, width, height, seed, variantId }: PlanItem): PlanItem => ({ line, copy, source, title, prompt, width, height, seed, ...(variantId ? { variantId } : {}) });
  let items: PlanItem[];
  if (draft) {
    if (draft.link === client.scopeId()) return null;
    const { unsent, uncertain } = classify(draft, client.submissions());
    if (uncertain.length) throw new EngineError("invalid", `엔진이 받았는지 알 수 없는 그림이 ${uncertain.length}장 있습니다. 먼저 그 장을 정리해 주세요.`);
    items = unsent.map(strip);
  } else {
    items = legacyDraftItems(storage, memberId);
  }
  if (!items.length) return null;
  return saveDraft(storage, memberId, items);
}

export type RunResult = {
  /** 이번에 엔진에 보낸 수 */
  sent: number;
  /** 이 묶음에서 이미 맡겨져 있어(또는 받았는지 몰라) 건너뛴 수 */
  skipped: number;
  /** 아직 보내지 못한 수(보낸 적이 없는 장) */
  remaining: number;
  /** 중간에 멈춘 이유(끝까지 갔으면 없음) */
  stopped?: { kind: string; message: string };
};

const NO_LOCK = "이 브라우저는 여러 탭이 같은 그림을 동시에 맡기는 것을 막을 수단이 없어, 여러 장 맡기기를 하지 않습니다. 최신 크롬·엣지·웨일·사파리에서 열어 주세요.";

/**
 * 보관해 둔 묶음에서 아직 보낸 적이 없는 장만 하나씩 맡긴다.
 *
 * 한 장을 맡기는 순서(회원별 접수 잠금 안에서 — 다른 탭과 겹치지 않는다):
 *  1) 묶음과 접수 기록을 **다시 읽는다**. 그 접수 번호가 접수 기록에 있거나 보내려 한 표시가 있으면 보내지 않는다.
 *  2) 연결 범위가 묶음을 만든 때와 같은지 본다. 다르면 남은 장을 그대로 두고 멈춘다.
 *  3) 묶음의 그 장에 「보내려 함」 표시를 적는다. 적지 못하면 보내지 않는다.
 *  4) 미리 정한 접수 번호와 **기대하는 연결 범위**를 연결 계층에 넘겨 맡긴다. 연결 계층은 연결 기록을 한 번 읽어
 *     범위를 견주고 그때의 토큰으로 접수 기록을 적고 보낸다 — 2)와 4) 사이에 연결이 바뀌면 보내지 않는다.
 *  5) 연결 계층이 **보내기 전에** 거절했으면(연결 필요·범위 바뀜·접수 기록을 적지 못함) 3)의 표시를 지운다.
 *
 * - 탭 사이 잠금이 없는 브라우저에서는 맡기지 않고 이유를 돌려준다(opts.lock으로 잠금을 넣어 준 경우는 그것을 쓴다).
 * - 예전 형식 묶음은 맡기지 않는다(확인이 필요한 장으로 남는다).
 * - 보낸 적 없는 장도, 받았는지 모르는 장도 없으면 보관한 묶음을 지운다.
 */
export async function submitRemaining(
  client: EngineClient,
  storage: KeyValueStore,
  opts: { onProgress?: (done: number, total: number) => void; shouldStop?: () => boolean; lock?: Lock | null } = {},
): Promise<RunResult> {
  const memberId = client.memberId;
  const first = readDraft(storage, memberId);
  if (!first) return { sent: 0, skipped: 0, remaining: 0 };
  const lock = opts.lock === undefined ? crossTabLock() : opts.lock;
  if (!lock) return { sent: 0, skipped: 0, remaining: classify(first, client.submissions()).unsent.length, stopped: { kind: "nolock", message: NO_LOCK } };
  const batchId = first.batchId;
  const total = first.items.length;
  let sent = 0;
  let skipped = 0;
  let stopped: RunResult["stopped"];

  /** 한 장. 돌려주는 값: 계속할지(true) 멈출지(false) */
  const one = (key: string): Promise<boolean> =>
    lock(submitLockName(memberId), async () => {
      // 1) 잠금을 얻은 뒤에 다시 읽는다 — 다른 탭이 이 장을 먼저 맡겼을 수 있다.
      const draft = readDraft(storage, memberId);
      if (!draft || draft.batchId !== batchId) {
        stopped = { kind: "changed", message: "맡길 목록이 다른 화면에서 바뀌어 멈췄습니다." };
        return false;
      }
      const item = draft.items.find((it) => it.key === key);
      if (!item) return true; // 그사이 기록에서 지운 장
      if (item.tried !== undefined || client.submissions().some((s) => s.requestId === item.requestId)) {
        skipped += 1;
        return true;
      }
      // 2) 연결 범위
      if (client.scopeId() !== draft.link) {
        stopped = { kind: "scope", message: "엔진 연결이 바뀌어 남은 장을 맡기지 않았습니다. 남은 장은 그대로 두었습니다." };
        return false;
      }
      // 3) 보내려 함 표시(접수 기록과 별도의 근거). 적지 못하면 보내지 않는다.
      const mark = (tried: number | undefined) => {
        const now = readDraft(storage, memberId);
        if (!now || now.batchId !== batchId) return;
        writeDraft(storage, memberId, { ...now, items: now.items.map((it) => (it.key === key ? (tried === undefined ? (({ tried: _t, ...rest }) => rest)(it) : { ...it, tried }) : it)) });
      };
      try {
        mark(Date.now());
      } catch (e) {
        stopped = { kind: "storage", message: e instanceof Error ? e.message : "브라우저에 맡길 목록을 적지 못했습니다." };
        return false;
      }
      // 4) 맡기기 — 미리 정한 접수 번호 + 기대하는 연결 범위
      try {
        const { line: _line, copy: _copy, source: _source, key: _key, requestId, tried: _tried, ...input } = item;
        const res = await client.submit(input, { requestId, tag: `batch:${batchId}:${key}`, expectLink: draft.link });
        sent += 1;
        if (res.state !== "accepted" && ["offline", "needPair", "closed", "forbidden"].includes(res.error.kind)) {
          stopped = { kind: res.error.kind, message: res.error.message };
          return false;
        }
        return true;
      } catch (e) {
        // 5) 연결 계층이 보내기 전에 거절했다(접수 기록이 없다) — 이 장은 보낸 적이 없다. 표시를 지운다.
        const err = e instanceof EngineError ? e : new EngineError("error", "맡기지 못했습니다.");
        if (!client.submissions().some((s) => s.requestId === item.requestId)) {
          try {
            mark(undefined);
          } catch {
            // 표시를 지우지 못하면 「받았는지 모름」으로 남는다(다시 보내지 않는 안전한 쪽)
          }
        }
        stopped = err.kind === "stale" ? { kind: "scope", message: "엔진 연결이 바뀌어 남은 장을 맡기지 않았습니다. 남은 장은 그대로 두었습니다." } : { kind: err.kind, message: err.message };
        return false;
      }
    });

  for (const key of first.items.map((it) => it.key)) {
    if (opts.shouldStop?.()) {
      stopped = { kind: "user", message: "맡기기를 멈췄습니다." };
      break;
    }
    const go = await one(key);
    opts.onProgress?.(sent + skipped, total);
    if (!go) break;
  }
  const after = readDraft(storage, memberId);
  const same = !!after && after.batchId === batchId;
  const left = same ? classify(after, client.submissions()) : null;
  if (same && left && !left.unsent.length && !left.uncertain.length) clearDraft(storage, memberId);
  return { sent, skipped, remaining: left ? left.unsent.length : 0, ...(stopped ? { stopped } : {}) };
}
