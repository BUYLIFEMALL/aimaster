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
// 묶음마다 고유 번호와 「시작할 때 이미 있던 접수 번호 목록」을 두고, 항목을 엔진에 맡기면 그 **접수 번호를 항목에 적는다**.
// 「이미 맡긴 항목」은 이 묶음에 적힌 접수 번호로 판단한다 — 예전 묶음에 내용(설명·크기·시드)이 같은 접수가 있어도
// 새 묶음의 항목은 따로 맡긴다(사용자가 새로 시작한 묶음이다).
const draftKey = (memberId: string) => `fis.draft.v1:${memberId}`;
const ledgerKeyOf = (memberId: string) => `fis.submissions.v1:${memberId}`;
const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export type DraftItem = PlanItem & {
  /** 묶음 안에서 이 항목을 가리키는 번호 */
  key: string;
  /** 이 항목을 엔진에 맡길 때 받은 접수 번호(맡기기 전에는 없음) */
  requestId?: string;
};
export type Draft = {
  v: 2;
  batchId: string;
  startedAt: number;
  /**
   * 이 묶음을 시작할 때 접수 기록에 이미 있던 접수 번호. 이 묶음의 항목은 여기에 있는 접수와 짝짓지 않는다.
   * (시각으로 가르면 같은 밀리초에 이어진 접수에서 어긋난다 — 번호로 가른다.) null은 예전 형식: 모든 접수와 짝지을 수 있다.
   */
  before: string[] | null;
  items: DraftItem[];
};

const newId = (): string => globalThis.crypto.randomUUID();

