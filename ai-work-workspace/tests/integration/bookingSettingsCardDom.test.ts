// @vitest-environment jsdom
// WS-20261117-21 2A — 회원 「예약 받기」 카드(BookingSettingsCard). 실제 React, rpc만 모의(서버·DB·외부 0).
// OFF면 미노출·요청 0 / 예약 명령만 기대 계정, 빈 계정이면 요청 0 / 409면 이전 정보 숨김 / 늦은 응답·화면 해제 뒤 응답 버림 /
// 저장 두 번 클릭 → 한 번 / 확인 필요 줄의 「있음·없음」 / 자동 확인 시각을 약속하지 않는 안내.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const h = vi.hoisted(() => ({ pending: [] as { name: string; body: any; opts?: { expectedAccount?: string | null }; resolve: (v: unknown) => void; reject: (e: unknown) => void }[] }));
vi.mock('../../src/lib/standaloneRpc.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/lib/standaloneRpc.ts')>()),
  rpc: (name: string, body?: unknown, opts?: { expectedAccount?: string | null }) => new Promise((resolve, reject) => h.pending.push({ name, body, opts, resolve, reject })),
}));
const { BookingSettingsCard, BOOKING_UI } = await import('@/app/calendar-sync/BookingSettingsCard');
const { AccountChangedError } = await import('@/lib/standaloneRpc');

const settings = { tz: 'Asia/Seoul', days: [1, 2, 3, 4, 5], startMin: 600, endMin: 1080, slotMin: 30, beforeMin: 0, afterMin: 0, maxPerDay: 10, horizonDays: 14, notice: '' };
const page = (enabled = true) => ({ exists: true, enabled, settings, maxHorizonDays: 21 });
const item = (over: Record<string, unknown> = {}) => ({ id: 'b1', start: Date.UTC(2026, 11, 1, 1), end: Date.UTC(2026, 11, 1, 1, 30), status: 'confirmed', finalUnknown: false, name: '김손님', contact: '010-1', memo: '', createdTime: 1, ...over });
let root: Root | null = null;
let el: HTMLDivElement;
const render = (...acc: (string | null | undefined)[]) => act(() => root!.render(createElement(BookingSettingsCard, { accountKey: acc.length ? (acc[0] as string) : 'uA' })));
function mount(...acc: (string | null | undefined)[]) {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  render(...acc);
}
async function settle(i: number, v: unknown, fail = false) {
  await act(async () => {
    (fail ? h.pending[i].reject : h.pending[i].resolve)(v);
    await Promise.resolve();
    await Promise.resolve();
  });
}
/** 첫 불러오기(bookingGet + bookingList) 응답 */
async function loaded(from: number, p = page(), list: unknown[] = []) {
  await settle(from, p);
  await settle(from + 1, list);
}
const btn = (text: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
beforeEach(() => {
  BOOKING_UI.enabled = true;
  window.confirm = () => true;
});
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  h.pending = [];
  BOOKING_UI.enabled = false;
});

describe('예약 받기 카드', () => {
  it('화면 스위치 OFF(기본)면 아무것도 그리지 않고 요청 0', () => {
    BOOKING_UI.enabled = false;
    mount();
    expect(el.innerHTML).toBe('');
    expect(h.pending).toHaveLength(0);
  });

  it.each([['빈 문자열', ''], ['null', null], ['undefined', undefined], ['공백', '  ']])('계정 id %s → 요청 0, 새로고침 안내', (_n, id) => {
    mount(id as string | null | undefined);
    expect(h.pending).toHaveLength(0);
    expect(el.textContent).toContain('새로고침');
  });

  it('예약 명령만 기대 계정을 실어 부르고, 자동 확인 시각을 약속하지 않음', async () => {
    mount();
    expect(h.pending.map((p) => p.name)).toEqual(['bookingGet', 'bookingList']);
    expect(h.pending.every((p) => p.opts?.expectedAccount === 'uA')).toBe(true);
    await loaded(0);
    expect(el.textContent).toContain('예약 받는 중');
    expect(el.textContent).toContain('확인 시각은 보장되지 않습니다');
    expect(el.textContent).toContain('실제로 켜져 있지 않으면');
    const hints = [...el.querySelectorAll('.rc-hint')].map((x) => x.textContent).join(' ');
    expect(hints).not.toMatch(/\d+분 (뒤|마다|안에)|1·5·30/); // 정해진 확인 시각을 약속하는 표현 없음
  });

  it('409(다른 계정) → 이전 정보 숨기고 새로고침 안내', async () => {
    mount();
    await loaded(0, page(), [item()]);
    expect(el.textContent).toContain('김손님');
    act(() => btn('설정 저장')!.click());
    await settle(2, new AccountChangedError(), true);
    expect(el.textContent).not.toContain('김손님');
    expect(el.textContent).toContain('다른 계정으로');
  });

  it('계정 A→B: B로 바뀐 즉시 A 정보 숨김, 늦게 온 A 응답 버림, B 요청은 기대 계정 B', async () => {
    mount('uA');
    render('uB');
    expect(h.pending.slice(2).map((p) => p.opts?.expectedAccount)).toEqual(['uB', 'uB']);
    await loaded(0, page(), [item({ name: 'A손님' })]);
    expect(el.textContent).not.toContain('A손님');
    await loaded(2, page(), [item({ name: 'B손님' })]);
    expect(el.textContent).toContain('B손님');
  });

  it('화면 해제 뒤 응답은 오류 없이 버림', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();
    act(() => root!.unmount());
    root = null;
    await loaded(0);
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('저장을 빠르게 두 번 눌러도 한 번만, 새 주소는 그때 한 번 보임', async () => {
    mount();
    await loaded(0, page(false));
    const save = btn('예약 받기 켜기')!;
    act(() => {
      save.click();
      save.click();
    });
    const saves = h.pending.filter((p) => p.name === 'bookingSave');
    expect(saves).toHaveLength(1);
    expect(saves[0].opts?.expectedAccount).toBe('uA');
    await settle(h.pending.indexOf(saves[0]), { ...page(true), token: 't'.repeat(43) });
    expect((el.querySelector('input[aria-label="예약 주소"]') as HTMLInputElement).value).toMatch(/\/book\/t{43}$/);
  });

  it('확인 필요 줄: 「캘린더에 있음」 → bookingResolve present(기대 계정), 다른 줄에는 버튼 없음', async () => {
    mount();
    await loaded(0, page(), [item({ id: 'n1', status: 'needs_check', finalUnknown: true }), item({ id: 'c1', status: 'confirmed' })]);
    expect(el.textContent).toContain('확인 필요');
    expect([...el.querySelectorAll('button')].filter((b) => b.textContent === '캘린더에 있음')).toHaveLength(1);
    act(() => btn('캘린더에 있음')!.click());
    const r = h.pending.find((p) => p.name === 'bookingResolve')!;
    expect(r.body).toEqual({ id: 'n1', choice: 'present' });
    expect(r.opts?.expectedAccount).toBe('uA');
  });
});
