// 강의 일정 한 번 가져오기의 미리보기 표식 시험 — 2026-11-20 WS-20261118-02(플랜 §5-1).
// HMAC-SHA256 서명·용도 구분·정규화·만료·요청 묶음을 확인한다. 키는 이 파일 안에서 만든 시험 전용 값만 쓴다
// (환경변수·실제 키를 읽지 않는다). DB·서버·네트워크를 쓰지 않는다. 이 모듈은 아직 어디에서도 부르지 않는다.
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  intentHash, issuePreviewToken, PREVIEW_KEY_MIN_BYTES, PREVIEW_TOKEN_PURPOSE, PREVIEW_TOKEN_TTL_MS, sha256Hex, structureHash, verifyPreviewToken,
  type PreviewIntent, type PreviewStructure,
} from '../../src/litpage/server/content/lectureImport/previewToken.ts';

// 시험 전용 키: 정해진 바이트로 채운 값(비밀이 아니다)
const KEY = new Uint8Array(32).fill(7);
const OTHER_KEY = new Uint8Array(32).fill(8);
const NOW = 1_800_000_000_000;

const intent = (over: Partial<PreviewIntent> = {}): PreviewIntent => ({
  userId: 'user-1', spaceId: 'space-1', target: { kind: 'table', blockId: 'block-1' }, fileId: 'file-1', fileSha256: sha256Hex('제목,날짜\nA,2026-11-20\n'),
  mapping: { title: '제목', date: '날짜' }, timeZone: 'Asia/Seoul', wallClock: false, ...over,
});
const structure = (over: Partial<PreviewStructure> = {}): PreviewStructure => ({
  columns: [{ id: 'title', name: '제목', type: 'title' }, { id: 'dDat', name: '날짜', type: 'date' }, { id: 'dDon', name: '완료', type: 'checkbox' }],
  viewIds: ['view-1', 'view-2'], ...over,
});
const issue = (i = intent(), s = structure(), now = NOW, key: Uint8Array = KEY) => {
  const r = issuePreviewToken(key, i, s, now);
  if (!r.ok) throw new Error(`발급 실패: ${r.code}`);
  return r;
};

