// @vitest-environment jsdom
// WS-20261117-25 E4 Gmail 패널(소스 준비만 — 받은 업무 화면·서버 명령 연결 0). 실제 React, 서버 명령은 가짜 api 묶음(밖에서 넣는 방식)만.
import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { GmailPanelApi, GmailPanelItem } from '../../src/app/inbox/GmailInboxPanel.tsx';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { GmailInboxPanel, GMAIL_CONNECT_URL } = await import('../../src/app/inbox/GmailInboxPanel.tsx');

type Call = { name: string; arg?: unknown; resolve: (v: unknown) => void; reject: (e: unknown) => void };
let calls: Call[] = [];
const api: GmailPanelApi = {
  status: () => new Promise((resolve, reject) => calls.push({ name: 'status', resolve, reject })) as any,
  list: (expectSub) => new Promise((resolve, reject) => calls.push({ name: 'list', arg: expectSub, resolve, reject })) as any,
  add: (input) => new Promise((resolve, reject) => calls.push({ name: 'add', arg: input, resolve, reject })) as any,
  disconnect: () => new Promise((resolve, reject) => calls.push({ name: 'disconnect', resolve, reject })) as any,
};
const ITEMS: GmailPanelItem[] = [
  { id: 'm1', subject: '견적 요청드립니다', from: '김대표 <ceo@example.com>', date: '2026-11-17T00:00:00.000Z' },
  { id: 'm2', subject: '회의 일정', from: 'team@example.com', date: null },
];
let root: Root | null = null;
let el: HTMLDivElement;
const render = (props: Record<string, unknown>, strict = false) => act(() => {
  const node = createElement(GmailInboxPanel, props as any);
  root!.render(strict ? createElement(StrictMode, null, node) : node);
});
function mount(props: Record<string, unknown>, strict = false) { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el); render(props, strict); }
async function settle(i: number, v: unknown, fail = false) { await act(async () => { (fail ? calls[i].reject : calls[i].resolve)(v); await Promise.resolve(); await Promise.resolve(); }); }
const last = (name: string) => [...calls].reverse().find((c) => c.name === name)!;
const idx = (c: Call) => calls.indexOf(c);
const btn = (text: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement | undefined;
const click = (b: Element | undefined) => act(() => { (b as HTMLElement).click(); });
const text = () => el.textContent ?? '';
const ON = { enabled: true, accountKey: 'uA', api };
async function connectedWithList() {
  mount(ON);
  await settle(idx(last('status')), { connected: true, email: 'me@example.com', sub: 'sub-A' });
  await click(btn('최근 메일 보기'));
  await settle(idx(last('list')), { sub: 'sub-A', email: 'me@example.com', items: ITEMS });
}
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; calls = []; });

describe('꺼짐·준비 안 됨 → 그리기 0·호출 0', () => {
  it.each([
    ['enabled 기본값(false)', { accountKey: 'uA', api }],
    ['api 없음', { enabled: true, accountKey: 'uA' }],
    ['계정 없음', { enabled: true, api }],
    ['계정 공백', { enabled: true, accountKey: '  ', api }],
  ])('%s', (_n, props) => {
    mount(props);
    expect(el.innerHTML).toBe('');
    expect(calls).toEqual([]);
  });
});