/** 이 회원의 접수 기록에 지금 있는 접수 번호들 */
function existingRequestIds(storage: KeyValueStore, memberId: string): string[] {
  try {
    const list: unknown = JSON.parse(storage.getItem(ledgerKeyOf(memberId)) ?? "[]");
    return Array.isArray(list) ? list.map((s) => (s && typeof s === "object" ? (s as Submission).requestId : null)).filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * 새 묶음을 보관한다(앞의 묶음을 덮어쓴다 — 화면은 남은 장이 있으면 새 묶음을 시작하지 못하게 막는다).
 * 지금 접수 기록에 있는 접수 번호를 함께 적어 둔다: 접수 번호가 아직 적히지 않은 항목은 「그 목록에 없는 접수」하고만 짝을 맞춘다.
 */
export function saveDraft(storage: KeyValueStore, memberId: string, items: PlanItem[], opts: { now?: () => number; uuid?: () => string } = {}): Draft {
  const uuid = opts.uuid ?? newId;
  const draft: Draft = { v: 2, batchId: uuid(), startedAt: (opts.now ?? Date.now)(), before: existingRequestIds(storage, memberId), items: items.map((it) => ({ ...it, key: uuid() })) };
  writeDraft(storage, memberId, draft);
  return draft;
}
function writeDraft(storage: KeyValueStore, memberId: string, draft: Draft): void {
  try {
    storage.setItem(draftKey(memberId), JSON.stringify(draft));
  } catch {
    throw new EngineError("storage", "브라우저에 맡길 목록을 적지 못했습니다. 저장 공간을 확인해 주세요.");
  }
}

/** 보관한 묶음. 손상된 내용은 없는 것으로 본다(엔진에 보내지 않는다). 예전 형식(v1, 묶음 번호 없음)도 읽는다 */
export function readDraft(storage: KeyValueStore, memberId: string): Draft | null {
  try {
    const data = JSON.parse(storage.getItem(draftKey(memberId)) ?? "null") as { v?: unknown; batchId?: unknown; startedAt?: unknown; before?: unknown; items?: unknown } | null;
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) return null;
    const raw = data.items as DraftItem[];
    if (raw.length > BATCH_MAX || !raw.every((it) => it && typeof it === "object" && checkArtInput(it) === null && Number.isInteger(it.seed) && (it.requestId === undefined || (typeof it.requestId === "string" && REQUEST_ID.test(it.requestId))))) return null;
    if (data.v === 2) {
      if (typeof data.batchId !== "string" || !data.batchId || !Number.isFinite(data.startedAt) || !raw.every((it) => typeof it.key === "string" && it.key)) return null;
      if (new Set(raw.map((it) => it.key)).size !== raw.length) return null;
      // before가 null이면 예전 형식에서 옮겨 온 묶음이다(이어 맡기는 동안 접수 번호를 적으며 새 형식으로 다시 적힌다).
      if (data.before !== null && (!Array.isArray(data.before) || !data.before.every((id) => typeof id === "string"))) return null;
      return { v: 2, batchId: data.batchId, startedAt: data.startedAt as number, before: data.before as string[] | null, items: raw };
    }
    // v1: 묶음 번호·시작 시각이 없던 형식 — 그때의 규칙(내용이 같은 접수가 있으면 맡긴 것으로 봄)대로 읽는다
    if (data.v === 1) return { v: 2, batchId: "legacy", startedAt: 0, before: null, items: raw.map((it, i) => ({ ...it, key: `legacy-${i}` })) };
    return null;
  } catch {
    return null;
  }
}
/** 보관한 묶음의 항목(없으면 빈 목록) */
export const loadDraft = (storage: KeyValueStore, memberId: string): DraftItem[] => readDraft(storage, memberId)?.items ?? [];

export function clearDraft(storage: KeyValueStore, memberId: string): void {
  try {
    storage.removeItem(draftKey(memberId));
  } catch {}
}

/** 접수 기록의 한 건이 이 계획 항목과 내용이 같은가 — 제목·설명·크기·시드·구성 */
const sameContent = (s: Submission, item: PlanItem): boolean =>
  s.title === item.title.trim() && s.task.prompt === item.prompt.trim() && s.task.seed === item.seed && s.task.width === item.width && s.task.height === item.height && (s.task.variantId ?? null) === (item.variantId ?? null);

/** 내용이 같은 접수 찾기(묶음을 가리지 않는다 — 묶음 안의 판단에는 resolveDraft를 쓴다) */
export function findSubmission(subs: Submission[], item: PlanItem): Submission | null {
  return subs.find((s) => sameContent(s, item)) ?? null;
}

/**
 * 묶음의 항목마다 「이미 맡겼는가」를 정한다. 돌려주는 값은 항목 key → 접수 번호(맡긴 항목만).
 * - 접수 번호가 적힌 항목은 맡긴 것이다(그 접수가 받았는지 모르는 상태여도 다시 맡기지 않는다).
 * - 접수 번호가 없는 항목은, 맡기는 도중 화면이 닫혀 번호를 못 적었을 수 있다. **이 묶음을 시작할 때 없던** 접수 가운데
 *   내용이 같고 아직 다른 항목과 짝짓지 않은 것이 있으면 그것이 이 항목의 접수다. 시작할 때 이미 있던 접수와는 짝짓지 않는다.
 */
export function resolveDraft(draft: Draft, subs: Submission[]): Map<string, string> {
  const out = new Map<string, string>();
  const claimed = new Set<string>(draft.before ?? []);
  for (const it of draft.items) {
    if (it.requestId) {
      out.set(it.key, it.requestId);
      claimed.add(it.requestId);
    }
  }
  for (const it of draft.items) {
    if (it.requestId) continue;
    const hit = subs.find((s) => !claimed.has(s.requestId) && sameContent(s, it));
    if (hit) {
      out.set(it.key, hit.requestId);
      claimed.add(hit.requestId);
    }
  }
  return out;
}

/**
 * 접수 기록을 지우거나 새로 맡길 때, 보관한 묶음에서도 그 항목을 뺀다.
 * 빼지 않으면 기록에서 지운 그림이 「남은 장」으로 되살아나 「이어서 맡기기」에 딸려 간다.
 */
export function dropFromDraft(storage: KeyValueStore, memberId: string, sub: Submission): void {
  const draft = readDraft(storage, memberId);
  if (!draft) return;
  const resolved = resolveDraft(draft, [sub]);
  const kept = draft.items.filter((it) => resolved.get(it.key) !== sub.requestId);
  if (kept.length === draft.items.length) return;
  if (kept.length) writeDraft(storage, memberId, { ...draft, items: kept });
  else clearDraft(storage, memberId);
}

/** 보관한 묶음에서 아직 맡기지 않은 항목 */
export function remainingItems(client: Pick<EngineClient, "submissions" | "memberId">, storage: KeyValueStore): DraftItem[] {
  const draft = readDraft(storage, client.memberId);
  if (!draft) return [];
  const resolved = resolveDraft(draft, client.submissions());
  return draft.items.filter((it) => !resolved.has(it.key));
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
 * 보관해 둔 묶음에서 아직 맡기지 않은 항목만 하나씩 맡긴다.
 * - 이 묶음에서 이미 맡긴 항목은 상태가 무엇이든(받았는지 모름 포함) 다시 보내지 않는다.
 * - 맡길 때마다 받은 접수 번호를 묶음의 그 항목에 적는다.
 * - 엔진이 꺼졌거나 연결이 필요하거나 엔진이 이 사이트의 작업을 닫았으면 거기서 멈춘다(남은 항목은 보관).
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
    // 매번 다시 읽는다 — 다른 탭이 이 묶음을 이어 맡겼거나, 기록을 지워 항목이 빠졌거나, 새 묶음으로 바뀌었을 수 있다.
    const draft = readDraft(storage, memberId);
    if (!draft || draft.batchId !== batchId) {
      stopped = { kind: "changed", message: "맡길 목록이 다른 화면에서 바뀌어 멈췄습니다." };
      break;
    }
    const item = draft.items.find((it) => it.key === key);
    if (!item) continue; // 그사이 기록에서 지운 항목
    if (resolveDraft(draft, client.submissions()).has(key)) {
      skipped += 1;
    } else {
      try {
        const { line: _line, copy: _copy, source: _source, key: _key, requestId: _requestId, ...input } = item;
        const res = await client.submit(input);
        sent += 1;
        // 받은 접수 번호를 이 항목에 적는다(적지 못해도, 묶음 시작 뒤에 생긴 같은 내용 접수로 다시 짝이 맞는다).
        const fresh = readDraft(storage, memberId);
        if (fresh && fresh.batchId === batchId) {
          try {
            writeDraft(storage, memberId, { ...fresh, items: fresh.items.map((it) => (it.key === key ? { ...it, requestId: res.requestId } : it)) });
          } catch {}
        }
        if (res.state !== "accepted" && ["offline", "needPair", "closed", "forbidden"].includes(res.error.kind)) {
          stopped = { kind: res.error.kind, message: res.error.message };
          opts.onProgress?.(sent + skipped, total);
          break;
        }
      } catch (e) {
        // 기록을 적지 못했거나 연결이 없어 보내지 않은 경우 — 이 항목은 맡기지 않은 것이다.
        const err = e instanceof EngineError ? e : new EngineError("error", "맡기지 못했습니다.");
        stopped = { kind: err.kind, message: err.message };
        break;
      }
    }
    opts.onProgress?.(sent + skipped, total);
  }
  const after = readDraft(storage, memberId);
  const remaining = after && after.batchId === batchId ? remainingItems(client, storage).length : 0;
  if (!remaining && after && after.batchId === batchId) clearDraft(storage, memberId);
  return { sent, skipped, remaining, ...(stopped ? { stopped } : {}) };
}
