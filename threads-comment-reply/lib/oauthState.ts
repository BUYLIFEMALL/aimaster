import "server-only";

const SEPARATOR = "::";

function isSafeReturnPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/** OAuth state 파라미터에 CSRF 검증용 userId와, 인증 후 되돌아갈 경로를 함께 실어 보낸다. */
export function buildOAuthState(userId: string, returnTo: string): string {
  return isSafeReturnPath(returnTo) ? `${userId}${SEPARATOR}${returnTo}` : userId;
}

/** 콜백에서 state를 다시 userId와 returnTo로 분리한다. */
export function parseOAuthState(state: string): { userId: string; returnTo: string | null } {
  const separatorIndex = state.indexOf(SEPARATOR);
  if (separatorIndex === -1) return { userId: state, returnTo: null };
  const userId = state.slice(0, separatorIndex);
  const returnTo = state.slice(separatorIndex + SEPARATOR.length);
  return { userId, returnTo: isSafeReturnPath(returnTo) ? returnTo : null };
}
