import { createHash } from 'node:crypto'

export type Publication = Record<string, unknown>
export const retentionCutoff = () => new Date(Date.now() - 30 * 86400000).toISOString()
export function publicationOf(value: unknown): Publication | null {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>).automation : null
  return item && typeof item === 'object' && (item as Publication).mode === 'auto' ? item as Publication : null
}
export function publicationFingerprint(row: { title?: unknown; content?: unknown; tistory_publish?: unknown }) {
  const settings = (row.tistory_publish || {}) as Record<string, unknown>
  return createHash('sha256').update(JSON.stringify([row.title, row.content,
    ['category', 'visibility', 'comment', 'topic', 'timing', 'reserveDate', 'reserveTime'].map(key => settings[key] ?? '')])).digest('hex')
}
export function tistoryPostUrl(value: unknown, blogName: string): string | null {
  try {
    const url = new URL(String(value))
    if (url.protocol !== 'https:' || url.hostname !== `${blogName}.tistory.com` || url.username || url.password || url.port) return null
    return /^\/(?:[1-9]\d*|entry\/[^/]+)\/?$/.test(url.pathname) ? `https://${url.hostname}${url.pathname.replace(/\/$/, '')}` : null
  } catch { return null }
}
