// 리믹스 저장 전용 소유 토큰 잠금 — 잡기 → 승격(insert 전 영속 표시) → 완료/해제를 같은 토큰 조건부 갱신(CAS)으로 묶는다.
// 2026-11-20 리믹스 가사 1차, Master msg_a128960629ac. 순수 모듈·미연결: DB를 직접 부르지 않고 넘겨받은 cas 함수만 쓴다.
// 공용 lib/syncLock.ts(4개 표 공용)와 다른 3개 표는 바꾸지 않는다. 삭제 권한 변경은 보류(표시만으로 삭제를 열지 않음).
// 설계: docs/PLAN_20261120_REMIX_LYRICS_PERSISTENCE.md 「U1 증명 조건」·「소유 토큰 잠금」.

export const LOCK_PREFIX = "__rsync__:"; // 잡은 뒤 insert 전 — 5분 지나면 다른 처리가 교체 가능
export const INSERTING_PREFIX = "__rins__:"; // insert를 보내기 직전 영속 표시 — 만료되지 않음(재처리 영구 차단)
export const LEGACY_LOCK = "__syncing__"; // 기존 공용 잠금 값(배포 전환 중 남아 있을 수 있음)
export const STALE_MS = 5 * 60 * 1000;

export const lockValue = (token: string) => `${LOCK_PREFIX}${token}`;
export const insertingValue = (taskId: string, token: string) => `${INSERTING_PREFIX}${taskId}:${token}`;

/** 조건부 갱신 하나의 조건 — 실제 구현에서는 PostgREST .eq/.or/.lt 로 옮긴다 */
export interface CasWhere {
  id: string;
  taskId: string;
  hop: number;
  status: "generating";
  /** error_message 조건: 정확히 이 값 / 또는 「비었거나·만료된 잡기 잠금·만료된 기존 잠금」 */
  errorMessage: { eq: string } | { acquirable: { staleBefore: string } };
}
export interface CasSet {
  error_message: string | null;
  status?: "completed" | "failed";
  updated_at: string;
}
/** 바뀐 행 수를 돌려준다. 응답을 받지 못하면(전송 결과 불확실) 예외를 던진다. */
export type CasFn = (set: CasSet, where: CasWhere) => Promise<number>;

// ok = 1행 바뀜 / lost = 0행(조건 불일치·다른 소유자) / rejected = 응답을 받았고 DB가 확정 거절(적용 안 됨) / uncertain = 응답 미확정
export type StepResult = "ok" | "lost" | "rejected" | "uncertain";

/** CasFn이 「응답을 받았고 DB가 분명히 거절해 적용되지 않았다」를 알릴 때 던진다(그 밖 예외는 모두 불확실) */
export class CasRejectedError extends Error {
  constructor(public readonly code: string) {
    super(`잠금 갱신을 DB가 거절했습니다(${code}).`);
    this.name = "CasRejectedError";
  }
}

async function cas(fn: CasFn, set: CasSet, where: CasWhere): Promise<StepResult> {
  try {
    return (await fn(set, where)) === 1 ? "ok" : "lost";
  } catch (e) {
    return e instanceof CasRejectedError ? "rejected" : "uncertain";
  }
}

export interface LockCtx { id: string; taskId: string; hop: number; token: string; now: () => Date }
const base = (c: LockCtx) => ({ id: c.id, taskId: c.taskId, hop: c.hop, status: "generating" as const });

/** 잡기: 비었거나, 만료된 잡기 잠금(__rsync__:*)·만료된 기존 잠금(__syncing__)일 때만. __rins__:* 는 절대 잡지 않음. */
export function acquire(fn: CasFn, c: LockCtx): Promise<StepResult> {
  const staleBefore = new Date(c.now().getTime() - STALE_MS).toISOString();
  return cas(fn, { error_message: lockValue(c.token), updated_at: c.now().toISOString() }, { ...base(c), errorMessage: { acquirable: { staleBefore } } });
}

/** 승격: 내 잡기 잠금일 때만 insert 전 영속 표시로. 이 결과가 ok일 때만 insert를 보낸다. */
export function promote(fn: CasFn, c: LockCtx): Promise<StepResult> {
  return cas(fn, { error_message: insertingValue(c.taskId, c.token), updated_at: c.now().toISOString() }, { ...base(c), errorMessage: { eq: lockValue(c.token) } });
}

