// @vitest-environment jsdom
// WS-20261117-21 2A — 손님 예약 화면(BookingForm). 실제 React, fetch만 모의(서버·DB·외부 0).
// OFF면 미노출·요청 0 / 회원 시간대 기준 + 손님 시간대가 다르면 병기 / 제출 중 두 번 클릭 → 한 번 /
// 결과 모름(연결 끊김·5xx)이면 다시 제출하게 하지 않음 / 확실한 거절은 다른 시간 고르게 / 손님 입력은 기록에 안 남김.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { BookingForm, BOOKING_FORM_UI } = await import('@/app/book/[...path]/BookingForm');

const at = (h: number, m = 0) => Date.UTC(2026, 11, 1, h - 9, m); // 한국 시간 2026-12-01
const view = (over: Record<string, unknown> = {}) => ({ tz: 'Asia/Seoul', notice: '상담 30분', slotMin: 30, slots: [{ start: at(10), end: at(10, 30) }, { start: at(10, 30), end: at(11) }], unavailable: false, ...over });
const TOKEN = 'k'.repeat(43);
let root: Root | null = null;
let el: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function mount(props: Record<string, unknown> = {}) {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  act(() => root!.render(createElement(BookingForm, { token: TOKEN, view: view(), guestTz: 'Asia/Seoul', ...props } as never)));
}
const btn = (text: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
function type(label: string, v: string) {
  const x = el.querySelector(`[aria-label="${label}"]`) as HTMLInputElement | HTMLTextAreaElement;
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(x), 'value')!.set!;
  act(() => {
    set.call(x, v);
    x.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function fillAndSubmit(times = 1) {
  mount();
  act(() => btn('10:00')!.click());
  type('이름', '김손님');
  type('연락처', '010-1234-5678');
  type('메모', '비밀 메모');
  await act(async () => {
    for (let i = 0; i < times; i++) btn('예약하기')?.click();
    await new Promise((r) => setTimeout(r, 0));
  });
}
beforeEach(() => {
  BOOKING_FORM_UI.enabled = true;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  BOOKING_FORM_UI.enabled = false;
});

describe('손님 예약 화면', () => {
  it('화면 스위치 OFF(기본)면 아무것도 그리지 않고 요청 0', () => {
    BOOKING_FORM_UI.enabled = false;
    mount();
    expect(el.innerHTML).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('회원 시간대 기준으로 날짜별 칸, 손님 시간대가 같으면 병기 없음·다르면 병기', () => {
    mount();
    expect(el.textContent).toContain('12월 1일');
    expect(btn('10:00')).toBeTruthy();
    expect(el.textContent).not.toContain('내 시간');
    act(() => root!.unmount());
    mount({ guestTz: 'America/New_York' });
    expect(btn('10:00')!.textContent).toMatch(/내 시간 11\. 30\. 20:00|내 시간 11\.\s*30\.\s*20:00/);
    expect(el.textContent).toContain('America/New_York');
  });

  it('빈 시간을 못 불러왔거나 없으면 그렇게만 안내', () => {
    mount({ view: view({ unavailable: true, slots: [] }) });
    expect(el.textContent).toContain('불러오지 못했습니다');
    act(() => root!.unmount());
    mount({ view: view({ slots: [] }) });
    expect(el.textContent).toContain('예약할 수 있는 시간이 없습니다');
  });

  it('제출 중 빠르게 두 번 눌러도 한 번만, 본문은 토큰·시각·입력, 확정이면 완료', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, status: 'confirmed', bookingId: 'b1' }));
    await fillAndSubmit(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/public/submitBooking');
    expect(JSON.parse(init.body)).toEqual({ token: TOKEN, start: at(10), name: '김손님', contact: '010-1234-5678', memo: '비밀 메모' });
    expect(el.textContent).toContain('예약이 완료');
    expect(btn('예약하기')).toBeUndefined();
  });

  it('접수됨(확인 필요) → 다시 신청하지 않아도 된다고 안내', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, status: 'received', bookingId: 'b1' }));
    await fillAndSubmit();
    expect(el.textContent).toContain('접수됐습니다');
    expect(btn('예약하기')).toBeUndefined();
  });

  it.each([
    ['연결 끊김', () => Promise.reject(new Error('net'))],
    ['서버 오류 500', () => Promise.resolve(json({ name: 'Error' }, 500))],
    ['형식 모름', () => Promise.resolve(new Response('oops', { status: 200 }))],
  ])('결과 모름(%s) → 다시 제출하게 하지 않음', async (_n, impl) => {
    fetchMock.mockImplementation(impl as never);
    await fillAndSubmit();
    expect(el.textContent).toContain('다시 신청하지 마시고');
    expect(btn('예약하기')).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('확실한 거절(칸 찼음) → 오류를 보여 주고 다른 시간을 다시 고를 수 있음', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: '방금 다른 예약이 들어온 시간입니다.' }));
    await fillAndSubmit();
    expect(el.textContent).toContain('방금 다른 예약');
    fetchMock.mockResolvedValueOnce(json({ ok: true, status: 'confirmed', bookingId: 'b2' }));
    act(() => btn('10:30')!.click());
    await act(async () => {
      btn('예약하기')!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).start).toBe(at(10, 30));
  });

  it('404 → 주소 닫힘', async () => {
    fetchMock.mockResolvedValue(json({ name: 'NotFound' }, 404));
    await fillAndSubmit();
    expect(el.textContent).toContain('예약 주소는 닫혔습니다');
  });

  it('손님 입력은 기록(console)에 남기지 않음', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
    fetchMock.mockRejectedValue(new Error('net'));
    await fillAndSubmit();
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toMatch(/김손님|010-1234-5678|비밀 메모/);
    spies.forEach((s) => s.mockRestore());
  });
});

