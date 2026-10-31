// 쿠팡 호출 수 규칙 — 계산만, 외부 호출 없음(tests/usage.test.mjs).
// 회원마다 본인 Fixie를 쓰므로 호출을 막지 않고 이번 달 내 호출 수만 보여 준다. 쿠팡 호출만 세며 달은 한국 달력 기준이라 Fixie 초기화 날짜와 다를 수 있다.

export const FIXIE_FREE_MONTHLY = 500;

const KST_MS = 9 * 3_600_000;

/** 한국 날짜 yyyy-MM-dd */
export const kstDay = (nowMs: number) => new Date(nowMs + KST_MS).toISOString().slice(0, 10);
export const kstMonth = (nowMs: number) => kstDay(nowMs).slice(0, 7);
export const kstMonthStartIso = (nowMs: number) => new Date(`${kstMonth(nowMs)}-01T00:00:00+09:00`).toISOString();
