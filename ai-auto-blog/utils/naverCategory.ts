// 네이버 블로그 카테고리 선택값(v1.57). 확장이 회원의 실제 네이버 발행 설정창에서 읽은 번호(id)와 이름(name)이다.
// 형식은 네이버 블로그 에이전트(`naver-blog-agent/src/lib/naverPublishing.ts`)와 같다.
export interface NaverCategory { id: string; name: string }

/** 잘못된 값이면 던지고, null이면 "지정 안 함"으로 본다. */
export function parseNaverCategory(value: unknown): NaverCategory | null {
  if (value === null) return null
  if (!value || typeof value !== 'object') throw new Error('네이버 카테고리 형식이 올바르지 않습니다.')
  const item = value as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id.trim() : ''
  const name = typeof item.name === 'string' ? item.name.normalize('NFC').trim() : ''
  if (!/^\d{1,12}$/.test(id) || !name || name.length > 120) throw new Error('실제 네이버 카테고리 목록에서 선택해 주세요.')
  return { id, name }
}

/** DB에 저장된 값을 안전하게 읽는다(깨진 값은 지정 안 함). */
export function readNaverCategory(value: unknown): NaverCategory | null {
  try { return parseNaverCategory(value ?? null) } catch { return null }
}
