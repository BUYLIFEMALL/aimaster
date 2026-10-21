import "server-only";

// Suno 콜백 신뢰 확인(2026-10-22, docs/DETAILED_REVIEW_20261019.md D-68-01).
// sunoapi.org 콜백에는 서명이 없어 작업 번호만 알면 누구나 가짜 결과를 보낼 수 있다. 그래서 웹훅은 콜백 본문을
// 「이 작업이 끝났다」는 신호로만 쓰고, 저장할 결과는 회원 본인 Suno 키로 record-info를 다시 조회해 받은 값만 쓴다.
// 콜백 직후에는 조회 결과가 아직 「진행 중」일 수 있어 몇 번 다시 묻는다(기본 4번, 5초 간격 — 최대 약 15초).
export async function waitForSettled<T>(
  check: () => Promise<T>,
  isPending: (result: T) => boolean,
  tries = 4,
  delayMs = 5000,
): Promise<T> {
  let result = await check();
  for (let i = 1; i < tries && isPending(result); i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await check();
  }
  return result;
}
