// 2026-11-17 WS-20261117-17 — /<domain>/receipts(워크스페이스 안 영수증 화면) 주소 해석과 기존 주소 회귀, 실제 parseLocation으로.
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('location', { pathname: '/', search: '', hash: '' });
vi.stubGlobal('history', { pushState: () => {}, replaceState: () => {} });
vi.stubGlobal('window', { addEventListener: () => {}, location: { pathname: '/', search: '', hash: '' } });
vi.mock('../../src/litpage/web/lib/store/records.ts', () => ({ records: { get: () => undefined } }));

const { parseLocation } = await import('../../src/litpage/web/lib/router.ts');
const route = (p: string) => parseLocation(p, '', '').route;
const PAGE = '0123456789abcdef0123456789abcdef';

describe('receipts 주소', () => {
  it('/<domain>/receipts = 워크스페이스 안 영수증 화면(새로고침·직접 입력·끝 슬래시 같음)', () => {
    expect(route('/mydomain/receipts')).toEqual({ name: 'receipts', domain: 'mydomain' });
    expect(route('/mydomain/receipts/')).toEqual({ name: 'receipts', domain: 'mydomain' });
  });
  it('기존 주소 회귀: 도메인만=home, receipts가 들어간 페이지 slug, studio·tasks', () => {
    expect(route('/mydomain')).toEqual({ name: 'home', domain: 'mydomain' });
    expect(route(`/mydomain/Receipts-${PAGE}`)).toMatchObject({ name: 'page', domain: 'mydomain' });
    expect(route('/mydomain/studio')).toEqual({ name: 'studio', domain: 'mydomain' });
    expect(route('/mydomain/tasks')).toEqual({ name: 'tasks', domain: 'mydomain' });
  });
  it('도메인 이름이 receipts여도 그 워크스페이스 홈(/receipts 자체는 Next 별도 페이지가 먼저 받음)', () => {
    expect(route('/receipts')).toEqual({ name: 'home', domain: 'receipts' });
  });
});
