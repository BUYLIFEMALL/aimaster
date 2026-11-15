// 2026-11-15 볼타 공동인증서 만료 알림: 남은 날·단계(30일·7일·만료) 계산과, 매일 정리 작업에서 단계마다 앱 알림 한 번.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import { certDaysLeft, certReminderStage, certReminderText } from '@/server/boltaCert';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

const sent: { user_id: string; message: string }[] = [];
vi.mock('@/litpage/server/notify.ts', async (orig) => ({
  ...(await orig<object>()),
  pushNotification: (n: { user_id: string; activity: { message: string } }) => { sent.push({ user_id: n.user_id, message: n.activity.message }); return n; },
}));
vi.mock('../../src/server/workInbox.ts', async (orig) => ({
  ...(await orig<object>()),
  memberSpace: (userId: string) => { if (userId === 'c-nospace') throw new Error('no space'); return { id: `space-${userId}` }; },
}));

let bt: typeof import('../../src/server/bolta.ts');
let db: typeof import('../../src/litpage/server/db.ts');
beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  bt = await import('../../src/server/bolta.ts');
});

const kst = (d: string) => Date.parse(`${d}T12:00:00+09:00`);

describe('공동인증서 만료 — 순수 함수', () => {
  it('한국 날짜 기준 남은 날과 단계', () => {
    const exp = '2026-12-01T00:00:00+09:00';
    expect(certDaysLeft(exp, kst('2026-11-15'))).toBe(16);
    expect(certReminderStage(exp, kst('2026-10-31'))).toBeNull();
    expect(certReminderStage(exp, kst('2026-11-01'))).toBe('30');
    expect(certReminderStage(exp, kst('2026-11-24'))).toBe('7');
    expect(certReminderStage(exp, kst('2026-12-01'))).toBe('7');
    expect(certReminderStage(exp, kst('2026-12-02'))).toBe('expired');
    expect(certReminderStage('엉뚱한 값', kst('2026-12-02'))).toBeNull();
    expect(certReminderText(exp, kst('2026-11-15'))).toMatch(/16일 뒤\(2026-12-01\) 만료됩니다/);
    expect(certReminderText(exp, kst('2026-12-03'))).toMatch(/2026-12-01에 만료됐습니다/);
  });
});

describe('공동인증서 만료 — 매일 알림', () => {
  it('30일 전·7일 전·만료 뒤 단계마다 한 번, 먼 만료일·공간 없는 회원은 보내지 않음', () => {
    expect(bt.runBoltaCertReminders(kst('2026-11-15')).notified).toBe(0); // 표 만들기
    const ins = db.db.prepare('INSERT INTO aww_bolta (user_id, cert_expires, updated_time) VALUES (?, ?, ?)');
    ins.run('c-1', '2026-12-01T00:00:00+09:00', 1);
    ins.run('c-far', '2027-07-27T00:00:00+09:00', 1);
    ins.run('c-nospace', '2026-12-01T00:00:00+09:00', 1);
    expect(bt.runBoltaCertReminders(kst('2026-11-15')).notified).toBe(1);
    expect(sent.map((s) => s.user_id)).toEqual(['c-1']);
    expect(sent[0].message).toMatch(/16일 뒤/);
    expect(bt.runBoltaCertReminders(kst('2026-11-16')).notified).toBe(0); // 같은 단계는 한 번만
    expect(bt.runBoltaCertReminders(kst('2026-11-26')).notified).toBe(1); // 7일 전
    expect(bt.runBoltaCertReminders(kst('2026-12-05')).notified).toBe(1); // 만료 뒤
    expect(bt.runBoltaCertReminders(kst('2026-12-06')).notified).toBe(0);
    expect(sent).toHaveLength(3);
  });
});
