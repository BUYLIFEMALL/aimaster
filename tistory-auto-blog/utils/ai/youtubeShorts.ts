import 'server-only'

// "유튜브 쇼츠 떡상 분석"의 쇼츠 검색(v1.66). `threads-content-ops/lib/youtubeShorts.ts`(= shorts-viral-studio의 검색·지표 계산)를 옮겼다.
// 회원 본인의 YouTube Data API 키만 쓴다(운영자·다른 회원 키로 폴백하지 않는다). 검색 1회 = 약 102유닛(search 100 + videos 1 + channels 1).
// 조회수·구독자는 YouTube가 알려 준 실측값만 쓰며 가짜 값은 만들지 않는다.

const BASE = 'https://www.googleapis.com/youtube/v3'

export type ShortsOrder = 'relevance' | 'viewCount' | 'date'
export type ShortsGrade = '초대박' | '대박' | '떡상' | '양호' | '보통' | '판정불가'

export type ShortVideo = {
  id: string
  title: string
  channelName: string
  thumbnail: string
  publishedAt: string
  durationSec: number
  views: number
  likes: number
  comments: number
  subs: number | null
  vsRatio: number | null
  viewsPerDay: number
  outlier: number
  engRate: number
  viralScore: number
  grade: ShortsGrade
}

export class YouTubeSearchError extends Error {
  readonly invalidKey: boolean
  constructor(message: string, invalidKey = false) {
    super(message)
    this.invalidKey = invalidKey
  }
}

