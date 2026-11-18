// 원본 자산 보관 정리 실행자 — 일반 회원의 기간 지난 원본을 「만료 → 삭제 예약 → 삭제 → 확인」 순서로 정리한다.
// W01-R1 (2026-11-18, CC-SNS-01, Master msg_aa5f14772e27). 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §19·§19-R1·§19-R2.
// 경로 별칭·Next 모듈을 쓰지 않는다(시험이 직접 불러온다). 실제 DB·저장소 의존성은 라우트가 넘긴다.
//
// ★ 지금은 실행되지 않는다. 원본 저장 모드(AIF_ASSETS_MODE)가 "off"인 동안 라우트는 인증 뒤 아무 일도 하지 않고 끝낸다.
//   예약 실행(vercel.json crons)도 등록하지 않았다. DB 함수(aif_asset_expire·aif_asset_delete_verify 등)는 미적용 초안이다.
//
// 대상과 책임 분리
//  * 이 실행자는 보관 연장 표시가 없는 회원(profiles.retention_exempt = false)의 원본만 다룬다. 연장 회원은 중앙 정리가, 관리자 지정 회원은 아무도 다루지 않는다.
//    두 집합이 겹치지 않는 것은 「정적인」 사실일 뿐이다 — 정리 도중 회원 등급이 바뀌면 겹칠 수 있다(한계).
//  * 보호 여부·보관 기간·기산일 판정은 전부 DB 함수 aif_asset_expire가 잠금 안에서 한다. 이 파일은 날짜를 계산하지 않고 30이라는 숫자도 모른다.
//
// 한 회차(최대 CLEANUP_MAX_ITEMS건)는 세 묶음을 공정하게 나눠 본다
//  C) 확인만: 삭제 예약이 deleting·delete_unknown — 새 삭제 요청 없이 aif_asset_delete_verify만 부른다.
//  B) 이어 하기: 삭제 예약이 cancelled·delete_failed·claimed — 보호 변경을 다시 확인한 뒤 삭제를 진행한다.
//  A) 신규: ready 자산 — 만료 판정 뒤 삭제를 진행한다.
//  각 묶음은 updated_at(또는 created_at) 오름차순으로 읽고, DB 함수가 확인한 행의 updated_at을 갱신하므로 다음 회차에는 다른 행부터 본다.
//
// 삭제 규칙(계약 상태 전이표와 같아야 한다)
//  1. 외부 삭제(remove)는 「같은 토큰으로 부른 재확인이 expired」이고 「같은 토큰의 delete_mark(deleting)이 정확히 true」일 때만, 자산당 정확히 1회 보낸다.
//     그 밖의 모든 경우(복원·대상 아님·판정 불가·다른 실행이 쥠·호출 오류·응답 모양 이상)는 remove 0회다.
//  2. remove의 응답(성공·오류·4xx·던짐·시간 초과)으로는 결과를 정하지 않는다. 요청을 보낸 뒤에는 「지금 객체가 있다」가 요청 종료의 증거가 아니다.
//     항상 aif_asset_delete_verify로 마무리한다: 객체 없음만 deleted, 그 밖은 delete_unknown으로 남는다.
//  3. delete_unknown은 시간이 지나도 다시 지우지 않고 ready로 되돌리지도 않는다. 다음 회차에 확인만 한다(오래 남는 건의 해소는 후속 단위).
//  4. 토큰·상태 대조가 맞지 않으면(CAS 실패) 그 행은 우리 것이 아니다 — 아무것도 바꾸지 않고 그 자산 처리를 멈춘다.
//  5. deleting 커밋 전에 그만둘 때는 우리 토큰으로 cancelled를 시도한다(예약됨 → 실패 전이는 없다).
//  6. 보호 회원 목록을 읽지 못하면 회차 전체를 시작하지 않는다.
//  7. 유한 대기(2026-11-18 보완, Master msg_1bc70971878e): 주입된 모든 입출력(보호 목록·목록 조회·DB 함수·remove·측정)은
//     「호출당 상한(CLEANUP_IO_TIMEOUT_MS)」과 「회차 마감(CLEANUP_ROUND_DEADLINE_MS)까지 남은 시간」 중 짧은 쪽만 기다린다. 남은 시간이 없으면 호출 자체를 시작하지 않는다.
//     대기 초과는 「요청이 취소됐다」도 「실행되지 않았다」도 아니다 — 그 요청은 뒤에서 계속될 수 있고 DB는 나중에 커밋될 수 있다. 그래서
//       · 대기 초과가 나면 그 자산에 대해 더 진행하지 않고(추가 remove·자동 재시도·취소 시도 0), 그 뒤 항목도 시작하지 않는다(stopCode "IO_TIMEOUT").
//       · delete_mark(deleting)이 대기 초과면 remove 0 — 나중에 커밋돼 deleting으로 남으면 다음 회차의 「확인만」 묶음이 본다.
//       · remove가 대기 초과면 성공·실패를 단정하지 않고 다시 지우지 않는다. 회차에 남은 시간이 있으면 확인(delete_verify)을 한 번만 하고, 없으면 새 요청 없이 다음 회차로 넘긴다.
//       · 늦게 도착한 응답·거절은 버린다(추가 작업 0, 처리되지 않은 거절 0).
//  8. 삭제 진입 전 시간 확인(2026-11-18 P1, Master msg_7932d8b18fa0): delete_mark(deleting)을 부르기 전에 회차에 남은 시간이
//     「deleting 커밋 + remove + 확인」 세 번의 호출 상한(CLEANUP_IO_TIMEOUT_MS × 3)보다 적으면 그 삭제에 들어가지 않는다.
//     이때 우리 토큰으로 cancelled를 한 번만 시도하고(남은 시간 안에서), 결과가 불명이면 예약은 claimed로 남는다(1시간 뒤 토큰 없는 판정이 정리).
//     그 회차에서는 새 삭제를 더 시작하지 않는다(stopCode "TIME_BUDGET", 건수 deferredForTime). remove·delete_failed 전이는 쓰지 않는다.
//     목적은 「deleting으로 커밋됐는데 remove를 보내지 못한」 경우(removeNotSent)를 줄이는 것이다 — 없앤다는 보장이 아니다.
//     시계가 건너뛰거나 이벤트 루프가 밀리거나 응답이 늦으면 여전히 생길 수 있고, 그때는 아래 보호(deleting 보존·removeNotSent 집계)가 그대로 적용된다.
//     이것은 「기다리기를 그만두는 것」일 뿐이다. 원격 요청을 실제로 취소하지 않으며(AbortSignal 미전달 — 아래 한계), 회차가 정확히 몇 초 안에 끝난다는 보장도 아니다.
// 한계
//  * 설치된 SDK의 DB 조회에는 AbortSignal을 넘기는 방법이 있으나(읽기만 확인) 여기서는 쓰지 않았다 — 저장소 remove에는 같은 경로가 확인되지 않았고,
//    신호를 보내도 서버 쪽 실행이 멈춘다는 보장이 없어 판정 규칙은 달라지지 않는다. 실제 취소 연결은 후속 검토 대상.
//  * 재확인과 외부 삭제 사이에 회원이 보호 대상이 되면 그 파일은 지워질 수 있다(원자적이지 않다).
//  * 「정책 기간이 지난 뒤 다음 회차에 지워진다」는 정상 회차의 예일 뿐 보장이 아니다 — 밀린 건이 회차 상한보다 많거나, 회차가 중단되거나, 판정 불가(unknown)면 더 늦어진다.
//  * 객체가 없는 ready 행은 만료시키지 않는다(판정 불가). 그런 행이 많으면 묶음 A의 앞자리를 차지한다 — 복구는 후속 단위.
//  * deleted는 「저장소 메타데이터에 지금 없다」는 확인이다. 물리 파일의 영구 삭제를 보장하지 않는다.
// 응답·로그에는 건수와 코드만 싣는다. 경로·회원 id·토큰·오류 원문·비밀값은 싣지 않는다.