describe('연결 상태', () => {
  it('연결 전: 「Gmail 연결」은 회원이 누르는 링크(자동 이동 0), 본문을 읽지 않는다는 안내', async () => {
    mount(ON);
    expect(text()).toContain('확인 중');
    await settle(0, { connected: false, email: null, sub: null });
    const a = el.querySelector('a');
    expect(a?.getAttribute('href')).toBe(GMAIL_CONNECT_URL);
    expect(text()).toContain('본문은 읽지 않음');
    expect(calls.map((c) => c.name)).toEqual(['status']);
  });
  it('연결됨: 계정 이메일 표시, 목록은 회원이 눌러야 불러옴(자동·주기 호출 0)', async () => {
    mount(ON);
    await settle(0, { connected: true, email: 'me@example.com', sub: 'sub-A' });
    expect(el.querySelector('[data-testid="gmail-email"]')?.textContent).toBe('me@example.com');
    expect(calls.map((c) => c.name)).toEqual(['status']);
  });
  it('상태 확인 실패 → 오류 문구', async () => {
    mount(ON);
    await settle(0, { code: 'server', message: '연결 정보를 읽지 못했습니다.' }, true);
    expect(text()).toContain('연결 정보를 읽지 못했습니다.');
  });
});

describe('목록', () => {
  it('목록: 화면이 본 계정(expectSub)을 실어 부름, 제목·보낸 사람·날짜만, 빈 목록 안내', async () => {
    await connectedWithList();
    expect(last('list').arg).toBe('sub-A');
    const list = el.querySelector('[data-testid="gmail-list"]')!;
    expect(list.textContent).toContain('견적 요청드립니다');
    expect(list.textContent).toContain('김대표 <ceo@example.com>');
    await click(btn('다시 불러오기'));
    await settle(idx(last('list')), { sub: 'sub-A', email: null, items: [] });
    expect(text()).toContain('받은 편지함에 메일이 없습니다');
  });
  it('목록 응답의 계정이 다름 → 옛 목록 숨기고 「계정 바뀜」, 그 뒤 호출 0', async () => {
    await connectedWithList();
    await click(btn('다시 불러오기'));
    await settle(idx(last('list')), { sub: 'sub-B', email: 'b@example.com', items: [{ id: 'x', subject: '다른 계정 메일', from: 'x', date: null }] });
    expect(text()).not.toContain('다른 계정 메일');
    expect(text()).not.toContain('견적 요청드립니다');
    expect(text()).toContain('바뀌었습니다');
    expect(btn('다시 불러오기')).toBeUndefined();
  });
  it.each([
    ['409 conflict', { code: 'conflict', message: 'x' }, '바뀌었습니다'],
    ['account_changed', { code: 'account_changed' }, '바뀌었습니다'],
    ['404 연결 없음', { code: 'not_found', message: 'x' }, 'Gmail이 연결돼 있지 않습니다'],
    ['그 밖 오류', { code: 'server', message: 'Gmail 사용 한도를 넘었습니다.' }, 'Gmail 사용 한도를 넘었습니다.'],
  ])('목록 실패 %s', async (_n, err, want) => {
    await connectedWithList();
    await click(btn('다시 불러오기'));
    await settle(idx(last('list')), err, true);
    expect(text()).toContain(want);
    expect(text()).not.toContain('견적 요청드립니다');
  });
});

