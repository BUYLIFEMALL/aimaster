// 2026-11-13 플랜 §2-2: 자동화 알림 「내 메일·카카오톡으로도 받기」 — 가짜 공용 DB로 확인한다(실제 발송 없음).
// 1. 채널별 회원당 하루 100건, 같은 내용 1분 안 중복 금지, 회원·채널은 따로 센다.
// 2. 메일 계정·카카오 연결이 없으면 보내지 않고 한국어 이유를 앱 알림으로(채널별 한 시간에 한 번) 알린다.
// 3. 받기 채널이 든 알림 동작 저장은 막히지 않는다.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

const tables: string[] = [];
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      tables.push(table);
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, in: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok),
      };
      return chain;
    },
  }),
}));

const notices: { user_id: string; message: string }[] = [];
vi.mock('@/litpage/server/notify.ts', async (orig) => ({
  ...(await orig<object>()),
  pushNotification: (n: { user_id: string; activity: { message: string } }) => { notices.push({ user_id: n.user_id, message: n.activity.message }); return n; },
}));

let ext: typeof import('../../src/server/externalNotify.ts');
let db: typeof import('../../src/litpage/server/db.ts');

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  ext = await import('../../src/server/externalNotify.ts');
});

describe('자동화 알림 — 내 메일·카카오톡으로도', () => {
  it('하루 100건·1분 중복 금지·회원과 채널은 따로 센다', () => {
    const t0 = Date.parse('2026-11-13T01:00:00Z');
    expect(ext.externalGate('ex-a', 'email', '같은 글', t0)).toBeNull();
    expect(ext.externalGate('ex-a', 'email', '같은 글', t0 + 30_000)).toMatch(/1분/);
    expect(ext.externalGate('ex-a', 'email', '같은 글', t0 + 61_000)).toBeNull();
    for (let i = 2; i < 100; i++) expect(ext.externalGate('ex-a', 'email', `글 ${i}`, t0 + 100_000 + i)).toBeNull();
    expect(ext.externalGate('ex-a', 'email', '101번째', t0 + 200_000)).toMatch(/하루 100건/);
    expect(ext.externalGate('ex-a', 'kakao', '101번째', t0 + 200_000)).toBeNull();
    expect(ext.externalGate('ex-b', 'email', '101번째', t0 + 200_000)).toBeNull();
    // 2026-11-15 키 화면 「오늘 쓴 횟수」
    expect(ext.externalUsedToday('ex-a', 'email', t0)).toBe(100);
    expect(ext.externalUsedToday('ex-a', 'kakao', t0)).toBe(1);
    expect(ext.externalUsedToday('ex-z', 'email', t0)).toBe(0);
  });

  it('웹훅 오늘 쓴 횟수는 보낸 만큼(https 아닌 주소처럼 막힌 것은 세지 않음)', async () => {
    const guard = await import('../../src/litpage/server/aimasterWebhookGuard.ts');
    const t0 = Date.parse('2026-11-14T01:00:00Z');
    expect(guard.memberWebhookGate('wh-a', 'https://hooks.example.com/x', t0)).toBeNull();
    expect(guard.memberWebhookGate('wh-a', 'https://hooks.example.com/x', t0 + 1000)).toBeNull();
    expect(guard.memberWebhookGate('wh-a', 'http://hooks.example.com/x', t0 + 2000)).toMatch(/https/);
    expect(guard.webhookUsedToday('wh-a', t0)).toBe(2);
    expect(guard.webhookUsedToday('wh-b', t0)).toBe(0);
  });

  it('메일 계정·카카오 연결이 없으면 보내지 않고 이유를 한 시간에 한 번 앱 알림으로 알린다', async () => {
    db.putRecord('lit_user', { id: 'ex-c', email: 'ex-c@example.com', version: 1 } as never);
    const n = { userId: 'ex-c', channels: ['email', 'kakao'] as ('email' | 'kakao')[], automationName: '새 주문', text: '주문 1건', pageId: 'p-1', spaceId: 's-1' };
    // 2026-11-15: 실패 목록을 돌려줘 자동화 실행 기록에 남긴다(앱 알림이 한 시간에 한 번으로 막혀도 기록은 매번)
    const fails = await ext.sendExternal(n);
    expect(fails).toEqual([expect.stringMatching(/^메일 알림을 보내지 못했습니다/), expect.stringMatching(/^카카오톡 알림을 보내지 못했습니다/)]);
    expect(notices.filter((x) => x.user_id === 'ex-c').map((x) => x.message)).toEqual([
      expect.stringMatching(/^메일 알림을 보내지 못했습니다: 보낼 메일 계정\(SMTP\)이 없습니다/),
      expect.stringMatching(/^카카오톡 알림을 보내지 못했습니다: 카카오가 아직 연결되지 않았습니다/),
    ]);
    expect(tables).toEqual(expect.arrayContaining(['user_smtp_accounts', 'member_platform_accounts']));
    expect(await ext.sendExternal({ ...n, text: '주문 2건' })).toHaveLength(2);
    expect(notices.filter((x) => x.user_id === 'ex-c')).toHaveLength(2);
  });

  it('받기 채널이 든 알림 동작도 저장 단계에서 막히지 않는다(알 수 없는 값은 저장 정리 코드가 버림)', async () => {
    const { stageBodyBlock } = await import('@/server/stagePolicy');
    expect(stageBodyBlock('saveAutomation', { automation: { actions: [{ type: 'notify', external: ['email', 'sms'] }] } })).toBeNull();
  });

  it('리마인더 받기 설정: 기본 꺼짐, 저장하면 그 채널만(모르는 값은 버림), 회원마다 따로', () => {
    for (const id of ['ex-d', 'ex-e']) db.putRecord('user_settings', { id, version: 1, settings: {} } as never);
    const h = ext.notifyPrefHandlers;
    expect(h.awwNotifyPrefs({ userId: 'ex-d' } as never, {})).toMatchObject({ reminder: [], usage: [{ key: 'webhook', used: 0, limit: 500 }, { key: 'email', used: 0, limit: 100 }, { key: 'kakao', used: 0, limit: 100 }] });
    expect(h.awwSaveNotifyPrefs({ userId: 'ex-d' } as never, { reminder: ['kakao', 'sms', 'kakao'] })).toEqual({ reminder: ['kakao'] });
    expect(ext.reminderChannels('ex-d')).toEqual(['kakao']);
    expect(ext.reminderChannels('ex-e')).toEqual([]);
    expect(h.awwSaveNotifyPrefs({ userId: 'ex-d' } as never, { reminder: [] })).toEqual({ reminder: [] });
    expect(() => h.awwNotifyPrefs({} as never, {})).toThrow();
  });
});
