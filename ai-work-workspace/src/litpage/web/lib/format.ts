// 이식판: 날짜·시각 문구를 화면 언어(기본 ko-KR)에 맞춘다 — 원본은 'en-US' 고정.
import { getLocale } from '../features/shell/i18n.ts';

const ko = () => getLocale() === 'ko-KR';

export function relativeEdited(t: number | undefined): string {
  if (!t) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return ko() ? '방금 수정' : 'Edited just now';
  if (m < 60) return ko() ? `${m}분 전 수정` : `Edited ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ko() ? `${h}시간 전 수정` : `Edited ${h}h ago`;
  const d = new Date(t);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = d.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
  return ko() ? `${date} 수정` : `Edited ${date}`;
}

export function formatDateTime(t: number): string {
  const d = new Date(t);
  const now = new Date();
  const today = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString(getLocale(), { hour: 'numeric', minute: '2-digit' });
  if (today) return ko() ? `오늘 ${time}` : `Today at ${time}`;
  if (yesterday) return ko() ? `어제 ${time}` : `Yesterday at ${time}`;
  return `${d.toLocaleDateString(getLocale(), { month: 'long', day: 'numeric', year: 'numeric' })} ${time}`;
}

export function formatShortDate(t: number): string {
  return new Date(t).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(t: number): string {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return ko() ? '방금' : 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return ko() ? `${m}분 전` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ko() ? `${h}시간 전` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return ko() ? `${d}일 전` : `${d}d ago`;
  return formatShortDate(t);
}
