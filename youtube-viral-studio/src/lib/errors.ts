// v1.15: catch(err: any) 대신 쓰는 오류 값 꺼내기. 예전 동작(err.message가 없으면 undefined → 기본 문구)을 그대로 유지한다.

/** 오류 메시지(문자열이 아니면 undefined) */
export function errorMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string") return (err as { message: string }).message;
  return undefined;
}

/** 오류 코드(YouTubeApiError.code 등, 없으면 undefined) */
export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && typeof (err as { code?: unknown }).code === "string") return (err as { code: string }).code;
  return undefined;
}

/** HTTP 상태 번호(YouTubeApiError.status 등, 없으면 undefined) */
export function errorStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && typeof (err as { status?: unknown }).status === "number") return (err as { status: number }).status;
  return undefined;
}
