export const REFERENCE_TTL_MS = 5 * 60 * 1000;
export type ReferenceNote = { title: string; url: string; expiresAt: number };
export function parseReferenceNote(raw: string, ownerId: string, now = Date.now()): ReferenceNote {
  if (!ownerId) throw Error('로그인 계정을 확인해주세요.');
  if (raw.length > 8192) throw Error('참고 메모가 너무 깁니다. 다시 복사해주세요.');
  let value: Record<string, unknown>;
  try { value = JSON.parse(raw); } catch { throw Error('YOUTUBE 트렌드 분석에서 복사한 참고 메모를 붙여넣어주세요.'); }
  if (!value || value.format !== 'aimaster-youtube-reference' || value.version !== 1) throw Error('지원하지 않는 참고 메모입니다.');
  if (value.ownerId !== ownerId) throw Error('현재 로그인한 본인 계정에서 복사한 메모만 사용할 수 있습니다.');
  const created = typeof value.createdAt === 'string' ? Date.parse(value.createdAt) : NaN;
  if (!Number.isFinite(created) || created > now + 15000 || created + REFERENCE_TTL_MS <= now) throw Error('참고 메모의 5분 기한이 지났거나 발급일이 올바르지 않습니다. 다시 복사해주세요.');
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 1000 || typeof value.url !== 'string' || value.url.length > 2048) throw Error('영상 제목이나 주소가 올바르지 않습니다.');
  let id: string | null = null;
  try {
    const url = new URL(value.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw Error();
    if (['youtube.com','www.youtube.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.startsWith('/shorts/') ? url.pathname.slice(8) : null;
    } else if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    if (!id || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw Error();
  } catch { throw Error('유튜브 영상 주소만 참고 메모로 사용할 수 있습니다.'); }
  return { title:value.title.trim(), url:'https://www.youtube.com/watch?v='+encodeURIComponent(id), expiresAt:created+REFERENCE_TTL_MS };
}
