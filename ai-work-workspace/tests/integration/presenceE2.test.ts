// PLAN-20261117-01 E2 7-1(2026-11-17) — 공유 페이지 변경 빠른 반영. 기존 5초 확인(collabPoll)은 그대로 두고
// 1) 창 포커스·탭이 다시 보일 때 바로 한 번 확인 2) 요청이 나가 있는 동안 또 불리면 겹쳐 보내지 않고 끝난 뒤 한 번만
// 3) 리스너는 connectRealtime에서 한 번만 등록, disconnectRealtime에서 해제 4) 숨은 탭에서는 확인하지 않음.
// 서버·DB 없음(api 모의), 가짜 타이머.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ list: [] as { resolve: (v: unknown) => void }[] }));
vi.mock('../../src/litpage/web/lib/api.ts', () => ({
  clientId: 'me',
  api: vi.fn(() => new Promise((resolve) => calls.list.push({ resolve }))),
}));
vi.mock('../../src/litpage/web/lib/store/records.ts', () => ({ records: { mergeRecordMap: () => {} } }));
vi.mock('../../src/litpage/web/lib/store/ui.ts', () => ({ useUI: { getState: () => ({ setPresence: () => {}, setConnection: () => {} }) } }));

const win = new EventTarget() as EventTarget & { addEventListener: EventTarget['addEventListener'] };
const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
vi.stubGlobal('window', win);
vi.stubGlobal('document', doc);
vi.stubGlobal('navigator', { onLine: true });

let sync: typeof import('../../src/litpage/web/lib/store/sync.ts');
beforeAll(async () => {
  sync = await import('../../src/litpage/web/lib/store/sync.ts');
});
beforeEach(() => {
  vi.useFakeTimers();
  calls.list.length = 0;
  doc.visibilityState = 'visible';
});
afterEach(async () => {
  sync.disconnectRealtime();
  // 페이지를 닫아 더 확인하지 않게 한 뒤, 남은 요청을 끝내 다음 시험에 넘기지 않음
  sync.setPresencePage(null);
  for (const c of calls.list.splice(0)) c.resolve({});
  await vi.advanceTimersByTimeAsync(0);
  for (const c of calls.list.splice(0)) c.resolve({});
  await vi.advanceTimersByTimeAsync(0);
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function openPage(id: string) {
  sync.setPresencePage(id);
  await vi.advanceTimersByTimeAsync(300); // 페이지를 열면 300ms 뒤 첫 확인
}
const flush = () => vi.advanceTimersByTimeAsync(0);

describe('E2 7-1 복귀 즉시 확인', () => {
  it('connectRealtime이 리스너를 붙이고, 포커스 복귀 때 5초를 기다리지 않고 바로 확인', async () => {
    sync.connectRealtime(['s1']);
    await openPage('p1');
    expect(calls.list).toHaveLength(1);
    calls.list[0].resolve({ shared: true });
    await flush();
    win.dispatchEvent(new Event('focus'));
    await flush();
    expect(calls.list).toHaveLength(2);
  });

  it('요청이 나가 있는 동안 여러 번 복귀해도 겹쳐 보내지 않고, 끝난 뒤 한 번만 다시 확인', async () => {
    sync.connectRealtime(['s1']);
    await openPage('p2');
    expect(calls.list).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      win.dispatchEvent(new Event('focus'));
      doc.dispatchEvent(new Event('visibilitychange'));
    }
    await flush();
    expect(calls.list).toHaveLength(1);
    calls.list[0].resolve({ shared: true });
    await flush();
    expect(calls.list).toHaveLength(2);
    calls.list[1].resolve({ shared: true });
    await flush();
    expect(calls.list).toHaveLength(2); // 그 뒤로는 평소 5초 주기
  });

  it('숨은 탭으로 바뀌는 이벤트·숨은 상태의 복귀 호출은 확인하지 않음', async () => {
    sync.connectRealtime(['s1']);
    await openPage('p3');
    calls.list[0].resolve({ shared: true });
    await flush();
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    sync.pollNow();
    await flush();
    expect(calls.list).toHaveLength(1);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(calls.list).toHaveLength(2);
  });

  it('connectRealtime을 여러 번 불러도 리스너는 하나, disconnectRealtime 뒤에는 복귀해도 확인 없음', async () => {
    sync.connectRealtime(['s1']);
    sync.connectRealtime(['s1']);
    await openPage('p4');
    calls.list[0].resolve({ shared: true });
    await flush();
    win.dispatchEvent(new Event('focus'));
    await flush();
    expect(calls.list).toHaveLength(2); // 리스너가 둘이었다면 합쳐지더라도 등록 수를 아래에서 확인
    calls.list[1].resolve({ shared: true });
    await flush();
    sync.disconnectRealtime();
    win.dispatchEvent(new Event('focus'));
    doc.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(calls.list).toHaveLength(2);
  });

  it('리스너 등록·해제 짝이 맞음(startFocusPoll 두 번 → 등록 1쌍, stopFocusPoll → 해제 1쌍)', () => {
    sync.stopFocusPoll();
    const w = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const d = { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: 'visible' as DocumentVisibilityState };
    sync.startFocusPoll(w, d);
    sync.startFocusPoll(w, d);
    expect(w.addEventListener).toHaveBeenCalledTimes(1);
    expect(d.addEventListener).toHaveBeenCalledTimes(1);
    sync.stopFocusPoll();
    expect(w.removeEventListener).toHaveBeenCalledWith('focus', w.addEventListener.mock.calls[0][1]);
    expect(d.removeEventListener).toHaveBeenCalledWith('visibilitychange', d.addEventListener.mock.calls[0][1]);
  });
});
