// 2026-11-17 WS-20261117-17 QA017 P2(Mac msg_7ba69f851b09) — /<domain>/receipts 직접 방문·뒤로가기 때 실제 워크스페이스를 주소의 domain으로 맞추는 판정.
// 실제 router.parseLocation으로 만든 경로를 넣는다. home·page·studio 동작은 이 판정 대상이 아님(회귀 0).
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('location', { pathname: '/', search: '', hash: '' });
vi.stubGlobal('history', { pushState: () => {}, replaceState: () => {} });
vi.stubGlobal('window', { addEventListener: () => {}, location: { pathname: '/', search: '', hash: '' } });
vi.mock('../../src/litpage/web/lib/store/records.ts', () => ({ records: { get: () => undefined } }));

const { parseLocation } = await import('../../src/litpage/web/lib/router.ts');
const { spaceForDomainRoute } = await import('@/litpage/web/features/shell/routeSpace.ts');
const route = (p: string) => parseLocation(p, '', '').route;
const SPACES = [{ id: 'sA', domain: 'alpha' }, { id: 'sB', domain: 'beta' }];

describe('receipts 주소의 워크스페이스 맞춤', () => {
  it('지금 A인데 /beta/receipts → B로 전환', () => {
    expect(spaceForDomainRoute(route('/beta/receipts'), 'sA', SPACES)).toBe('sB');
  });
  it('이미 같은 워크스페이스·내 것이 아닌 domain·워크스페이스 미정 → 전환 없음', () => {
    expect(spaceForDomainRoute(route('/alpha/receipts'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route('/gamma/receipts'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route('/beta/receipts'), null, SPACES)).toBeNull();
  });
  it('회귀: home·page·studio 경로는 이 판정이 건드리지 않음(기존 효과가 처리)', () => {
    expect(spaceForDomainRoute(route('/beta'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route('/beta/studio'), 'sA', SPACES)).toBeNull();
    expect(spaceForDomainRoute(route('/beta/Page-0123456789abcdef0123456789abcdef'), 'sA', SPACES)).toBeNull();
  });
});