describe('고르기·넣기', () => {
  it('고른 1건: 제목 기본 「메일 확인」, 「원 제목 넣기」를 눌러야 원 제목, 넣기는 messageId·제목·expectSub만', async () => {
    await connectedWithList();
    await click(btn('견적 요청드립니다'));
    const input = el.querySelector('input[aria-label="업무 제목"]') as HTMLInputElement;
    expect(input.value).toBe('메일 확인');
    await click(btn('원 제목 넣기'));
    expect((el.querySelector('input[aria-label="업무 제목"]') as HTMLInputElement).value).toBe('견적 요청드립니다');
    await click(btn('받은 업무에 넣기'));
    expect(last('add').arg).toEqual({ messageId: 'm1', title: '견적 요청드립니다', expectSub: 'sub-A' });
    expect(text()).toContain('브라우저의 첫 번째 구글 계정');
    expect(text()).toContain('me@example.com');
  });
  it('넣는 중에는 다시 눌러도 요청 1번(잠금), added와 existing 문구 구분', async () => {
    await connectedWithList();
    await click(btn('견적 요청드립니다'));
    await click(btn('받은 업무에 넣기'));
    await click(btn('넣는 중'));
    expect(calls.filter((c) => c.name === 'add')).toHaveLength(1);
    await settle(idx(last('add')), { status: 'added', inboxId: 'i1' });
    expect(el.querySelector('[data-testid="gmail-result"]')?.textContent).toBe('받은 업무에 넣었습니다.');
    await click(btn('받은 업무에 넣기'));
    await settle(idx(last('add')), { status: 'existing', inboxId: 'i1' });
    expect(el.querySelector('[data-testid="gmail-result"]')?.textContent).toBe('이미 받은 업무에 넣은 메일입니다.');
  });
  it.each([
    ['코드 없는 실패', new TypeError('Failed to fetch')],
    ['unknown 코드', { code: 'unknown', message: '받은 업무에 넣었는지 확인하지 못했습니다.' }],
  ])('결과 모름(%s) → 자동 재전송 0, 그 메일 넣기 잠금(다시 눌러도 호출 0), 다시 누르기 유도 문구 0', async (_n, err) => {
    await connectedWithList();
    await click(btn('견적 요청드립니다'));
    await click(btn('받은 업무에 넣기'));
    await settle(idx(last('add')), err, true);
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(calls.filter((c) => c.name === 'add')).toHaveLength(1);
    expect(text()).toContain('넣었는지 확인하지 못했습니다');
    expect(text()).not.toMatch(/다시 눌러|다시 시도/);
    const locked = btn('받은 업무 목록에서 확인해 주세요')!;
    expect(locked.disabled).toBe(true);
    await click(locked);
    expect(calls.filter((c) => c.name === 'add')).toHaveLength(1);
  });
  it('context_changed → 옛 메일·제목·결과 숨김, 그 뒤 넣기 호출 0', async () => {
    await connectedWithList();
    await click(btn('견적 요청드립니다'));
    await click(btn('받은 업무에 넣기'));
    await settle(idx(last('add')), { code: 'context_changed' }, true);
    expect(text()).not.toContain('견적 요청드립니다');
    expect(btn('받은 업무에 넣기')).toBeUndefined();
    expect(text()).toContain('바뀌었습니다');
  });
  it('알려진 실패(404 등)는 그 문구, 계정 바뀜은 옛 메일·제목·결과 숨김', async () => {
    await connectedWithList();
    await click(btn('견적 요청드립니다'));
    await click(btn('받은 업무에 넣기'));
    await settle(idx(last('add')), { code: 'not_found', message: '그 메일을 연결된 Gmail에서 찾지 못했습니다.' }, true);
    expect(text()).toContain('찾지 못했습니다');
    await click(btn('받은 업무에 넣기'));
    await settle(idx(last('add')), { code: 'account_changed' }, true);
    expect(text()).not.toContain('견적 요청드립니다');
    expect(el.querySelector('input[aria-label="업무 제목"]')).toBeNull();
    expect(text()).toContain('바뀌었습니다');
  });
  it('제목을 비우면 보내지 않음', async () => {
    await connectedWithList();
    await click(btn('견적 요청드립니다'));
    const input = el.querySelector('input[aria-label="업무 제목"]') as HTMLInputElement;
    await act(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; set.call(input, '   '); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await click(btn('받은 업무에 넣기'));
    expect(calls.filter((c) => c.name === 'add')).toHaveLength(0);
    expect(text()).toContain('1~200자');
  });
});

describe('세대 가드(계정 바뀜·늦은 응답·사라짐·StrictMode)', () => {
  it('로그인 계정이 바뀌면 옛 메일·제목·결과를 바로 숨기고, 옛 계정의 늦은 응답은 버림', async () => {
    await connectedWithList();
    await click(btn('견적 요청드립니다'));
    await click(btn('받은 업무에 넣기'));
    const oldAdd = last('add');
    render({ ...ON, accountKey: 'uB' });
    expect(text()).not.toContain('견적 요청드립니다');
    expect(text()).toContain('확인 중');
    await settle(idx(oldAdd), { status: 'added', inboxId: 'old' });
    expect(text()).not.toContain('받은 업무에 넣었습니다');
    await settle(idx(last('status')), { connected: true, email: 'b@example.com', sub: 'sub-B' });
    expect(el.querySelector('[data-testid="gmail-email"]')?.textContent).toBe('b@example.com');
  });
  it('계정이 바뀐 뒤 옛 넣기 응답이 실패(reject)로 와도 무시, 새 계정에서 넣기 호출 0', async () => {
    await connectedWithList();
    await click(btn('견적 요청드립니다'));
    await click(btn('받은 업무에 넣기'));
    const oldAdd = last('add');
    render({ ...ON, accountKey: 'uB' });
    await settle(idx(oldAdd), { code: 'unknown', message: '옛 결과' }, true);
    expect(text()).not.toContain('옛 결과');
    expect(text()).not.toContain('확인하지 못했습니다');
    await settle(idx(last('status')), { connected: true, email: 'b@example.com', sub: 'sub-B' });
    expect(calls.filter((c) => c.name === 'add')).toHaveLength(1);
    expect(el.querySelector('[data-testid="gmail-picked"]')).toBeNull();
  });
  it('늦게 온 옛 목록 응답은 버림(계정 바뀐 뒤)', async () => {
    mount(ON);
    await settle(0, { connected: true, email: 'me@example.com', sub: 'sub-A' });
    await click(btn('최근 메일 보기'));
    const oldList = last('list');
    render({ ...ON, accountKey: 'uB' });
    await settle(idx(oldList), { sub: 'sub-A', email: null, items: ITEMS });
    expect(text()).not.toContain('견적 요청드립니다');
  });
  it('화면이 사라진 뒤 응답 → 오류 없이 무시', async () => {
    mount(ON);
    act(() => root!.unmount());
    root = null;
    await settle(0, { connected: true, email: 'x', sub: 's' });
    expect(document.body.textContent).toBe('');
  });
  it('StrictMode(효과 두 번): 마지막 상태 응답만 그림, 첫 응답은 버림', async () => {
    mount(ON, true);
    const statuses = calls.filter((c) => c.name === 'status');
    expect(statuses.length).toBe(2);
    await settle(idx(statuses[0]), { connected: true, email: 'first@example.com', sub: 'sub-1' });
    expect(text()).not.toContain('first@example.com');
    await settle(idx(statuses[1]), { connected: true, email: 'second@example.com', sub: 'sub-2' });
    expect(el.querySelector('[data-testid="gmail-email"]')?.textContent).toBe('second@example.com');
  });
});

describe('연결 끊기', () => {
  it('회원이 「연결 끊기」→ 안내(이 워크스페이스만·구글 권한 그대로·캘린더 영향 가능) → 「끊기」를 눌러야 호출, 끝나면 옛 자료 숨김', async () => {
    await connectedWithList();
    await click(btn('연결 끊기'));
    expect(calls.filter((c) => c.name === 'disconnect')).toHaveLength(0);
    const confirm = el.querySelector('[data-testid="gmail-disconnect-confirm"]')!.textContent!;
    expect(confirm).toContain('이 워크스페이스의 Gmail 연결만');
    expect(confirm).toContain('타사 연결');
    expect(confirm).toContain('캘린더');
    await click(btn('취소'));
    expect(calls.filter((c) => c.name === 'disconnect')).toHaveLength(0);
    await click(btn('연결 끊기'));
    await click([...el.querySelectorAll('button')].find((b) => b.textContent === '끊기'));
    await settle(idx(last('disconnect')), undefined);
    expect(text()).not.toContain('견적 요청드립니다');
    expect(el.querySelector('a')?.getAttribute('href')).toBe(GMAIL_CONNECT_URL);
  });
});
