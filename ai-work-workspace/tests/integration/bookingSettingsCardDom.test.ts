// @vitest-environment jsdom
// WS-20261117-21 2A — 회원 「예약 받기」 카드(BookingSettingsCard). 실제 React, rpc만 모의(서버·DB·외부 0).
// OFF면 미노출·요청 0 / 예약 명령만 기대 계정, 빈 계정이면 요청 0 / 409면 이전 정보 숨김 / 늦은 응답·화면 해제 뒤 응답 버림 /
// 저장 두 번 클릭 → 한 번 / 확인 필요 줄의 「있음·없음」 / 자동 확인 시각을 약속하지 않는 안내.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const h = vi.hoisted(() => ({ pending: [] as { name: string; body: any; opts?: { expectedAccount?: string | null }; resolve: (v: unknown) => void; reject: (e: unknown) => void }[] }));
vi.mock('../../src/lib/standaloneRpc.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/lib/standaloneRpc.ts')>()),
  rpc: (name: string, body?: unknown, opts?: { expectedAccount?: string | null }) => new Promise((resolve, reject) => h.pending.push({ name, body, opts, resolve, reject })),
}));
const { BookingSettingsCard, BOOKING_UI } = await import('@/app/calendar-sync/BookingSettingsCard');
const releaseDefault = BOOKING_UI.enabled; // WS22: 출시 기본값(시험이 바꾸기 전)
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
  it('출시 기본값은 켜짐(v1.57)', () => {
    expect(releaseDefault).toBe(true);
  });

  it('화면 스위치 OFF(시험에서 끔)면 아무것도 그리지 않고 요청 0', () => {
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

// ---------------------------------------------------------------- QA025 반례(Mac msg_524eed0da09e)
describe('QA025: 계정이 바뀐 뒤 늦게 끝난 동작·StrictMode 다시 붙기', () => {
  const needs = () => [item({ id: 'n1', status: 'needs_check', finalUnknown: true })];
  it.each([
    ['설정 저장', 'bookingSave'],
    ['끄기', 'bookingOff'],
    ['캘린더에 있음', 'bookingResolve'],
  ])('A에서 「%s」 대기 중 B로 바뀌고 B 조회가 끝난 뒤 A 성공이 와도: 옛 계정 추가 요청 0·B 화면 그대로', async (label, rpcName) => {
    mount('uA');
    await loaded(0, page(), needs());
    act(() => btn(label)!.click());
    const a = h.pending.findIndex((p) => p.name === rpcName);
    render('uB');
    const bFrom = h.pending.length - 2;
    expect(h.pending.slice(bFrom).map((p) => p.opts?.expectedAccount)).toEqual(['uB', 'uB']);
    await loaded(bFrom, page(), [item({ name: 'B손님' })]);
    expect(el.textContent).toContain('B손님');
    const before = h.pending.length;
    await settle(a, rpcName === 'bookingSave' ? { ...page(), token: 'z'.repeat(43) } : { ok: true });
    expect(h.pending.length).toBe(before); // 옛 계정으로 다시 불러오기 0
    expect(el.textContent).toContain('B손님');
    expect(el.textContent).not.toContain('불러오는 중');
    expect(el.querySelector('input[aria-label="예약 주소"]')).toBeNull(); // A의 새 주소를 B 화면에 띄우지 않음
    expect(btn('설정 저장')!.disabled).toBe(false); // A 동작의 「처리 중」이 B에 남지 않음
  });

  it('A 동작이 B로 바뀐 뒤 실패해도 B 화면에 오류를 띄우지 않음', async () => {
    mount('uA');
    await loaded(0);
    act(() => btn('설정 저장')!.click());
    const a = h.pending.findIndex((p) => p.name === 'bookingSave');
    render('uB');
    await loaded(h.pending.length - 2);
    await settle(a, new Error('A 실패'), true);
    expect(el.textContent).not.toContain('A 실패');
  });

  it('StrictMode(붙었다 떨어졌다 다시 붙음)에서도 첫 화면이 그려지고, 앞 세대의 늦은 응답은 버림', async () => {
    el = document.createElement('div');
    document.body.appendChild(el);
    root = createRoot(el);
    act(() => root!.render(createElement(StrictMode, null, createElement(BookingSettingsCard, { accountKey: 'uA' }))));
    const n = h.pending.length;
    expect(n).toBeGreaterThanOrEqual(2);
    await loaded(n - 2, page(), [item({ name: '새세대' })]);
    expect(el.textContent).toContain('새세대');
    if (n >= 4) {
      await loaded(0, page(), [item({ name: '옛세대' })]);
      expect(el.textContent).not.toContain('옛세대');
    }
    expect(el.textContent).not.toContain('불러오는 중');
  });
});

// ---------------------------------------------------------------- WS-20261118-01 예약 요일 칩(DES-20261117-04 참고, 대비·의미 보완)
describe('WS-20261118-01 예약 받을 요일 칩', () => {
  const boxes = () => [...el.querySelectorAll<HTMLInputElement>('fieldset.rc-days input[type="checkbox"]')];
  async function ready() {
    mount();
    await loaded(0);
  }
  it('fieldset·legend·체크칸 7개·라벨 글자 유지, 칩 클래스로 선택 상태 표시', async () => {
    await ready();
    const fs = el.querySelector('fieldset.rc-days')!;
    expect(fs).not.toBeNull();
    expect(fs.querySelector('legend')?.textContent).toBe('예약 받을 요일');
    expect(boxes()).toHaveLength(7);
    expect(boxes().map((b) => b.closest('label')!.textContent?.replace('✓', '').trim())).toEqual(['일', '월', '화', '수', '목', '금', '토']);
    expect(boxes().map((b) => b.checked)).toEqual([false, true, true, true, true, true, false]);
    expect(boxes().map((b) => b.closest('label')!.classList.contains('on'))).toEqual([false, true, true, true, true, true, false]);
    // 기존 .cs-steps input(최소 너비 200px) 규칙이 걸리지 않게 cs-steps 클래스를 쓰지 않음
    expect(fs.classList.contains('cs-steps')).toBe(false);
    expect(boxes().every((b) => b.classList.contains('rc-day-input'))).toBe(true);
  });
  it('토글 값은 기존과 같음(정렬·제거), 저장 본문에 그대로', async () => {
    await ready();
    await act(async () => { boxes()[0].click(); });
    await act(async () => { boxes()[3].click(); });
    expect(boxes().map((b) => b.checked)).toEqual([true, true, true, false, true, true, false]);
    await act(async () => { btn('설정 저장')!.click(); });
    const save = h.pending.find((p) => p.name === 'bookingSave')!;
    expect(save.body.settings.days).toEqual([0, 1, 2, 4, 5]);
  });
  it('저장 중(busy)에는 요일 체크칸이 잠기고 눌러도 값 변경 0', async () => {
    await ready();
    await act(async () => { btn('설정 저장')!.click(); });
    expect(boxes().every((b) => b.disabled)).toBe(true);
    expect((el.querySelector('fieldset.rc-days') as HTMLFieldSetElement).disabled).toBe(true);
    await act(async () => { boxes()[0].click(); });
    expect(boxes()[0].checked).toBe(false);
    const save = h.pending.find((p) => p.name === 'bookingSave')!;
    await settle(h.pending.indexOf(save), page());
    expect(boxes().every((b) => !b.disabled)).toBe(true);
  });
  it('StrictMode·계정 전환 뒤에도 요일 칩은 한 벌, 새 계정 값으로 그림', async () => {
    el = document.createElement('div');
    document.body.appendChild(el);
    root = createRoot(el);
    act(() => root!.render(createElement(StrictMode, null, createElement(BookingSettingsCard, { accountKey: 'uA' }))));
    const gets = () => h.pending.filter((p) => p.name === 'bookingGet');
    const lists = () => h.pending.filter((p) => p.name === 'bookingList');
    await settle(h.pending.indexOf(gets()[gets().length - 1]), page());
    await settle(h.pending.indexOf(lists()[lists().length - 1]), []);
    expect(el.querySelectorAll('fieldset.rc-days')).toHaveLength(1);
    act(() => root!.render(createElement(StrictMode, null, createElement(BookingSettingsCard, { accountKey: 'uB' }))));
    expect(el.querySelector('fieldset.rc-days')).toBeNull(); // B 응답 전에는 A 값 숨김
    await settle(h.pending.indexOf(gets()[gets().length - 1]), { ...page(), settings: { ...settings, days: [6] } });
    await settle(h.pending.indexOf(lists()[lists().length - 1]), []);
    expect(boxes().map((b) => b.checked)).toEqual([false, false, false, false, false, false, true]);
  });
});