// ---------------------------------------------------------------- QA025 반례(Mac msg_524eed0da09e)
describe('QA025: StrictMode·토큰 바뀜·안내 문구', () => {
  function mountStrict(props: Record<string, unknown> = {}) {
    el = document.createElement('div');
    document.body.appendChild(el);
    root = createRoot(el);
    act(() => root!.render(createElement(StrictMode, null, createElement(BookingForm, { token: TOKEN, view: view(), guestTz: 'Asia/Seoul', ...props } as never))));
  }
  async function pickFillSend() {
    act(() => btn('10:00')!.click());
    type('이름', '김손님');
    type('연락처', '010-1234-5678');
    await act(async () => {
      btn('예약하기')!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
  }

  it.each([
    ['서버 오류 500', () => Promise.resolve(json({ name: 'Error' }, 500)), '다시 신청하지 마시고'],
    ['확정', () => Promise.resolve(json({ ok: true, status: 'confirmed', bookingId: 'b1' })), '예약이 완료'],
  ])('StrictMode에서도 응답(%s)이 반영되고 「보내는 중」에 멈추지 않음', async (_n, impl, text) => {
    fetchMock.mockImplementation(impl as never);
    mountStrict();
    await pickFillSend();
    expect(el.textContent).toContain(text);
    expect(el.textContent).not.toContain('보내는 중');
  });

  it('제출 중 주소(token)가 바뀌면 옛 응답은 버리고 새 주소로 다시 예약할 수 있음', async () => {
    let release!: (r: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((r) => (release = r)));
    mount();
    await pickFillSend();
    expect(el.textContent).toContain('보내는 중');
    const NEW = 'n'.repeat(43);
    act(() => root!.render(createElement(BookingForm, { token: NEW, view: view(), guestTz: 'Asia/Seoul' } as never)));
    await act(async () => {
      release(json({ ok: true, status: 'confirmed', bookingId: 'old' }));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(el.textContent).not.toContain('예약이 완료');
    fetchMock.mockResolvedValueOnce(json({ ok: true, status: 'received', bookingId: 'new' }));
    await pickFillSend();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).token).toBe(NEW);
  });

  it('안내 문구는 자동 연락을 약속하지 않고 예약 담당자 확인이 필요하다고만 함', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true, status: 'received', bookingId: 'b1' }));
    await fillAndSubmit();
    expect(el.textContent).toContain('예약 담당자');
    expect(el.textContent).toContain('다시 신청하지');
    expect(el.textContent).not.toMatch(/연락드립니다|연락을 기다려/);
    act(() => root!.unmount());
    root = null;
    document.body.innerHTML = '';
    fetchMock.mockRejectedValueOnce(new Error('net'));
    await fillAndSubmit();
    expect(el.textContent).toContain('예약 담당자');
    expect(el.textContent).not.toMatch(/연락드립니다|연락을 기다려/);
  });
});
