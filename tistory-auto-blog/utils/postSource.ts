// v1.87 (2026-10-22): 「글감 출처」 — 글감(tistory_candidates)에서 만든 글에 원본 주소·모은 날짜·만료일을 남긴다. 순수 함수(서버·화면·시험 공용).
// 블로그 에이전트의 검증된 출처 객체(naver-blog-agent src/lib/sourceBundle.ts)와 같은 규칙: http(s) 주소만, 본인 글감만, 모은 지 30일 안만.
// 티스토리로 보내는 본문에는 넣지 않는다(글 보기 화면에만 표시).
export const SOURCE_LIFETIME_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export type SourceKind = 'http' | 'rss' | 'perplexity' | 'shorts'
export interface PostSource {
  candidateId: string
  kind: SourceKind
  label: string
  url: string | null
  collectedAt: string
  expiresAt: string
}
export interface CandidateRow {
  id: string
  user_id: string
  source_type: string
  source_input: string
  created_at: string
}

const CANDIDATE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isCandidateId = (value: unknown): value is string => typeof value === 'string' && CANDIDATE_ID.test(value)

/** http(s) 공개 주소만(계정 정보가 든 주소·다른 형식은 버림) */
export function sourceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null
  try {
    const url = new URL(value.trim())
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

function kindOf(row: CandidateRow): SourceKind {
  if (/^https:\/\/(www\.)?youtube\.com\/shorts\//i.test(row.source_input)) return 'shorts'
  return row.source_type === 'rss' || row.source_type === 'perplexity' ? row.source_type : 'http'
}

/** 본인 글감이고 모은 지 30일 안이면 출처 정보를, 아니면 null(글은 출처 없이 그대로 만든다) */
export function buildPostSource(row: CandidateRow | null | undefined, userId: string, now: Date = new Date()): PostSource | null {
  if (!row || row.user_id !== userId || !isCandidateId(row.id)) return null
  const collected = new Date(row.created_at).getTime()
  if (!Number.isFinite(collected) || collected > now.getTime()) return null
  const expires = collected + SOURCE_LIFETIME_DAYS * DAY_MS
  if (expires <= now.getTime()) return null
  return {
    candidateId: row.id.toLowerCase(),
    kind: kindOf(row),
    label: String(row.source_input ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
    url: sourceUrl(row.source_input),
    collectedAt: new Date(collected).toISOString(),
    expiresAt: new Date(expires).toISOString(),
  }
}

/** 저장된 값을 화면에 쓸 수 있는 모양으로(모양이 틀리면 null) */
export function readPostSource(value: unknown): PostSource | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (!isCandidateId(v.candidateId) || typeof v.collectedAt !== 'string' || typeof v.expiresAt !== 'string') return null
  const kind = (['http', 'rss', 'perplexity', 'shorts'] as const).find((k) => k === v.kind) ?? 'http'
  return { candidateId: v.candidateId, kind, label: typeof v.label === 'string' ? v.label.slice(0, 300) : '', url: sourceUrl(v.url), collectedAt: v.collectedAt, expiresAt: v.expiresAt }
}

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = { http: '웹 주소', rss: 'RSS 피드', perplexity: 'Perplexity 검색', shorts: '유튜브 쇼츠' }

// 2026-10-23: 글감 출처를 본문 근거로 — 글감 제목·요약을 AI 지시문에 「참고 자료」로 넣는다. 자료에 없는 사실은 지어내지 않게 한다.
export interface SourceMaterial { title: string; summary: string; label: string }
export function sourceMaterialRule(material: SourceMaterial | null | undefined): string {
  if (!material) return ''
  const clip = (value: string, max: number) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  const title = clip(material.title, 200)
  const summary = clip(material.summary, 1200)
  if (!title && !summary) return ''
  return `- 참고 자료(회원이 모은 글감, 출처: ${clip(material.label, 300)}): 제목 「${title}」 / 요약 「${summary}」 — 이 자료에 있는 사실을 근거로 쓰고, 자료에 있는 인물·장소·연도·수치 같은 구체적 사실은 흐리거나 빼지 말고 본문에 그대로 살려 쓰세요. 자료에 없는 수치·날짜·고유명사·인용은 지어내지 마세요. 확인되지 않은 내용은 일반적인 설명으로만 쓰세요.`
}