describe('미리보기 표식(§5-1): 발급과 확인', () => {
  it('같은 키·같은 요청·같은 구조·유효 시간 안이면 통과한다. 모양과 유효 시간', () => {
    const t = issue();
    expect(PREVIEW_TOKEN_TTL_MS).toBe(30 * 60_000);
    expect(PREVIEW_KEY_MIN_BYTES).toBe(32);
    expect(t.issuedAt).toBe(NOW);
    expect(t.expiresAt).toBe(NOW + PREVIEW_TOKEN_TTL_MS);
    expect(t.token).toMatch(/^v1\.\d+\.\d+\.[0-9a-f]{64}\.[0-9a-f]{64}\.[A-Za-z0-9_-]{43}$/);
    expect(t.token.length).toBeLessThanOrEqual(256);
    expect(verifyPreviewToken(KEY, t.token, intent(), structure(), NOW)).toEqual({ ok: true, issuedAt: NOW, expiresAt: NOW + PREVIEW_TOKEN_TTL_MS });
    // 결정적: 같은 입력이면 같은 표식(난수·현재 시각을 쓰지 않는다)
    expect(issue().token).toBe(t.token);
    // Buffer 키도 같은 결과
    expect(issuePreviewToken(Buffer.from(KEY), intent(), structure(), NOW)).toEqual({ ok: true, ...t });
  });

  it('표식에는 지문과 서명만 들어간다 — 회원·공간·파일 id, 열 이름, 시간대, 키가 그대로 실리지 않는다', () => {
    const t = issue(intent({ userId: 'SECRET-user', spaceId: 'SECRET-space', fileId: 'SECRET-file', mapping: { title: 'SECRET-제목열', date: 'SECRET-날짜열' }, target: { kind: 'table', blockId: 'SECRET-block' } }),
      structure({ columns: [{ id: 'SECRET-col', name: 'SECRET-이름', type: 'title' }], viewIds: ['SECRET-view'] }));
    expect(t.token).not.toMatch(/SECRET|Asia|Seoul/);
    expect(t.token).not.toContain(Buffer.from(KEY).toString('base64url'));
    expect(t.token).not.toContain(Buffer.from(KEY).toString('hex'));
    expect(t.token.split('.').length).toBe(6);
  });

  it('유효 시간 경계: 만료 직전까지 통과, 만료 시각부터 실패. 발급 시각이 미래면 실패', () => {
    const t = issue();
    const v = (now: number) => verifyPreviewToken(KEY, t.token, intent(), structure(), now);
    expect(v(NOW).ok).toBe(true);
    expect(v(NOW + PREVIEW_TOKEN_TTL_MS - 1).ok).toBe(true);
    expect(v(NOW + PREVIEW_TOKEN_TTL_MS)).toEqual({ ok: false, code: 'expired' });
    expect(v(NOW + PREVIEW_TOKEN_TTL_MS + 1)).toEqual({ ok: false, code: 'expired' });
    expect(v(NOW + 86_400_000)).toEqual({ ok: false, code: 'expired' });
    expect(v(NOW - 1)).toEqual({ ok: false, code: 'not_yet_valid' });
    for (const now of [0, -1, 1.5, NaN, Infinity, '1800000000000', null, undefined] as unknown as number[]) expect(v(now), String(now)).toEqual({ ok: false, code: 'input_invalid' });
    for (const now of [0, -5, 1.5, NaN] as number[]) expect(issuePreviewToken(KEY, intent(), structure(), now), String(now)).toEqual({ ok: false, code: 'input_invalid' });
  });

  it('키가 없거나 짧으면 내주지도 받아 주지도 않는다(fail closed) — 다른 키로 만든 표식은 서명 불일치', () => {
    const t = issue();
    const bad = [undefined, null, '', 'x'.repeat(64), new Uint8Array(0), new Uint8Array(31).fill(1), [1, 2, 3], {}, 0] as unknown as Uint8Array[];
    for (const key of bad) {
      expect(issuePreviewToken(key, intent(), structure(), NOW)).toEqual({ ok: false, code: 'key_missing' });
      expect(verifyPreviewToken(key, t.token, intent(), structure(), NOW)).toEqual({ ok: false, code: 'key_missing' });
    }
    // 키 없음은 다른 어떤 오류보다 먼저다(모양이 틀린 표식·틀린 입력이어도)
    expect(verifyPreviewToken(new Uint8Array(0), 'garbage', {} as any, {} as any, NaN)).toEqual({ ok: false, code: 'key_missing' });
    // 32바이트는 통과, 31바이트는 실패
    expect(issuePreviewToken(new Uint8Array(32).fill(1), intent(), structure(), NOW).ok).toBe(true);
    expect(verifyPreviewToken(OTHER_KEY, t.token, intent(), structure(), NOW)).toEqual({ ok: false, code: 'bad_signature' });
    expect(verifyPreviewToken(KEY, issue(intent(), structure(), NOW, OTHER_KEY).token, intent(), structure(), NOW)).toEqual({ ok: false, code: 'bad_signature' });
  });

  it('변조: 표식의 어느 칸을 바꿔도 통과하지 못한다(서명이 맞기 전에는 표식의 값을 믿지 않는다)', () => {
    const t = issue();
    const parts = t.token.split('.');
    const withPart = (i: number, v: string) => parts.map((p, j) => (j === i ? v : p)).join('.');
    const v = (token: string, i = intent(), s = structure(), now = NOW) => verifyPreviewToken(KEY, token, i, s, now);
    // 만료를 늘려 적음(유효 시간 연장 시도), 발급을 당겨 적음
    expect(v(withPart(2, String(NOW + PREVIEW_TOKEN_TTL_MS * 100)), intent(), structure(), NOW + PREVIEW_TOKEN_TTL_MS * 2)).toEqual({ ok: false, code: 'bad_signature' });
    expect(v(withPart(1, String(NOW - 1000)))).toEqual({ ok: false, code: 'bad_signature' });
    // 의도 지문·구조 지문을 다른 요청의 것으로 바꿔 끼움
    const otherIntent = intentHash(intent({ userId: 'user-2' }))!;
    const otherStruct = structureHash(structure({ viewIds: ['view-9'] }))!;
    expect(v(withPart(3, otherIntent), intent({ userId: 'user-2' }))).toEqual({ ok: false, code: 'bad_signature' });
    expect(v(withPart(4, otherStruct), intent(), structure({ viewIds: ['view-9'] }))).toEqual({ ok: false, code: 'bad_signature' });
    // 서명의 한 글자
    const sig = parts[5];
    for (const i of [0, 20, 41]) {
      const flipped = sig.slice(0, i) + (sig[i] === 'A' ? 'B' : 'A') + sig.slice(i + 1);
      expect(v(withPart(5, flipped)), `sig[${i}]`).toEqual({ ok: false, code: 'bad_signature' });
    }
    // 마지막 글자의 남는 2비트만 다른 표기: 같은 바이트로 읽히더라도 정규 표기가 아니므로 받지 않는다
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const last = alphabet.indexOf(sig[42]);
    const sameBytes = alphabet[last ^ 1];
    expect(Buffer.from(sig.slice(0, 42) + sameBytes, 'base64url').equals(Buffer.from(sig, 'base64url'))).toBe(true);
    expect(v(withPart(5, sig.slice(0, 42) + sameBytes))).toEqual({ ok: false, code: 'malformed' });
    // 다른 표식의 서명을 가져다 붙임
    const t2 = issue(intent({ fileId: 'file-2' }));
    expect(v(withPart(5, t2.token.split('.')[5]))).toEqual({ ok: false, code: 'bad_signature' });
    expect(v(t.token).ok).toBe(true); // 원본은 여전히 통과
  });

  it('모양이 틀린 표식은 서명을 계산하기 전에 걸러진다', () => {
    const t = issue().token;
    const p = t.split('.');
    const bad = [
      '', 'v1', 'garbage', t + 'x', ' ' + t, t + '\n', t.replace('v1.', 'v2.'), t.replace('v1.', 'V1.'), p.slice(0, 5).join('.'), [...p, 'extra'].join('.'),
      [p[0], '0' + p[1], ...p.slice(2)].join('.'), [p[0], '-1', ...p.slice(2)].join('.'), [p[0], p[1], '1e3', ...p.slice(3)].join('.'),
      [...p.slice(0, 3), p[3].toUpperCase(), ...p.slice(4)].join('.'), [...p.slice(0, 3), p[3].slice(1), ...p.slice(4)].join('.'),
      [...p.slice(0, 5), p[5] + '='].join('.'), [...p.slice(0, 5), p[5].slice(1)].join('.'), [...p.slice(0, 5), p[5].slice(0, 42) + '+'].join('.'),
      'x'.repeat(300),
    ];
    for (const token of bad) expect(verifyPreviewToken(KEY, token, intent(), structure(), NOW), JSON.stringify(token).slice(0, 40)).toEqual({ ok: false, code: 'malformed' });
    for (const token of [undefined, null, 123, {}, [t]] as unknown as string[]) expect(verifyPreviewToken(KEY, token, intent(), structure(), NOW)).toEqual({ ok: false, code: 'malformed' });
    // 유효 시간이 정해진 길이와 다르게 서명된 표식(같은 키를 가진 쪽이 만들었더라도)은 받지 않는다
    const ih = intentHash(intent())!;
    const sh = structureHash(structure())!;
    const forge = (iat: number, exp: number) => `v1.${iat}.${exp}.${ih}.${sh}.${createHmac('sha256', KEY).update([PREVIEW_TOKEN_PURPOSE, 'v1', iat, exp, ih, sh].join('\n')).digest('base64url')}`;
    expect(verifyPreviewToken(KEY, forge(NOW, NOW + PREVIEW_TOKEN_TTL_MS), intent(), structure(), NOW).ok).toBe(true); // 손으로 만든 정상 표식 = 발급 결과
    expect(forge(NOW, NOW + PREVIEW_TOKEN_TTL_MS)).toBe(issue().token);
    expect(verifyPreviewToken(KEY, forge(NOW, NOW + PREVIEW_TOKEN_TTL_MS * 48), intent(), structure(), NOW)).toEqual({ ok: false, code: 'malformed' });
    expect(verifyPreviewToken(KEY, forge(NOW, NOW + 1), intent(), structure(), NOW)).toEqual({ ok: false, code: 'malformed' });
  });

  it('용도 구분: 같은 키라도 다른 용도 문자열·다른 칸 순서로 서명한 값은 통과하지 못한다', () => {
    const ih = intentHash(intent())!;
    const sh = structureHash(structure())!;
    const exp = NOW + PREVIEW_TOKEN_TTL_MS;
    const mac = (input: string) => createHmac('sha256', KEY).update(input).digest('base64url');
    const tok = (sig: string) => `v1.${NOW}.${exp}.${ih}.${sh}.${sig}`;
    expect(PREVIEW_TOKEN_PURPOSE).toBe('aww:lecture-import:preview:v1');
    const others = [
      ['aww:other-purpose:v1', 'v1', NOW, exp, ih, sh].join('\n'), // 다른 용도
      ['v1', NOW, exp, ih, sh].join('\n'), // 용도 없이
      [PREVIEW_TOKEN_PURPOSE, 'v1', NOW, exp, sh, ih].join('\n'), // 두 지문의 자리를 바꿈
      [PREVIEW_TOKEN_PURPOSE, 'v1', exp, NOW, ih, sh].join('\n'),
      [PREVIEW_TOKEN_PURPOSE, 'v1', NOW, exp, ih, sh].join('|'), // 다른 구분자
      [PREVIEW_TOKEN_PURPOSE, 'v2', NOW, exp, ih, sh].join('\n'),
    ];
    for (const input of others) expect(verifyPreviewToken(KEY, tok(mac(input)), intent(), structure(), NOW), input.slice(0, 30)).toEqual({ ok: false, code: 'bad_signature' });
    expect(verifyPreviewToken(KEY, tok(mac([PREVIEW_TOKEN_PURPOSE, 'v1', NOW, exp, ih, sh].join('\n'))), intent(), structure(), NOW).ok).toBe(true);
  });
});

