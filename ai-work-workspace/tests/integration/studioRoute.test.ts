// 2026-11-17 WS-20261117-13 146 S2 — /<domain>/studio 주소가 기존 주소(홈·페이지·특수 주소·고유 id)와 겹치지 않는지, 실제 parseLocation으로.
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('location', { pathname: '/', search: '', hash: '' });
vi.stubGlobal('history', { pushState: () => {}, replaceState: () => {} });
vi.stubGlobal('window', { addEventListener: () => {}, location: { pathname: '/', search: '', hash: '' } });
vi.mock('../../src/litpage/web/lib/store/records.ts', () => ({ records: { get: () => undefined } }));

const { parseLocation } = await import('../../src/litpage/web/lib/router.ts');
const route = (p: string) => parseLocation(p, '', '').route;
const PAGE = '0123456789abcdef0123456789abcdef';

describe('studio 주소', () => {
  it('/<domain>/studio = 관제 대시보드, 새로고침·직접 입력해도 같은 해석', () => {
    expect(route('/mydomain/studio')).toEqual({ name: 'studio', domain: 'mydomain' });
    expect(route('/mydomain/studio/')).toEqual({ name: 'studio', domain: 'mydomain' });
  });
  it('기존 주소 회귀: 도메인만=home, 페이지 주소, 특수 주소, studio라는 이름이 들어간 페이지 slug', () => {
    expect(route('/mydomain')).toEqual({ name: 'home', domain: 'mydomain' });
    expect(route(`/mydomain/Studio-${PAGE}`)).toMatchObject({ name: 'page', domain: 'mydomain' });
    expect(route(`/studio-${PAGE}`)).toMatchObject({ name: 'page' });
    expect(route('/mydomain/tasks')).toEqual({ name: 'tasks', domain: 'mydomain' });
    expect(route('/mydomain/chat')).toMatchObject({ name: 'chat', domain: 'mydomain' });
    expect(route('/login')).toEqual({ name: 'login' });
  });
  it('도메인 이름이 studio여도 그 워크스페이스 홈으로(/studio = home)', () => {
    expect(route('/studio')).toEqual({ name: 'home', domain: 'studio' });
  });
});
