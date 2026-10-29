// DUP-4 (2026-10-29) 유튜브 업로드·인스타 릴스 게시 중복 방지 — 화면 버튼 잠금만으로는 두 탭·빠른 두 번 누름·시간 초과 뒤 다시 누름을 막지 못한다.
// 상태 값은 DB 열거형(unposted/posting/posted/failed)을 그대로 쓰고 새 값은 만들지 않는다:
//  - 결과가 불확실하면(업로드 요청을 보낸 뒤 연결 끊김·시간 초과·5xx, 서버가 중간에 끝남) `posting`으로 남긴다.
//  - `posting`이 STALE_MS보다 오래되면 화면은 「확인 필요」로 보이고, 회원이 확인 창을 거쳐야 다시 올릴 수 있다.
// 기준 패턴: youtube-auto-reply/lib/comments/post.ts 조건부 선점.

/** 업로드 함수 최대 300초 + 여유. 이 시간 안의 `posting`은 진짜 진행 중으로 본다. */
export const STALE_MS = 10 * 60 * 1000;

export type ClaimDecision = "go" | "busy" | "confirm";

/**
 * 올리기 전에 지금 상태로 판단한다.
 * - busy: 다른 화면에서 올리는 중(거절)
 * - confirm: 이미 올렸거나 결과 불확실 — 회원 확인이 있어야 진행
 * - go: 바로 진행
 */
export function claimDecision(
  status: string | null | undefined,
  updatedAt: string | null | undefined,
  now: number,
  confirmed: boolean,
): ClaimDecision {
  if (status === "posting") {
    const at = updatedAt ? Date.parse(updatedAt) : NaN;
    if (Number.isNaN(at) || now - at < STALE_MS) return "busy";
    return confirmed ? "go" : "confirm";
  }
  if (status === "posted") return confirmed ? "go" : "confirm";
  return "go";
}

/** 화면 표시용: 오래된 `posting`은 「확인 필요」. */
export function needsCheck(status: string | null | undefined, updatedAt: string | null | undefined, now: number): boolean {
  if (status !== "posting" || !updatedAt) return false;
  const at = Date.parse(updatedAt);
  return !Number.isNaN(at) && now - at >= STALE_MS;
}

/**
 * 실패가 「확실히 안 올라감」인지 판단한다. 요청을 보내기 전 단계 오류이거나 4xx 응답이면 확실한 실패,
 * 보낸 뒤의 연결 오류·시간 초과·5xx는 올라갔을 수도 있어 불확실로 본다.
 */
export function isUncertainFailure(sent: boolean, message: string): boolean {
  if (!sent) return false;
  const code = message.match(/\((\d{3})\)/)?.[1];
  if (code && code.startsWith("4")) return false;
  return true;
}