import type { AssetsMode } from "./generation";
import { ASSET_BUCKET, isCanonicalUuid, parseAssetPath } from "./paths";

export const CLEANUP_MAX_ITEMS = 100;
/** 삭제 진입(deleting) 횟수가 이 값에 이른 예약은 더 시도하지 않고 건수만 센다(사람 확인 대상) */
export const CLEANUP_MAX_ATTEMPTS = 5;
/** 이 시간이 지나면 새 항목을 시작하지 않는다(진행 중이던 항목은 아래 회차 마감까지 이어 간다) */
export const CLEANUP_TIME_BUDGET_MS = 240_000;
/** 주입된 입출력 한 번을 기다리는 상한 */
export const CLEANUP_IO_TIMEOUT_MS = 15_000;
/** 회차 마감: 이 시각이 지나면 어떤 입출력도 새로 시작하지 않는다(라우트 한도 300초보다 앞). 기다림의 상한일 뿐 원격 요청 취소나 종료 시각 보장이 아니다 */
export const CLEANUP_ROUND_DEADLINE_MS = 280_000;
/** 인증 비밀값의 최소 길이. 이보다 짧거나 비어 있으면 모든 요청을 거절한다(fail-closed) */
export const CLEANUP_SECRET_MIN_LENGTH = 16;

