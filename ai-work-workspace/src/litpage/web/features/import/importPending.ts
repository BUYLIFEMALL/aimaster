// 2026-11-19(WS-20261119-03 응답 바이트): importFiles 응답이 바이트 예산 때문에 싣지 못한 레코드(pending 포인터)를 따로 받는다.
// 가져오기 자체는 이미 저장이 끝났다 — 여기서 실패해도 저장은 그대로이고, 화면에 일부가 아직 안 올라왔을 뿐이다.
// 그래서 실패를 다시 시도하지 않고(포인터마다 한 번만), 「저장됨 + 화면 추가 로드 실패」로 구분해 알릴 수 있게 결과만 돌려준다.

export type ImportPointer = { table: string; id: string };
export interface ImportDeferred {
  pending?: ImportPointer[];
  /** 포인터 목록에도 싣지 못한 레코드 수(서버가 알려 준다) — 화면은 새로 고쳐야 본다 */
  pendingOmitted?: number;
}

/** 한 번에 하나씩 받는다: pending은 「커서 못 실은」 레코드라, 묶으면 그 응답이 다시 한도를 넘을 수 있다 */
export const PENDING_MAX_REQUESTS = 100;
/** 연달아 이만큼 실패하면 그만둔다(연결이 끊긴 상태에서 남은 것을 계속 부르지 않는다) */
export const PENDING_MAX_FAILS_IN_A_ROW = 3;

/**
 * pending 포인터를 `sync`로 받는다. 돌려주는 값은 「화면에 다 올라왔는가」.
 * 포인터마다 한 번만 부른다(실패한 것을 다시 부르지 않는다). false면 부르는 쪽이 「저장은 됐고 화면 일부는 새로 고침 뒤 보인다」고 안내한다.
 */
export async function loadImportPending(res: ImportDeferred, sync: (pointers: ImportPointer[]) => Promise<unknown>): Promise<boolean> {
  const list = (Array.isArray(res.pending) ? res.pending : []).filter((p) => p && typeof p.table === 'string' && typeof p.id === 'string');
  let complete = !res.pendingOmitted && list.length <= PENDING_MAX_REQUESTS;
  let failsInARow = 0;
  for (const p of list.slice(0, PENDING_MAX_REQUESTS)) {
    try {
      await sync([{ table: p.table, id: p.id }]);
      failsInARow = 0;
    } catch {
      complete = false;
      if (++failsInARow >= PENDING_MAX_FAILS_IN_A_ROW) break;
    }
  }
  return complete;
}