/** 해제: 승격 전, 내 잡기 잠금일 때만(남의 잠금·영속 표시는 건드리지 않음) */
export function release(fn: CasFn, c: LockCtx): Promise<StepResult> {
  return cas(fn, { error_message: null, updated_at: c.now().toISOString() }, { ...base(c), errorMessage: { eq: lockValue(c.token) } });
}

/** 완료/확정 실패: 내 영속 표시일 때만 */
export function finish(fn: CasFn, c: LockCtx, status: "completed" | "failed", message: string | null = null): Promise<StepResult> {
  return cas(fn, { error_message: message, status, updated_at: c.now().toISOString() }, { ...base(c), errorMessage: { eq: insertingValue(c.taskId, c.token) } });
}

/** 잡기 조건 판정(모의 DB·시험·실제 구현 대조용) */
export function isAcquirable(errorMessage: string | null, updatedAt: string, staleBefore: string): boolean {
  if (errorMessage === null) return true;
  if (errorMessage.startsWith(INSERTING_PREFIX)) return false;
  if (errorMessage.startsWith(LOCK_PREFIX) || errorMessage === LEGACY_LOCK) return updatedAt < staleBefore;
  if (errorMessage.startsWith("__")) return false; // 모르는 내부 표시(`__`로 시작)는 잡지 않음 — DB 어댑터 acquirableFilter와 같은 뜻
  return true; // 그 밖 문구(이전 실패 메시지 등)는 지금 공용 잠금과 같이 잡을 수 있음 — status=generating 조건이 함께 걸림
}

export type InsertOutcome = "ok" | "ok_without_lyrics_columns" | "error" | "uncertain" | "retry_failed" | "retry_uncertain" | "skipped";

export interface SaveRun {
  acquired: StepResult;
  promoted?: StepResult;
  insertCalled: boolean;
  insertOutcome?: InsertOutcome;
  finished?: StepResult;
  released?: StepResult;
  extendAllowed: boolean;
}

/**
 * 한 번의 저장 흐름(웹훅·수동 공통). insert는 승격이 ok일 때만, 연장은 insert가 ok 계열이고 완료 갱신 전 단계일 때만 허용 표시.
 * 승격 응답 유실(uncertain)이면 insert 0·해제 0으로 멈춘다(승격됐는지 모르므로 — 승격 안 됐으면 잡기 잠금이 5분 뒤 만료돼 안전하게 재처리).
 */
export async function runRemixSave(fn: CasFn, c: LockCtx, insert: () => Promise<InsertOutcome>): Promise<SaveRun> {
  const acquired = await acquire(fn, c);
  if (acquired !== "ok") return { acquired, insertCalled: false, extendAllowed: false };
  const promoted = await promote(fn, c);
  // 승격이 분명히 안 됐을 때(0행·확정 거절)만 내 잡기 잠금 해제 시도, 미확정이면 insert 0·해제 0
  if (promoted === "lost" || promoted === "rejected") return { acquired, promoted, insertCalled: false, released: await release(fn, c), extendAllowed: false };
  if (promoted === "uncertain") return { acquired, promoted, insertCalled: false, extendAllowed: false };
  let insertOutcome: InsertOutcome;
  try {
    insertOutcome = await insert();
  } catch {
    return { acquired, promoted, insertCalled: true, insertOutcome: "uncertain", extendAllowed: false }; // 표시가 이미 영속 — 더 쓰지 않음
  }
  if (insertOutcome === "uncertain" || insertOutcome === "retry_uncertain") {
    return { acquired, promoted, insertCalled: true, insertOutcome, extendAllowed: false };
  }
  const ok = insertOutcome === "ok" || insertOutcome === "ok_without_lyrics_columns";
  const finished = await finish(fn, c, ok ? "completed" : "failed", ok ? null : insertOutcome === "skipped" ? "Suno가 오디오 URL을 반환하지 않았습니다." : "곡을 저장하지 못했습니다.");
  return { acquired, promoted, insertCalled: true, insertOutcome, finished, extendAllowed: ok && finished === "ok" };
}