type Res = { data: unknown; error: unknown };
export type RetentionDeps = {
  /** 보호 회원 id 목록. 읽지 못하거나 모양이 이상하면 던져야 한다(loadRetentionExemptIdsStrict) */
  loadExemptIds: () => Promise<Set<string>>;
  /** 삭제 예약 중 deleting·delete_unknown, updated_at 오름차순 */
  listVerifyPending: (limit: number) => PromiseLike<Res>;
  /** 삭제 예약 중 cancelled·delete_failed·claimed, updated_at 오름차순 */
  listDeletePending: (limit: number) => PromiseLike<Res>;
  /** ready 자산 중 보관 연장 표시가 없는 회원 것, created_at 오름차순 */
  listReady: (limit: number) => PromiseLike<Res>;
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<Res>;
  /** 비공개 버킷에서 경로 삭제 */
  remove: (paths: string[]) => PromiseLike<Res>;
  now?: () => number;
  /** 시험용 시간 한도 덮어쓰기(운영 라우트는 넘기지 않는다) */
  limits?: { ioTimeoutMs?: number; timeBudgetMs?: number; roundDeadlineMs?: number };
};

export type CleanupCounts = {
  examined: number;
  /** 저장소 remove를 실제로 호출하기 시작한 횟수 */
  removeCalls: number;
  /** deleting 커밋 뒤 회차 마감에 걸려 remove를 시작하지 못한 건(외부 요청 미전송 — 「응답 불명」과 다르다) */
  removeNotSent: number;
  /** 남은 시간이 모자라 삭제에 들어가지 않은 건(deleting 커밋 전 — 외부 요청·deleting 기록 모두 없음) */
  deferredForTime: number;
  deleted: number;
  deleteUnknown: number;
  mismatch: number;
  restored: number;
  notDue: number;
  undetermined: number;
  busy: number;
  locked: number;
  skipped: number;
  protectedSkipped: number;
  claimFailed: number;
  markFailed: number;
  denied: number;
  gaveUp: number;
  invalidRows: number;
  listFailed: number;
  measureFailed: number;
  /** 대기 초과(또는 회차 마감으로 시작하지 못한) 입출력 수 */
  timeouts: number;
};
export type CleanupStopCode = "TIME_BUDGET" | "IO_TIMEOUT" | null;
export type CleanupResult =
  | { ok: true; aborted: false; stoppedEarly: boolean; stopCode: CleanupStopCode; counts: CleanupCounts }
  | { ok: false; aborted: true; code: "EXEMPT_UNAVAILABLE"; counts: CleanupCounts };

const emptyCounts = (): CleanupCounts => ({
  examined: 0, removeCalls: 0, removeNotSent: 0, deferredForTime: 0, deleted: 0, deleteUnknown: 0, mismatch: 0, restored: 0, notDue: 0, undetermined: 0, busy: 0, locked: 0,
  skipped: 0, protectedSkipped: 0, claimFailed: 0, markFailed: 0, denied: 0, gaveUp: 0, invalidRows: 0, listFailed: 0, measureFailed: 0, timeouts: 0,
});

type Item = { assetId: string; userId: string; path: string };
type DeletionItem = Item & { state: string; token: string; attempts: number };