async function ytFetch<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const url = new URL(`${BASE}/${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  url.searchParams.set('key', apiKey)
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  if (response.ok) return (await response.json()) as T

  const body = (await response.json().catch(() => ({}))) as { error?: { message?: string; errors?: { reason?: string }[] } }
  const reason = body.error?.errors?.[0]?.reason ?? ''
  const message = body.error?.message ?? ''
  if (['quotaExceeded', 'rateLimitExceeded', 'dailyLimitExceeded'].includes(reason)) {
    throw new YouTubeSearchError('YouTube API 일일 할당량을 모두 사용했습니다. 검색은 1회에 약 100유닛(하루 기본 1만유닛)을 쓰므로 내일 다시 시도해 주세요.')
  }
  if (reason === 'accessNotConfigured' || reason === 'forbidden') {
    throw new YouTubeSearchError("이 키에서 YouTube Data API v3가 활성화되어 있지 않습니다. 구글 클라우드 콘솔에서 'YouTube Data API v3'를 사용 설정해 주세요.", true)
  }
  if ((response.status === 400 || response.status === 403) && (reason === 'keyInvalid' || reason === 'API_KEY_INVALID' || message.toLowerCase().includes('api key'))) {
    throw new YouTubeSearchError('YouTube API 키가 올바르지 않습니다. API키등록·플랫폼연동에서 키를 다시 확인해 주세요.', true)
  }
  throw new YouTubeSearchError(`YouTube 검색에 실패했습니다. (${response.status})`)
}

export function parseDuration(value: string | undefined): number {
  const match = value?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0)
}

export function gradeOf(vsRatio: number | null): ShortsGrade {
  if (vsRatio === null) return '판정불가'
  if (vsRatio >= 10) return '초대박'
  if (vsRatio >= 5) return '대박'
  if (vsRatio >= 3) return '떡상'
  if (vsRatio >= 1) return '양호'
  return '보통'
}

type RawVideo = {
  id: string
  snippet: { title: string; channelId: string; channelTitle: string; publishedAt: string; thumbnails?: { medium?: { url: string }; default?: { url: string } } }
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
  contentDetails?: { duration?: string }
}
type RawChannel = { id: string; statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string; hiddenSubscriberCount?: boolean } }

export function buildShortVideo(video: RawVideo, channel: RawChannel | undefined, now: Date): ShortVideo {
  const stats = video.statistics ?? {}
  const channelStats = channel?.statistics
  const views = Number(stats.viewCount || 0)
  const likes = Number(stats.likeCount || 0)
  const comments = Number(stats.commentCount || 0)

  const subsHidden = !channelStats || channelStats.hiddenSubscriberCount === true
  const subsNumber = Number(channelStats?.subscriberCount || 0)
  const subs = subsHidden || subsNumber <= 0 ? null : subsNumber
  const vsRatio = subs ? views / subs : null

  const channelAverage = Number(channelStats?.viewCount || 0) / Math.max(Number(channelStats?.videoCount || 1), 1)
  const outlier = channelAverage > 0 ? views / channelAverage : 1
  const hours = Math.max((now.getTime() - new Date(video.snippet.publishedAt).getTime()) / 3_600_000, 1)
  const viewsPerDay = (views / hours) * 24
  const engRate = views > 0 ? ((likes + comments) / views) * 100 : 0

  const viralScore = Math.round(
    Math.min(outlier / 10, 1) * 100 * 0.3
    + Math.min((vsRatio ?? 0) / 5, 1) * 100 * 0.25
    + Math.min(viewsPerDay / 100_000, 1) * 100 * 0.2
    + Math.min(engRate / 10, 1) * 100 * 0.15
    + Math.max(100 - (hours / 24) * 2, 0) * 0.1,
  )

  return {
    id: video.id,
    title: video.snippet.title,
    channelName: video.snippet.channelTitle,
    thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
    publishedAt: video.snippet.publishedAt,
    durationSec: parseDuration(video.contentDetails?.duration),
    views, likes, comments, subs, vsRatio, viewsPerDay, outlier, engRate, viralScore,
    grade: gradeOf(vsRatio),
  }
}

/** 검색 → 영상 상세 → 채널 상세 순으로 조회해 조회수·구독자 실측값으로 떡상 지표를 계산한다. */
export async function searchYoutubeShorts(
  input: { query: string; dateFrom?: string; dateTo?: string; order: ShortsOrder },
  apiKey: string,
): Promise<ShortVideo[]> {
  const query: Record<string, string> = {
    part: 'snippet', type: 'video', q: input.query, maxResults: '50', order: input.order,
    videoDuration: 'short', regionCode: 'KR', relevanceLanguage: 'ko',
  }
  if (input.dateFrom) query.publishedAfter = new Date(`${input.dateFrom}T00:00:00Z`).toISOString()
  if (input.dateTo) query.publishedBefore = new Date(`${input.dateTo}T23:59:59Z`).toISOString()

  const search = await ytFetch<{ items?: { id?: { videoId?: string } }[] }>('search', query, apiKey)
  const ids = (search.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id))
  if (!ids.length) return []

  const videos = await ytFetch<{ items?: RawVideo[] }>('videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') }, apiKey)
  const items = videos.items ?? []
  const channelIds = [...new Set(items.map((video) => video.snippet.channelId))]
  const channels = channelIds.length
    ? await ytFetch<{ items?: RawChannel[] }>('channels', { part: 'statistics', id: channelIds.join(',') }, apiKey)
    : { items: [] as RawChannel[] }
  const channelMap = new Map((channels.items ?? []).map((channel) => [channel.id, channel]))
  const now = new Date()
  return items.map((video) => buildShortVideo(video, channelMap.get(video.snippet.channelId), now))
}

/** 영상 설명과 상위 댓글(분석 근거용 보조 자료). 실패하거나 막혀 있으면 빈 값으로 둔다. */
export async function fetchShortContext(id: string, apiKey: string): Promise<{ description: string; comments: string[] }> {
  const [description, comments] = await Promise.all([
    ytFetch<{ items?: { snippet?: { description?: string } }[] }>('videos', { part: 'snippet', id }, apiKey)
      .then((data) => data.items?.[0]?.snippet?.description ?? '').catch(() => ''),
    ytFetch<{ items?: { snippet: { topLevelComment: { snippet: { textOriginal: string } } } }[] }>(
      'commentThreads', { part: 'snippet', videoId: id, maxResults: '15', order: 'relevance', textFormat: 'plainText' }, apiKey,
    ).then((data) => (data.items ?? []).map((item) => item.snippet.topLevelComment.snippet.textOriginal).filter(Boolean)).catch(() => [] as string[]),
  ])
  return { description, comments }
}
