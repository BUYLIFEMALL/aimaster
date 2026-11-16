// @vitest-environment jsdom
// 2026-11-17 WS-20261117-13 S2 / QA013 — 실제 StudioDashboard 컴포넌트를 jsdom에 그려 effect 연결까지 확인(RPC 모의, DB 없음).
// 확인: 값 표시·범위 문구, 화면 해제 뒤 늦은 응답 무시(레코드 병합·상태 0), A→B 전환 중 A 자료 미표시, 같은 공간 계정 교체, StrictMode 두 번 실행.
// jsdom은 CSS 배치·색을 계산하지 않음 — 시각 판정 아님.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  pending: [] as { name: string; body: any; resolve: (v: unknown) => void }[],
  session: { spaceId: 'sA', userId: 'u1' } as { spaceId: string | null; userId: string | null },
  merged: [] as unknown[],
}));
vi.mock('../../src/litpage/web/lib/api.ts', () => ({
  api: (name: string, body: any) => new Promise((resolve) => h.pending.push({ name, body, resolve })),
}));
vi.mock('../../src/litpage/web/lib/store/records.ts', () => ({ records: { get: () => undefined, mergeRecordMap: (rm: unknown) => h.merged.push(rm) } }));
vi.mock('../../src/litpage/web/lib/store/session.ts', () => ({ useSession: (sel: (s: typeof h.session) => unknown) => sel(h.session) }));
vi.mock('../../src/litpage/web/lib/router.ts', () => ({ navigate: () => {}, openPage: () => {}, spaceDomain: () => 'd' }));
vi.mock('../../src/litpage/web/features/shell/i18n.ts', () => ({ tx: (s: string) => s }));

const { StudioDashboard } = await import('../../src/litpage/web/features/home/StudioDashboard.tsx');

/** 아직 답하지 않은 요청에 응답(그 공간 표시를 넣어 어느 공간 자료인지 구분) */
async function answer(filter: (p: { name: string; body: any }) => boolean, label: string) {
  const take = h.pending.filter(filter);
  h.pending = h.pending.filter((p) => !take.includes(p));
  await act(async () => {
    for (const p of take) {
      if (p.name === 'workInboxList') p.resolve({ unread: label === 'A' ? 11 : 22, items: [] });
      else if (p.name === 'getMyTasks') p.resolve({ taskIds: label === 'A' ? ['a1'] : ['b1', 'b2', 'b3'], recordMap: { tag: label } });
      else if (p.name === 'getAgents') p.resolve({ agents: [] });
      else p.resolve({});
    }
    await new Promise((r) => setTimeout(r, 0));
  });
}
const all = () => true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  h.pending = [];
  h.merged = [];
  h.session = { spaceId: 'sA', userId: 'u1' };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
const kpis = () => [...host.querySelectorAll('.aww-studio-kpi-value')].map((e) => e.textContent);

describe('관제 대시보드 실제 컴포넌트(jsdom)', () => {
  it('응답 값과 범위 문구가 표시됨', async () => {
    await act(async () => root.render(createElement(StudioDashboard)));
    await answer(all, 'A');
    expect(kpis().slice(0, 2)).toEqual(['11', '1']);
    expect(host.textContent).toContain('Whole account · from the latest 100 items');
    expect(host.textContent).toContain('This workspace · up to 10 task databases, 200 rows');
    expect(h.merged).toEqual([{ tag: 'A' }]);
  });

  it('응답 전에 화면이 사라지면 늦은 응답은 레코드 병합·상태 변경 0', async () => {
    await act(async () => root.render(createElement(StudioDashboard)));
    act(() => root.unmount());
    root = createRoot(host);
    await answer(all, 'A');
    expect(h.merged).toEqual([]);
  });

  it('A 요청 중 B로 바꾸면 A 자료는 끝까지 안 보이고 병합도 0, B만 표시', async () => {
    await act(async () => root.render(createElement(StudioDashboard)));
    const aCalls = [...h.pending]; // 전환 전에 나간 요청 = A
    h.session = { spaceId: 'sB', userId: 'u1' };
    await act(async () => root.render(createElement(StudioDashboard)));
    expect(aCalls.filter((p) => p.name === 'getMyTasks').every((p) => p.body.spaceId === 'sA')).toBe(true);
    await answer((p) => aCalls.includes(p as never), 'A');
    expect(kpis().some((v) => v === '11')).toBe(false);
    expect(h.merged).toEqual([]);
    await answer(all, 'B');
    expect(kpis().slice(0, 2)).toEqual(['22', '3']);
    expect(h.merged).toEqual([{ tag: 'B' }]);
  });

  it('같은 공간에서 계정이 바뀌면 이전 계정 응답은 무시', async () => {
    await act(async () => root.render(createElement(StudioDashboard)));
    const first = [...h.pending];
    h.session = { spaceId: 'sA', userId: 'u2' };
    await act(async () => root.render(createElement(StudioDashboard)));
    await answer((p) => first.some((f) => f === (p as never)), 'A');
    expect(h.merged).toEqual([]);
    expect(kpis().every((v) => v === '' || v === null)).toBe(true);
  });

  it('StrictMode(설정→정리→설정): 첫 실행 요청이 늦게 와도 무시, 두 번째만 반영', async () => {
    await act(async () => root.render(createElement(StrictMode, null, createElement(StudioDashboard))));
    const n = h.pending.filter((p) => p.name === 'workInboxList').length;
    expect(n).toBe(2);
    const firstRun = h.pending.filter((_, i) => i < h.pending.length / 2);
    await answer((p) => firstRun.includes(p as never), 'A');
    expect(h.merged).toEqual([]);
    await answer(all, 'B');
    expect(h.merged).toEqual([{ tag: 'B' }]);
  });
});
