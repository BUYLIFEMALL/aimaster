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
const draftKey = (memberId: string) => `fis.draft.v1:${memberId}`;

export function saveDraft(storage: KeyValueStore, memberId: string, items: PlanItem[]): void {
  try {
    storage.setItem(draftKey(memberId), JSON.stringify({ v: 1, items }));
  } catch {
    throw new EngineError("storage", "브라우저에 맡길 목록을 적지 못했습니다. 저장 공간을 확인해 주세요.");
  }
}
export function loadDraft(storage: KeyValueStore, memberId: string): PlanItem[] {
  try {
    const data = JSON.parse(storage.getItem(draftKey(memberId)) ?? "null") as { v?: unknown; items?: unknown } | null;
    if (!data || data.v !== 1 || !Array.isArray(data.items)) return [];
    const items = data.items as PlanItem[];
    // 손상된 목록을 엔진에 보내지 않는다.
    return items.length <= BATCH_MAX && items.every((it) => it && typeof it === "object" && checkArtInput(it) === null && Number.isInteger(it.seed)) ? items : [];
  } catch {
    return [];
  }
}
export function clearDraft(storage: KeyValueStore, memberId: string): void {
  try {
    storage.removeItem(draftKey(memberId));
  } catch {}
}

/** 이 계획 항목이 이미 접수 기록에 있는가 — 제목·설명·크기·시드가 모두 같으면 같은 항목이다 */
export function findSubmission(subs: Submission[], item: PlanItem): Submission | null {
  return subs.find((s) => s.title === item.title.trim() && s.task.prompt === item.prompt.trim() && s.task.seed === item.seed && s.task.width === item.width && s.task.height === item.height && (s.task.variantId ?? null) === (item.variantId ?? null)) ?? null;
}

/**
 * 접수 기록을 지우거나 새로 맡길 때, 보관한 묶음에서도 그 항목을 뺀다.
 * 빼지 않으면 기록에서 지운 그림이 「남은 장」으로 되살아나 「이어서 맡기기」에 딸려 간다.
 */
export function dropFromDraft(storage: KeyValueStore, memberId: string, sub: Submission): void {
  const items = loadDraft(storage, memberId);
  const kept = items.filter((it) => !findSubmission([sub], it));
  if (kept.length === items.length) return;
  if (kept.length) saveDraft(storage, memberId, kept);
  else clearDraft(storage, memberId);
}

/** 묶음에서 아직 접수 기록에 없는 항목 */
export function remainingItems(client: Pick<EngineClient, "submissions">, items: PlanItem[]): PlanItem[] {
  const subs = client.submissions();
  return items.filter((it) => !findSubmission(subs, it));
}

export type RunResult = {
  /** 이번에 엔진에 보낸 수 */
  sent: number;
  /** 접수 기록에 이미 있어 건너뛴 수 */
  skipped: number;
  /** 아직 보내지 못한 수 */
  remaining: number;
  /** 중간에 멈춘 이유(끝까지 갔으면 없음) */
  stopped?: { kind: string; message: string };
};

/**
 * 보관해 둔 묶음에서 아직 접수 기록에 없는 항목만 하나씩 맡긴다.
 * - 접수 기록에 이미 있는 항목은 상태가 무엇이든(받았는지 모름 포함) 다시 보내지 않는다.
 * - 엔진이 꺼졌거나 연결이 필요하거나 엔진이 이 사이트의 작업을 닫았으면 거기서 멈춘다(남은 항목은 보관).
 * - 모두 접수 기록에 올라가면 보관한 묶음을 지운다.
 */
export async function submitRemaining(client: EngineClient, storage: KeyValueStore, opts: { onProgress?: (done: number, total: number) => void; shouldStop?: () => boolean } = {}): Promise<RunResult> {
  const items = loadDraft(storage, client.memberId);
  let sent = 0;
  let skipped = 0;
  let stopped: RunResult["stopped"];
  for (const item of items) {
    if (opts.shouldStop?.()) {
      stopped = { kind: "user", message: "맡기기를 멈췄습니다." };
      break;
    }
    if (findSubmission(client.submissions(), item)) {
      skipped += 1;
    } else {
      try {
        const { line: _line, copy: _copy, source: _source, ...input } = item;
        const res = await client.submit(input);
        sent += 1;
        if (res.state !== "accepted" && ["offline", "needPair", "closed", "forbidden"].includes(res.error.kind)) {
          stopped = { kind: res.error.kind, message: res.error.message };
          opts.onProgress?.(sent + skipped, items.length);
          break;
        }
      } catch (e) {
        // 기록을 적지 못했거나 연결이 없어 보내지 않은 경우 — 이 항목은 접수 기록에 없다.
        const err = e instanceof EngineError ? e : new EngineError("error", "맡기지 못했습니다.");
        stopped = { kind: err.kind, message: err.message };
        break;
      }
    }
    opts.onProgress?.(sent + skipped, items.length);
  }
  const remaining = remainingItems(client, items).length;
  if (!remaining) clearDraft(storage, client.memberId);
  return { sent, skipped, remaining, ...(stopped ? { stopped } : {}) };
}