describe('미리보기 표식(§5-1): 요청 묶음', () => {
  it('요청 의도가 하나라도 다르면 intent_mismatch — 서명은 맞으므로 「다른 요청」으로 구별된다', () => {
    const t = issue().token;
    const changed: [string, Partial<PreviewIntent>][] = [
      ['다른 회원', { userId: 'user-2' }],
      ['다른 공간', { spaceId: 'space-2' }],
      ['다른 표', { target: { kind: 'table', blockId: 'block-2' } }],
      ['새 표로 바뀜', { target: { kind: 'new' } }],
      ['다른 파일 id', { fileId: 'file-2' }],
      ['파일 내용이 바뀜', { fileSha256: sha256Hex('제목,날짜\nA,2026-11-21\n') }],
      ['제목 열', { mapping: { title: '이름', date: '날짜' } }],
      ['날짜 열', { mapping: { title: '제목', date: '일시' } }],
      ['두 열을 맞바꿈', { mapping: { title: '날짜', date: '제목' } }],
      ['시간대', { timeZone: 'UTC' }],
      ['명시 벽시계 선택', { wallClock: true }],
    ];
    for (const [label, over] of changed) expect(verifyPreviewToken(KEY, t, intent(over), structure(), NOW), label).toEqual({ ok: false, code: 'intent_mismatch' });
    // 새 표로 발급한 표식은 그사이 표가 생겨 대상이 표로 잡히면 통과하지 못한다(뒤늦게 합쳐 쓰지 않는다)
    const empty: PreviewStructure = { columns: [], viewIds: [] };
    const tNew = issue(intent({ target: { kind: 'new' } }), empty).token;
    expect(verifyPreviewToken(KEY, tNew, intent({ target: { kind: 'new' } }), empty, NOW).ok).toBe(true);
    expect(verifyPreviewToken(KEY, tNew, intent({ target: { kind: 'table', blockId: 'block-1' } }), structure(), NOW)).toEqual({ ok: false, code: 'intent_mismatch' });
    // 의도와 구조가 둘 다 다르면 의도가 먼저 보고된다
    expect(verifyPreviewToken(KEY, t, intent({ userId: 'user-2' }), structure({ viewIds: [] }), NOW)).toEqual({ ok: false, code: 'intent_mismatch' });
    // 만료가 의도·구조보다 먼저다
    expect(verifyPreviewToken(KEY, t, intent({ userId: 'user-2' }), structure(), NOW + PREVIEW_TOKEN_TTL_MS)).toEqual({ ok: false, code: 'expired' });
  });

  it('표의 열·보기가 바뀌면 structure_changed — 읽어 온 순서만 다른 것은 같은 구조다', () => {
    const t = issue().token;
    const base = structure();
    const changed: [string, PreviewStructure][] = [
      ['열 추가', { ...base, columns: [...base.columns, { id: 'dNew', name: '분류', type: 'select' }] }],
      ['열 삭제', { ...base, columns: base.columns.slice(0, 2) }],
      ['열 이름 변경', { ...base, columns: base.columns.map((c) => (c.id === 'dDat' ? { ...c, name: '일시' } : c)) }],
      ['열 형식 변경', { ...base, columns: base.columns.map((c) => (c.id === 'dDon' ? { ...c, type: 'select' } : c)) }],
      ['열 id 변경', { ...base, columns: base.columns.map((c) => (c.id === 'dDon' ? { ...c, id: 'dDo2' } : c)) }],
      ['이름 끝 공백', { ...base, columns: base.columns.map((c) => (c.id === 'dDat' ? { ...c, name: '날짜 ' } : c)) }],
      ['보기 추가', { ...base, viewIds: [...base.viewIds, 'view-3'] }],
      ['보기 삭제', { ...base, viewIds: ['view-1'] }],
      ['보기 교체', { ...base, viewIds: ['view-1', 'view-9'] }],
      ['열·보기 모두 없음', { columns: [], viewIds: [] }],
    ];
    for (const [label, s] of changed) expect(verifyPreviewToken(KEY, t, intent(), s, NOW), label).toEqual({ ok: false, code: 'structure_changed' });
    // 순서만 다름: 같은 지문
    const shuffled: PreviewStructure = { columns: [...base.columns].reverse(), viewIds: [...base.viewIds].reverse() };
    expect(structureHash(shuffled)).toBe(structureHash(base));
    expect(verifyPreviewToken(KEY, t, intent(), shuffled, NOW).ok).toBe(true);
    // 판정에 쓰지 않는 칸(선택지·너비 같은 것)이 붙어 있어도 같은 구조다
    const extra = { columns: base.columns.map((c) => ({ ...c, options: ['a', 'b'], width: 120 })), viewIds: base.viewIds, name: '표 이름' } as PreviewStructure;
    expect(structureHash(extra)).toBe(structureHash(base));
    // 입력을 바꾸지 않는다(정렬은 사본에서)
    expect(shuffled.columns.map((c) => c.id)).toEqual(['dDon', 'dDat', 'title']);
  });

  it('정규화: 칸의 경계가 섞이지 않는다 — 구분자·따옴표·줄바꿈이 든 값도 서로 다른 지문이다', () => {
    const pairs: [Partial<PreviewIntent>, Partial<PreviewIntent>][] = [
      [{ mapping: { title: 'a,b', date: 'c' } }, { mapping: { title: 'a', date: 'b,c' } }],
      [{ mapping: { title: 'a","b', date: 'c' } }, { mapping: { title: 'a', date: 'b","c' } }],
      [{ mapping: { title: 'a\nb', date: 'c' } }, { mapping: { title: 'a', date: 'b\nc' } }],
      [{ userId: 'u1', spaceId: 's1x' }, { userId: 'u1s', spaceId: '1x' }],
      [{ fileId: 'f', timeZone: 'UTC' }, { fileId: 'fUTC', timeZone: 'U' }],
      [{ target: { kind: 'table', blockId: 'new' } }, { target: { kind: 'new' } }],
      [{ timeZone: 'true', wallClock: false }, { timeZone: 'false', wallClock: true }],
      [{ userId: '제목' }, { userId: '제목'.normalize('NFD') }], // 글자 표현이 다르면 다른 값으로 본다(조용히 맞추지 않는다)
    ];
    for (const [a, b] of pairs) {
      const ha = intentHash(intent(a));
      const hb = intentHash(intent(b));
      expect(ha, JSON.stringify(a)).toMatch(/^[0-9a-f]{64}$/);
      expect(ha, JSON.stringify([a, b])).not.toBe(hb);
    }
    // 의도 지문과 구조 지문은 서로 다른 머리말을 쓴다(한쪽 값을 다른 쪽 자리에 끼워 맞출 수 없다)
    expect(intentHash(intent())).not.toBe(structureHash(structure()));
    const sA = structureHash({ columns: [{ id: 'a', name: 'b', type: 'c' }], viewIds: ['d'] });
    const sB = structureHash({ columns: [{ id: 'a', name: 'b', type: 'c' }, { id: 'd', name: '', type: 'x' }], viewIds: [] });
    expect(sA).not.toBe(sB);
    // 같은 값이면 객체를 만드는 칸 순서와 무관하게 같은 지문
    const reordered = { wallClock: false, timeZone: 'Asia/Seoul', mapping: { date: '날짜', title: '제목' }, fileSha256: intent().fileSha256, fileId: 'file-1', target: { blockId: 'block-1', kind: 'table' }, spaceId: 'space-1', userId: 'user-1' } as PreviewIntent;
    expect(intentHash(reordered)).toBe(intentHash(intent()));
    // 지문에 쓰지 않는 칸이 붙어 있어도 같다
    expect(intentHash({ ...intent(), extra: 'x', token: 'y' } as PreviewIntent)).toBe(intentHash(intent()));
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'); // SHA-256 표준 값
    expect(sha256Hex(new Uint8Array([97, 98, 99]))).toBe(sha256Hex('abc'));
  });

  it('묶을 값의 모양이 틀리면 내주지 않고 받아 주지도 않는다', () => {
    const t = issue().token;
    const long = 'x'.repeat(513);
    const badIntents: Partial<Record<keyof PreviewIntent, unknown>>[] = [
      { userId: '' }, { userId: 123 }, { userId: long }, { spaceId: '' }, { spaceId: null }, { fileId: '' }, { timeZone: '' }, { timeZone: 9 },
      { fileSha256: 'abc' }, { fileSha256: 'G'.repeat(64) }, { fileSha256: 'A'.repeat(64) }, { fileSha256: sha256Hex('x') + '0' }, { fileSha256: null },
      { mapping: null }, { mapping: { title: '', date: '날짜' } }, { mapping: { title: '제목' } }, { mapping: { title: '제목', date: 5 } }, { mapping: { title: long, date: '날짜' } },
      { target: null }, { target: {} }, { target: { kind: 'other' } }, { target: { kind: 'table' } }, { target: { kind: 'table', blockId: '' } },
      { wallClock: 'false' }, { wallClock: 0 }, { wallClock: undefined },
    ];
    for (const over of badIntents) {
      const bad = intent(over as Partial<PreviewIntent>);
      expect(intentHash(bad), JSON.stringify(over).slice(0, 60)).toBeNull();
      expect(issuePreviewToken(KEY, bad, structure(), NOW)).toEqual({ ok: false, code: 'input_invalid' });
      expect(verifyPreviewToken(KEY, t, bad, structure(), NOW)).toEqual({ ok: false, code: 'input_invalid' });
    }
    for (const bad of [null, undefined, 'x', 5] as unknown as PreviewIntent[]) expect(intentHash(bad)).toBeNull();
    const badStructures = [
      null, {}, { columns: [] }, { viewIds: [] }, { columns: 'x', viewIds: [] }, { columns: [null], viewIds: [] }, { columns: [{ id: '', name: 'a', type: 'b' }], viewIds: [] },
      { columns: [{ id: 'a', name: 5, type: 'b' }], viewIds: [] }, { columns: [{ id: 'a', name: 'b', type: '' }], viewIds: [] }, { columns: [{ id: 'a', name: long, type: 'b' }], viewIds: [] },
      { columns: [{ id: 'a', name: 'b', type: 'c' }, { id: 'a', name: 'd', type: 'e' }], viewIds: [] }, // 열 id가 겹침
      { columns: [], viewIds: [''] }, { columns: [], viewIds: [5] }, { columns: [], viewIds: ['v', 'v'] }, // 보기 id가 겹침
    ] as unknown as PreviewStructure[];
    for (const bad of badStructures) {
      expect(structureHash(bad), JSON.stringify(bad).slice(0, 60)).toBeNull();
      expect(issuePreviewToken(KEY, intent(), bad, NOW)).toEqual({ ok: false, code: 'input_invalid' });
      expect(verifyPreviewToken(KEY, t, intent(), bad, NOW)).toEqual({ ok: false, code: 'input_invalid' });
    }
    // 이름이 빈 열은 있을 수 있다(구조로는 유효)
    expect(structureHash({ columns: [{ id: 'a', name: '', type: 'text' }], viewIds: [] })).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('미리보기 표식: 순수 모듈 경계', () => {
  it('환경변수를 읽지 않고, 키를 만들거나 기록하지 않는다 — 소스에 그런 코드가 없다', () => {
    const src = readFileSync(new URL('../../src/litpage/server/content/lectureImport/previewToken.ts', import.meta.url), 'utf8');
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');
    expect(code).not.toMatch(/process\.env|randomBytes|generateKey|console\.|CRON_SECRET|SUPABASE|readFile|writeFile/);
    expect(code).toMatch(/timingSafeEqual/);
    expect(code).toMatch(/createHmac\('sha256'/);
    // 실행해도 환경변수에 손대지 않는다
    const before = JSON.stringify(Object.keys(process.env).sort());
    issue();
    expect(JSON.stringify(Object.keys(process.env).sort())).toBe(before);
  });
});
