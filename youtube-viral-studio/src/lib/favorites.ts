import type { YouTubeVideoItem, YouTubeChannelItem } from './youtube/types';

export const FAVORITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** v1.16: 보관함 한 번에 불러오는 최대 개수(api/favorites와 화면 안내가 같은 값을 쓴다) */
export const FAVORITES_LOAD_LIMIT = 1000;
export type FavoriteKind = 'video' | 'channel';
export type FavoriteRecord = { item_type: FavoriteKind; item_id: string; payload: YouTubeVideoItem | YouTubeChannelItem; created_at: string };
export function validKind(value: unknown): value is FavoriteKind { return value === 'video' || value === 'channel'; }
export function validId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value); }
export function isFreshFavorite(row: Pick<FavoriteRecord, 'created_at'>, now = Date.now()) {
  const created = Date.parse(row.created_at);
  return Number.isFinite(created) && created <= now && created > now - FAVORITE_TTL_MS;
}
const text = (value: unknown, max = 1000) => typeof value === 'string' ? value.slice(0, max) : '';
const number = (value: unknown, max = Number.MAX_SAFE_INTEGER) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
function image(value: unknown) {
  try { const u = new URL(text(value, 2000)); return u.protocol === 'https:' && ['i.ytimg.com','yt3.ggpht.com','yt3.googleusercontent.com'].includes(u.hostname) ? u.href : ''; } catch { return ''; }
}
export function sanitizeFavorite(kind: FavoriteKind, value: unknown): YouTubeVideoItem | YouTubeChannelItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('보관할 자료가 올바르지 않습니다.');
  const item = value as Record<string, unknown>;
  if (!validId(item.id) || !text(item.title).trim()) throw Error('영상·채널 ID와 제목이 필요합니다.');
  const publishedAt = text(item.publishedAt, 40);
  if (!Number.isFinite(Date.parse(publishedAt))) throw Error('게시일이 올바르지 않습니다.');
  const base = { id: item.id, title: text(item.title), description: text(item.description, 10000), thumbnailUrl: image(item.thumbnailUrl), publishedAt };
  if (kind === 'channel') return { ...base, customUrl: text(item.customUrl,128).replace(/[^\w@.-]/g,''), subscriberCount: number(item.subscriberCount), videoCount: number(item.videoCount), viewCount: number(item.viewCount), averageViews: typeof item.averageViews === 'number' ? number(item.averageViews) : undefined, viralIndex: typeof item.viralIndex === 'number' ? number(item.viralIndex,100) : undefined };
  if (!validId(item.channelId)) throw Error('채널 ID가 올바르지 않습니다.');
  const badges = ['SUPER_VIRAL','VIRAL','RISING','NORMAL'];
  return { ...base, channelId: item.channelId, channelTitle: text(item.channelTitle), channelThumbnailUrl: image(item.channelThumbnailUrl), channelSubscriberCount: number(item.channelSubscriberCount), viewCount: number(item.viewCount), likeCount: number(item.likeCount), commentCount: number(item.commentCount), duration: text(item.duration, 40), durationSeconds: number(item.durationSeconds), isShort: item.isShort === true, vph: number(item.vph), vsRatio: number(item.vsRatio), viralScore: number(item.viralScore,100), viralBadge: (badges.includes(String(item.viralBadge)) ? item.viralBadge : 'NORMAL') as YouTubeVideoItem['viralBadge'] };
}

// Quote every CSV field, neutralize spreadsheet formulas, and escape embedded quotes.
export function csvCell(value: unknown) {
  let cell = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(cell) || /^[\t\r\n]/.test(cell)) cell = "'" + cell;
  return '"' + cell.replace(/"/g, '""') + '"';
}
