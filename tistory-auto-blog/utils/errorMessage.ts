// catch 블록의 오류(unknown)에서 message만 안전하게 꺼낸다. 없으면 빈 문자열이라 기존 `err?.message || '대체 문구'` 패턴을 그대로 쓸 수 있다.
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message : ''
  }
  return ''
}
