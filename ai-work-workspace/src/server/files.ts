// 업로드·다운로드(원본 app.ts의 /api/upload, /files/:id/:name 이식). 내용은 DB files.content에 둔다.
import 'server-only';
import { isSpaceMember, roleAtLeast } from '#shared/permissions.ts';
import type { BlockRecord, SpaceRecord } from '#shared/records.ts';
import { toPlainText } from '#shared/richtext.ts';
import { getRecord, withRequestCache } from '@/litpage/server/db.ts';
import { cleanFileName, cleanMime, fileHeaders, fileRow, readFileContent, storeFile } from '@/litpage/server/content/files.ts';
import { blockRole } from '@/litpage/server/records.ts';
import { pageIdOf } from '@/litpage/server/search.ts';
import { audit } from '@/litpage/server/audit.ts';
import { hit } from '@/litpage/server/ratelimit.ts';
import { ensureMember, type Member } from './runtime';

/** Vercel 함수는 요청 본문을 4.5MB까지 받는다 — 여유를 두고 파일당 4MB */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function uploadFile(member: Member, query: URLSearchParams, buf: Buffer) {
  return withRequestCache(() => {
    ensureMember(member);
    const userId = member.id;
    if (!hit(`upload:user:${userId}`, 300, 10 * 60_000)) return { status: 429, body: { message: '업로드가 너무 많습니다. 잠시 후 다시 시도해 주세요.' } };
    if (buf.length > MAX_UPLOAD_BYTES) return { status: 413, body: { message: '파일은 4MB까지 올릴 수 있습니다.' } };
    const name = cleanFileName(query.get('name') ?? 'file');
    const mime = cleanMime(query.get('type'));
    // 워크스페이스에는 그 구성원이 올린 파일만 연결한다(원본과 같음)
    const sid = query.get('spaceId');
    const spaceId = sid && isSpaceMember(getRecord<SpaceRecord>('space', sid), userId) ? sid : null;
    const f = storeFile(name, buf, userId, spaceId, mime);
    const blockId = query.get('blockId');
    const target = blockId ? getRecord<BlockRecord>('block', blockId) : undefined;
    const page = target && roleAtLeast(blockRole(target.id, userId), 'read_and_write') ? getRecord<BlockRecord>('block', pageIdOf(target)) : undefined;
    const auditSpace = page?.space_id ?? spaceId;
    if (auditSpace) audit('file_uploaded', { spaceId: auditSpace, actorId: userId, targetId: page?.id ?? null, ip: '', data: { fileName: f.name, ...(page ? { pageName: toPlainText(page.properties?.title) } : {}) } });
    return { status: 200, body: { url: f.url, id: f.id, name: f.name, size: f.size, mime: f.mime } };
  });
}

export function downloadFile(viewerId: string, id: string, download: boolean): Response {
  return withRequestCache(() => {
    const row = fileRow(id);
    if (!row) return new Response('Not found', { status: 404 });
    // 내보내기 결과(private)는 내보낸 사람만
    if (row.private && row.user_id !== viewerId) return new Response('Not found', { status: 404 });
    // 이식판 강화: 원본은 주소만 알면 로그인한 누구나 받을 수 있었다. 회원 데이터 격리를 위해 올린 사람 또는
    // 그 워크스페이스 구성원만 받게 한다.
    const member = row.user_id === viewerId || (!!row.space_id && isSpaceMember(getRecord<SpaceRecord>('space', row.space_id), viewerId));
    if (!member) return new Response('Not found', { status: 404 });
    const content = readFileContent(row.id);
    if (!content) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(content), { headers: { ...fileHeaders(row, download), 'Content-Length': String(content.length) } });
  });
}
