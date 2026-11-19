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

const randomSeed = (): number => {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] & SEED_MAX;
};

/**
 * 묶음 계획. 문제가 하나라도 있으면 items는 비우고 errors에 줄 번호와 이유를 담는다(일부만 맡기지 않는다).
 * line 0은 묶음 전체의 문제다.
 */
export function buildPlan(input: {
  text: string;
  preset: Preset;
  width: number;
  height: number;
  copies: number;
  variantId?: string | null;
  /** 고급: 시드를 직접 정하면 줄·장마다 1씩 늘려 쓴다 */
  fixedSeed?: number | null;
  random?: () => number;
}): Plan {
  const lines = parseLines(input.text);
  const copies = Number.isInteger(input.copies) && input.copies >= 1 && input.copies <= COPIES_MAX ? input.copies : 1;
  const total = lines.length * copies;
  const errors: PlanError[] = [];
  if (!lines.length) errors.push({ line: 0, message: "그림 설명을 한 줄 이상 적어 주세요." });
  if (total > BATCH_MAX) errors.push({ line: 0, message: `한 번에 ${BATCH_MAX}장까지 맡길 수 있습니다(지금 ${total}장). 줄 수나 장수를 줄여 주세요.` });
  const fixed = input.fixedSeed;
  if (fixed != null && !(Number.isInteger(fixed) && fixed >= 0 && fixed <= SEED_MAX)) errors.push({ line: 0, message: "시드는 0 이상의 정수로 적어 주세요." });
  const random = input.random ?? randomSeed;
  const items: PlanItem[] = [];
  const seen = new Set<number>();
  lines.forEach((source, i) => {
    for (let copy = 1; copy <= copies; copy++) {
      let seed = fixed != null ? (fixed + items.length) % (SEED_MAX + 1) : random();
      // 같은 묶음 안에서 시드가 겹치면 같은 그림이 나오고, 접수 기록과 맞춰 볼 때도 구별되지 않는다.
      while (fixed == null && seen.has(seed)) seed = random();
      seen.add(seed);
      const title = `${input.preset.label} ${i + 1}번${copies > 1 ? `-${copy}` : ""}`.slice(0, TITLE_LIMIT);
      const item: PlanItem = { line: i + 1, copy, source, title, prompt: buildPrompt(input.preset, source), width: input.width, height: input.height, seed };
      if (input.variantId) item.variantId = input.variantId;
      if (copy === 1) {
        const problem = /[^\x20-\x7e]/.test(source) ? "영문으로 적어 주세요(내 PC 그림 모델은 영어만 읽습니다)." : source.split(" ").length < 2 ? "조금 더 자세히 적어 주세요(두 단어 이상)." : checkArtInput(item);
        if (problem) errors.push({ line: i + 1, message: problem });
      }
      items.push(item);
    }
  });
  return { items: errors.length ? [] : items, errors, total, lines: lines.length };
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
