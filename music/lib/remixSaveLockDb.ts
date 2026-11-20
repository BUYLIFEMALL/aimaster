// 리믹스 저장 잠금(lib/remixSaveLock.ts)의 CasFn 실제 구현 — PostgREST 조건부 갱신으로 옮긴다(W1, 2026-11-20 Master msg_4c67f242e1aa).
// 미연결: 넘겨받은 클라이언트(Supabase 같은 모양)만 쓴다. 공용 lib/syncLock.ts·다른 표는 바꾸지 않는다.
// 판정 계약: 응답을 받고 오류가 없으면 바뀐 행 수(select("id") 길이), 응답을 받았고 오류 코드가 있으면 갱신이 일어나지 않은 것으로 0
// (PostgREST 단일 요청은 트랜잭션이라 오류면 적용 안 됨), 전송 결과 불확실(status 0·예외·응답 형태 이상)이면 예외 → 잠금 단계 「불확실」.
import type { CasFn, CasSet, CasWhere } from "./remixSaveLock";
import { LEGACY_LOCK, CasRejectedError } from "./remixSaveLock";

export const REMIX_TABLE = "music_track_remixes";

export interface PgResponse {
  data: unknown[] | null;
  error: { code?: string | null; message?: string | null } | null;
  status?: number;
}
export interface PgUpdateBuilder {
  eq(column: string, value: unknown): PgUpdateBuilder;
  or(filter: string): PgUpdateBuilder;
  select(columns: string): PromiseLike<PgResponse>;
}
export interface PgClientLike {
  from(table: string): { update(values: Record<string, unknown>): PgUpdateBuilder };
}

/**
 * 잡기 조건(isAcquirable과 같은 뜻)을 PostgREST or 필터로. like의 `_`는 한 글자 와일드카드라 `\_`로 escape(문자 그대로 비교).
 * 비었거나 / 우리 표시(`__`로 시작)가 아닌 다른 문구이거나 / 만료된 잡기 잠금(__rsync__:*) / 만료된 기존 잠금(__syncing__)
 */
export function acquirableFilter(staleBefore: string): string {
  return [
    "error_message.is.null",
    "and(error_message.not.like.\\_\\_*)",
    `and(error_message.like.\\_\\_rsync\\_\\_:*,updated_at.lt.${staleBefore})`,
    `and(error_message.eq.${LEGACY_LOCK},updated_at.lt.${staleBefore})`,
  ].join(",");
}

export class CasUncertainError extends Error {
  constructor(reason: string) {
    super(`잠금 갱신 결과를 확인하지 못했습니다(${reason}).`);
    this.name = "CasUncertainError";
  }
}

export function makeRemixCas(client: PgClientLike): CasFn {
  return async (set: CasSet, where: CasWhere) => {
    let q = client
      .from(REMIX_TABLE)
      .update({ ...set })
      .eq("id", where.id)
      .eq("task_id", where.taskId)
      .eq("extend_hop_count", where.hop)
      .eq("status", where.status);
    q = "eq" in where.errorMessage ? q.eq("error_message", where.errorMessage.eq) : q.or(acquirableFilter(where.errorMessage.acquirable.staleBefore));
    let res: PgResponse;
    try {
      res = await q.select("id");
    } catch {
      throw new CasUncertainError("전송 예외");
    }
    return classifyCasResponse(res);
  };
}

/**
 * 응답 → 바뀐 행 수 / 확정 거절(CasRejectedError) / 미확정(CasUncertainError). 성공은 상태·오류·데이터가 모두 맞을 때만.
 * - 성공: status 2xx + error 없음 + data 배열(길이 0 또는 1)
 * - 확정 거절: status 4xx + error.code 있음 + data 없음(null) — PostgREST 단일 요청은 오류면 적용되지 않음
 * - 그 밖(응답 형태 이상·status 없음/0·5xx·프록시 오류·코드 없는 오류·2xx인데 오류·4xx인데 data·여러 행)은 모두 미확정
 */
export function classifyCasResponse(res: PgResponse | null | undefined): number {
  if (!res || typeof res !== "object") throw new CasUncertainError("응답 형태 이상");
  const status = typeof res.status === "number" ? res.status : NaN;
  if (!(status >= 100 && status <= 599) || status === 0) throw new CasUncertainError("status 없음");
  if (status >= 500) throw new CasUncertainError(`서버·프록시 ${status}`);
  if (status >= 200 && status < 300) {
    if (res.error) throw new CasUncertainError("성공 상태인데 오류");
    if (!Array.isArray(res.data)) throw new CasUncertainError("성공 상태인데 data 없음");
    if (res.data.length > 1) throw new CasUncertainError("여러 행 변경"); // id 조건이 있어 불가능 — 생기면 정상 처리하지 않음
    return res.data.length;
  }
  if (status >= 400 && status < 500) {
    const code = res.error?.code;
    if (res.error && typeof code === "string" && code && res.data == null) throw new CasRejectedError(code);
    throw new CasUncertainError(`${status} 근거 부족`);
  }
  throw new CasUncertainError(`예상 밖 상태 ${status}`); // 1xx·3xx
}
