// @vitest-environment jsdom
// 2026-11-17 WS-20261117-17 — 워크스페이스 안 영수증 화면(ReceiptsView)이 기존 ReceiptsBoard를 그대로 붙이는지, 실제 컴포넌트를 jsdom에 그려 확인.
// rpc만 모의(서버·DB 없음). jsdom은 배치·색을 계산하지 않음 — 시각 판정 아님(왼쪽 메뉴 표시는 실화면 검수 몫).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const calls = vi.hoisted(() => [] as string[]);
vi.mock('../../src/lib/standaloneRpc.ts', () => ({
  rpc: (name: string) => { calls.push(name); return new Promise(() => {}); },
}));

const { ReceiptsView } = await import('../../src/litpage/web/features/receipts/ReceiptsView.tsx');
let root: Root | null = null;
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; calls.length = 0; });

describe('워크스페이스 안 영수증 화면', () => {
  it('제목과 기존 ReceiptsBoard(첫 상태 「불러오는 중…」)를 그리고, 기존 회원 인가 rpc(rcpt*)로 자료를 부른다', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    root = createRoot(el);
    await act(async () => { root!.render(createElement(ReceiptsView)); });
    expect(el.querySelector('.aww-receipts-view')).not.toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('영수증·세금계산서');
    expect(el.textContent).toContain('불러오는 중');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((n) => n.startsWith('rcpt'))).toBe(true);
    expect(el.querySelector('.aww-guide-back')).toBeNull(); // 「워크스페이스로 돌아가기」는 별도 페이지에만
  });
});