/** 자산·예약 행 공통 검증: id·회원 id가 표준 UUID, 버킷이 우리 것, 경로가 「그 회원/종류/그 자산.확장자」 */
function checkItem(assetId: unknown, userId: unknown, bucket: unknown, path: unknown): Item | null {
  if (!isCanonicalUuid(assetId) || !isCanonicalUuid(userId) || bucket !== ASSET_BUCKET) return null;
  const parsed = parseAssetPath(path);
  if (!parsed || parsed.userId !== userId || parsed.assetId !== assetId) return null;
  return { assetId, userId, path: path as string };
}
const isRow = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** 세 묶음에 한 건씩 돌아가며 나눠 준다(한 묶음이 상한을 다 쓰지 못하게) */
export function allot(sizes: number[], max: number): number[] {
  const take = sizes.map(() => 0);
  let left = Math.max(0, Math.floor(max));
  let progressed = true;
  while (left > 0 && progressed) {
    progressed = false;
    for (let i = 0; i < sizes.length && left > 0; i++) {
      if (take[i] < sizes[i]) { take[i]++; left--; progressed = true; }
    }
  }
  return take;
}

/** 보관 정리 한 회차. 던지지 않는다. */
export async function runRetentionCleanup(deps: RetentionDeps): Promise<CleanupResult> {
  const c = emptyCounts();
  const now = deps.now ?? Date.now;
  const started = now();
  const ioTimeoutMs = deps.limits?.ioTimeoutMs ?? CLEANUP_IO_TIMEOUT_MS;
  const timeBudgetMs = deps.limits?.timeBudgetMs ?? CLEANUP_TIME_BUDGET_MS;
  const deadline = started + (deps.limits?.roundDeadlineMs ?? CLEANUP_ROUND_DEADLINE_MS);

  // 규칙 7: 유한 대기. halted가 한 번 켜지면 그 뒤로는 어떤 입출력도 새로 시작하지 않는다(force는 remove 대기 초과 뒤의 확인 한 번 전용).
  let halted = false;
  /** 삭제 진입 전 시간 확인에 걸리면 켜진다 — 이 회차에서는 새 삭제를 시작하지 않는다 */
  let noMoreDeletes = false;
  type Waited<T> = { done: true; value: T } | { done: false };
  const bounded = async <T>(call: () => PromiseLike<T> | T, force = false): Promise<Waited<T>> => {
    if (halted && !force) return { done: false };
    const remaining = deadline - now();
    if (remaining <= 0) {
      if (!halted) { halted = true; c.timeouts++; }
      return { done: false };   // 남은 시간이 없으면 호출을 시작하지 않는다
    }
    // 아래 race가 work에 처리기를 붙여 두므로, 기다리기를 그만둔 뒤 늦게 도착한 응답·거절은 조용히 버려진다(처리되지 않은 거절 0 — 시험으로 확인).
    const work = Promise.resolve().then(call);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const gaveUp = new Promise<"timeout">((resolve) => { timer = setTimeout(() => resolve("timeout"), Math.min(ioTimeoutMs, remaining)); });
    try {
      const r = await Promise.race([work.then((value) => ({ value })), gaveUp]);
      if (r === "timeout") { halted = true; c.timeouts++; return { done: false }; }   // 늦게 오는 응답은 버린다
      return { done: true, value: r.value };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
  const readList = async (call: () => PromiseLike<Res>): Promise<unknown[] | null> => {
    try {
      const w = await bounded(call);
      if (!w.done) return null;
      const r = w.value;
      if (!isRow(r) || r.error || !Array.isArray(r.data)) return null;
      return r.data;
    } catch {
      return null;
    }
  };

  // 규칙 6: 보호 회원 목록을 읽지 못하면 아무것도 하지 않는다(목록 조회·확인·삭제 전부 0). 대기 초과도 같다.
  let exempt: Set<string>;
  try {
    const w = await bounded(() => deps.loadExemptIds());
    if (!w.done || !(w.value instanceof Set)) throw new Error("shape");
    exempt = w.value;
  } catch {
    return { ok: false, aborted: true, code: "EXEMPT_UNAVAILABLE", counts: c };
  }

  /** 대기 초과면 null을 돌려주고 halted가 켜진다 — 호출부는 halted를 먼저 확인해 「응답 없음」과 「오류 응답」을 구분한다 */
  const text = async (fn: string, args: Record<string, unknown>, force = false): Promise<string | null> => {
    try {
      const w = await bounded(() => deps.rpc(fn, args), force);
      if (!w.done) return null;
      const r = w.value;
      return isRow(r) && !r.error && typeof r.data === "string" ? r.data : null;
    } catch {
      return null;
    }
  };
  /** 정확히 true일 때만 true. 오류·던짐·다른 값·대기 초과는 전부 false */
  const yes = async (fn: string, args: Record<string, unknown>): Promise<boolean> => {
    try {
      const w = await bounded(() => deps.rpc(fn, args));
      if (!w.done) return false;
      const r = w.value;
      return isRow(r) && !r.error && r.data === true;
    } catch {
      return false;
    }
  };
  const tally = (outcome: string | null) => {
    if (outcome === "restored") c.restored++;
    else if (outcome === "not_due") c.notDue++;
    else if (outcome === "busy") c.busy++;
    else if (outcome === "locked") c.locked++;
    else if (outcome === "skip") c.skipped++;
    else c.undetermined++;   // unknown·호출 오류·모르는 값
  };
  const touched = new Set<string>();

  /** 삭제 요청 뒤(또는 확인만 하는 묶음)의 마무리. 판정과 표시는 DB 함수가 한 거래에서 한다 */
  const verify = async (it: Item, token: string, afterRemove: boolean, force = false) => {
    const v = await text("aif_asset_delete_verify", { p_asset: it.assetId, p_user: it.userId, p_token: token }, force);
    if (v === "deleted") { c.deleted++; touched.add(it.userId); return; }
    if (v === "unknown") { c.deleteUnknown++; return; }
    if (v === "mismatch") { c.mismatch++; return; }
    if (v === "denied") { c.denied++; return; }   // 우리 것이 아니다 → 여기서 멈춘다
    if (halted) {
      // 대기 초과(이번 확인 또는 직전 remove): 표시 시도를 포함해 더 부르지 않는다. 상태는 deleting·delete_unknown으로 남아 다음 회차가 확인한다.
      if (afterRemove) c.deleteUnknown++;
      return;
    }
    // 확인 호출 자체가 실패. 방금 삭제 요청을 보낸 경우에만 「불명」 표시를 한 번 시도한다(실패해도 상태는 deleting으로 남아 다음 회차에 확인된다)
    if (afterRemove) await yes("aif_asset_delete_mark", { p_asset: it.assetId, p_user: it.userId, p_token: token, p_state: "delete_unknown" });
    c.deleteUnknown++;
  };

  /** 만료가 확인된 자산의 삭제 진행: 예약 → 같은 토큰 재확인 → deleting 커밋 → remove 1회 → 확인 */
  const proceedDelete = async (it: Item) => {
    let token: string | null = null;
    try {
      const w = await bounded(() => deps.rpc("aif_asset_claim_delete", { p_asset: it.assetId, p_user: it.userId, p_bucket: ASSET_BUCKET, p_path: it.path }));
      const r = w.done ? w.value : null;
      token = isRow(r) && !r.error && isCanonicalUuid(r.data) ? r.data : null;
    } catch {
      token = null;
    }
    if (halted) return;                        // 예약 응답을 받지 못함 → 나중에 커밋돼 claimed로 남을 수 있다. 더 진행하지 않는다
    if (!token) { c.claimFailed++; return; }   // 사용 중·다른 실행이 쥠·오류 → 삭제 0

    const mine = { p_asset: it.assetId, p_user: it.userId, p_token: token };
    // 삭제 직전 재확인(같은 토큰). expired가 아니면 삭제하지 않는다.
    const again = await text("aif_asset_expire", mine);
    if (halted) return;   // 재확인 응답 없음 → 삭제 0, 취소 시도도 하지 않는다(현재 상태 보존)
    if (again !== "expired") {
      // restored면 DB 함수가 이미 예약을 취소했다. 그 밖에는 우리 토큰으로 취소를 시도한다(맞지 않으면 아무것도 바뀌지 않는다).
      if (again !== "restored") await yes("aif_asset_delete_mark", { ...mine, p_state: "cancelled" });
      tally(again);
      return;
    }
    // deleting 커밋이 명시적으로 성공했을 때만 외부 삭제를 보낸다
    // 규칙 8: deleting 커밋·remove·확인 세 번을 기다릴 시간이 남아 있을 때만 들어간다
    if (deadline - now() < ioTimeoutMs * 3) {
      noMoreDeletes = true;
      c.deferredForTime++;
      // 우리 토큰으로 취소를 한 번만 시도한다(남은 시간 안에서). 실패·불명이면 claimed로 남는다 — 다른 토큰의 예약은 건드리지 못한다.
      await yes("aif_asset_delete_mark", { ...mine, p_state: "cancelled" });
      return;
    }
    const entered = await yes("aif_asset_delete_mark", { ...mine, p_state: "deleting" });
    if (halted) return;   // deleting 응답 없음 → remove 0. 나중에 커밋되면 deleting으로 남고 다음 회차가 확인한다
    if (!entered) { c.markFailed++; return; }

    // 집계는 실제로 호출을 시작하는 순간에 한다(Mac 검수 2026-11-18): 회차 마감에 걸려 bounded가 호출을 시작하지 않으면 remove는 0회다.
    let sent = false;
    try {
      await bounded(() => { sent = true; c.removeCalls++; return deps.remove([it.path]); });   // 정확히 1회. 응답 내용으로는 아무것도 정하지 않는다
    } catch {
      // 던짐도 「보내지 않았다」의 증거가 아니다
    }
    if (!sent) {
      // 외부 요청 미전송이 확정된 경우다. 남은 시간이 없으므로 더 부르지 않는다 — 예약은 deleting으로 남고 다음 회차의 「확인만」 묶음이 본다
      // (그 묶음은 다시 지우지 않으므로 객체가 남아 있으면 delete_unknown이 된다 — 미전송 건의 재시도 경로는 후속 복구 단위).
      c.removeNotSent++;
      return;
    }
    // remove가 대기 초과였으면(halted): 다시 지우지 않는다. 회차에 남은 시간이 있을 때만 확인을 한 번 하고(force), 없으면 bounded가 호출을 시작하지 않는다.
    await verify(it, token, true, halted);
  };

  // 세 묶음을 읽는다(읽기만). 한 묶음을 읽지 못해도 나머지는 진행한다.
  const rawC = await readList(() => deps.listVerifyPending(CLEANUP_MAX_ITEMS));
  const rawB = await readList(() => deps.listDeletePending(CLEANUP_MAX_ITEMS));
  const rawA = await readList(() => deps.listReady(CLEANUP_MAX_ITEMS));
  for (const raw of [rawC, rawB, rawA]) if (raw === null) c.listFailed++;

  const deletionItems = (raw: unknown[] | null, states: string[]): DeletionItem[] => {
    const out: DeletionItem[] = [];
    for (const row of raw ?? []) {
      const it = isRow(row) ? checkItem(row.asset_id, row.user_id, row.bucket, row.path) : null;
      const ok = it && isRow(row) && typeof row.state === "string" && states.includes(row.state)
        && isCanonicalUuid(row.fencing_token) && Number.isInteger(row.attempts) && (row.attempts as number) >= 0;
      if (!ok || !it || !isRow(row)) { c.invalidRows++; continue; }
      out.push({ ...it, state: row.state as string, token: row.fencing_token as string, attempts: row.attempts as number });
    }
    return out;
  };
  const listC = deletionItems(rawC, ["deleting", "delete_unknown"]);
  const listB = deletionItems(rawB, ["cancelled", "delete_failed", "claimed"]);
  const listA: Item[] = [];
  for (const row of rawA ?? []) {
    const it = isRow(row) && row.state === "ready" ? checkItem(row.id, row.user_id, row.bucket, row.path) : null;
    if (!it) { c.invalidRows++; continue; }
    listA.push(it);
  }

  const [takeC, takeB, takeA] = allot([listC.length, listB.length, listA.length], CLEANUP_MAX_ITEMS);
  let stoppedEarly = false;
  const outOfTime = () => {
    if (now() - started > timeBudgetMs) stoppedEarly = true;
    return stoppedEarly;
  };

  // C) 확인만 — 새 삭제 요청 0
  for (const it of listC.slice(0, takeC)) {
    if (halted || outOfTime()) break;
    c.examined++;
    await verify(it, it.token, false);
  }

  // B) 이어 하기 — 보호 변경을 먼저 다시 본다(보호 회원이면 DB 함수가 ready로 되돌린다)
  for (const it of listB.slice(0, takeB)) {
    if (halted || noMoreDeletes || outOfTime()) break;
    c.examined++;
    const first = await text("aif_asset_expire", { p_asset: it.assetId, p_user: it.userId });
    if (halted) break;
    if (first !== "expired") { tally(first); continue; }
    if (exempt.has(it.userId)) { c.protectedSkipped++; continue; }   // 목록과 DB 판정이 어긋남 → 삭제하지 않는다
    if (it.attempts >= CLEANUP_MAX_ATTEMPTS) { c.gaveUp++; continue; }
    await proceedDelete(it);
  }

  // A) 신규
  for (const it of listA.slice(0, takeA)) {
    if (halted || noMoreDeletes || outOfTime()) break;
    c.examined++;
    if (exempt.has(it.userId)) { c.protectedSkipped++; continue; }   // 조회 조건이 빠진 호출부 방어
    const first = await text("aif_asset_expire", { p_asset: it.assetId, p_user: it.userId });
    if (halted) break;
    if (first !== "expired") { tally(first); continue; }
    await proceedDelete(it);
  }

  // 삭제가 확인된 회원의 중앙 측정 갱신(중앙 정리와 같은 방식). 실패해도 상태를 바꾸지 않는다 — 측정이 늦을 뿐이다.
  //   대기 초과로 멈춘 회차에서는 남은 측정을 시작하지 않는다(중앙 측정이 늦을 뿐이고, 늦는 쪽이 용량을 더 많이 세는 보수 방향이다).
  for (const uid of touched) {
    try {
      const w = await bounded(() => deps.rpc("member_storage_measure", { uid }));
      if (!w.done || !isRow(w.value) || w.value.error) c.measureFailed++;
    } catch {
      c.measureFailed++;
    }
  }
  const stopCode: CleanupStopCode = halted ? "IO_TIMEOUT" : stoppedEarly || noMoreDeletes ? "TIME_BUDGET" : null;
  return { ok: true, aborted: false, stoppedEarly: stoppedEarly || halted || noMoreDeletes, stopCode, counts: c };
}

// ───────────────────────── 요청 처리(인증·모드) ─────────────────────────

/** `Authorization: Bearer <비밀값>` 한 가지만 받는다(주소의 ?secret= 은 받지 않는다 — 접근 기록에 남을 수 있다).
 *  비밀값이 없거나 CLEANUP_SECRET_MIN_LENGTH보다 짧으면 어떤 요청도 통과하지 못한다. 길이가 같을 때만 전 글자를 비교한다. */
export function bearerOk(secret: unknown, authorization: unknown): boolean {
  if (typeof secret !== "string" || secret.length < CLEANUP_SECRET_MIN_LENGTH || secret.trim() !== secret) return false;
  if (typeof authorization !== "string") return false;
  const expected = `Bearer ${secret}`;
  if (authorization.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= authorization.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export type CleanupHandlerDeps = {
  mode: AssetsMode;
  secret: string | undefined;
  authorization: string | null;
  /** shadow일 때만 불린다(off에서는 호출 0 → 관리자 클라이언트·DB·저장소 생성 0) */
  getDeps?: () => RetentionDeps;
};
export type CleanupResponse = { status: number; body: Record<string, unknown>; headers: Record<string, string> };

const NO_STORE = { "Cache-Control": "no-store" };

/** GET /api/aif/assets/cleanup 처리. 라우트는 이 결과를 그대로 JSON으로 돌려준다. */
export async function handleCleanupRequest(d: CleanupHandlerDeps): Promise<CleanupResponse> {
  if (!bearerOk(d.secret, d.authorization)) return { status: 401, body: { error: "unauthorized" }, headers: { ...NO_STORE } };
  // off: 인증만 확인하고 끝낸다. 자산용 DB·저장소 의존성을 만들지도 부르지도 않는다.
  if (d.mode !== "shadow") return { status: 200, body: { ok: true, skipped: true }, headers: { ...NO_STORE } };

  let deps: RetentionDeps;
  try {
    if (!d.getDeps) throw new Error("deps");
    deps = d.getDeps();
  } catch {
    return { status: 503, body: { ok: false, code: "CLEANUP_UNAVAILABLE" }, headers: { ...NO_STORE } };
  }
  let r: CleanupResult;
  try {
    r = await runRetentionCleanup(deps);
  } catch {
    return { status: 503, body: { ok: false, code: "CLEANUP_UNAVAILABLE" }, headers: { ...NO_STORE } };
  }
  if (r.aborted) return { status: 503, body: { ok: false, code: r.code, counts: r.counts }, headers: { ...NO_STORE } };
  return { status: 200, body: { ok: true, stoppedEarly: r.stoppedEarly, stopCode: r.stopCode, counts: r.counts }, headers: { ...NO_STORE } };
}
