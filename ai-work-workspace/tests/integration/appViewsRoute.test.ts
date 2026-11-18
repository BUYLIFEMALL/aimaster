// 2026-11-18 WS-20261118-04 — 받은 업무·캘린더 연동·API키등록·매뉴얼의 워크스페이스 안 주소(/<domain>/inbox·calendar-sync·keys·guide)
// 해석과 기존 주소 회귀, 주소의 워크스페이스로 맞추는 판정. 실제 parseLocation·spaceForDomainRoute 사용(서버·DB 없음).
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('location', { pathname: '/', search: '', hash: '' });
vi.stubGlobal('history', { pushState: () => {}, replaceState: () => {} });
vi.stubGlobal('window', { addEventListener: () => {}, location: { pathname: '/', search: '', hash: '' } });
vi.mock('../../src/litpage/web/lib/store/records.ts', () => ({ records: { get: () => undefined } }));

const { parseLocation } = await import('../../src/litpage/web/lib/router.ts');
const { spaceForDomainRoute } = await import('@/litpage/web/features/shell/routeSpace.ts');
const route = (p: string, q = '') => parseLocation(p, q, '').route;
const PAGE = '0123456789abcdef0123456789abcdef';
const SPACES = [{ id: 'sA', domain: 'alpha' }, { id: 'sB', domain: 'beta' }];

describe('앱 화면 주소', () => {
  it('네 화면 주소 해석(끝 슬래시·쿼리 붙어도 같음)', () => {
    expect(route('/my/inbox')).toEqual({ name: 'inbox', domain: 'my' });
    expect(route('/my/calendar-sync')).toEqual({ name: 'calendarSync', domain: 'my' });
    expect(route('/my/keys')).toEqual({ name: 'keys', domain: 'my' });
    expect(route('/my/guide')).toEqual({ name: 'guide', domain: 'my' });
    expect(route('/my/guide/')).toEqual({ name: 'guide', domain: 'my' });
    expect(route('/my/calendar-sync', '?google=ok')).toEqual({ name: 'calendarSync', domain: 'my' });
  });
  it('기존 주소 회귀: 홈·영수증·관제·라이브러리·같은 낱말이 들어간 페이지 slug', () => {
    expect(route('/my')).toEqual({ name: 'home', domain: 'my' });
    expect(route('/my/receipts')).toEqual({ name: 'receipts', domain: 'my' });
    expect(route('/my/studio')).toEqual({ name: 'studio', domain: 'my' });
    expect(route('/my/library')).toMatchObject({ name: 'library', domain: 'my' });
    expect(route(`/my/Guide-${PAGE}`)).toMatchObject({ name: 'page', domain: 'my' });
    expect(route(`/my/inbox-${PAGE}`)).toMatchObject({ name: 'page', domain: 'my' });
    expect(route(`/my/keys-${PAGE}`)).toMatchObject({ name: 'page', domain: 'my' });
  });
  it('한 마디 주소는 워크스페이스 홈으로 해석(/inbox·/guide 자체는 Next 별도 페이지가 먼저 받음)', () => {
    expect(route('/inbox')).toEqual({ name: 'home', domain: 'inbox' });
    expect(route('/guide')).toEqual({ name: 'home', domain: 'guide' });
  });
});

describe('앱 화면 주소의 워크스페이스 맞춤', () => {
  it.each(['inbox', 'calendar-sync', 'keys', 'guide', 'receipts'])('지금 A인데 /beta/%s → B로 전환', (seg) => {
    expect(spaceForDomainRoute(route(`/beta/${seg}`), 'sA', SPACES)).toBe('sB');
  });
  it('이미 같은 워크스페이스·내 것이 아닌 domain·워크스페이스 미정 → 전환 없음', () => {
    expect(spaceForDomainRoute(route('/alpha/inbox'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route('/gamma/keys'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route('/beta/guide'), null, SPACES)).toBeNull();
  });
  it('회귀: home·page·studio·library는 이 판정이 건드리지 않음', () => {
    expect(spaceForDomainRoute(route('/beta'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route('/beta/studio'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route('/beta/library'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route(`/beta/Page-${PAGE}`), 'sA', SPACES)).toBeNull();
  });
});
