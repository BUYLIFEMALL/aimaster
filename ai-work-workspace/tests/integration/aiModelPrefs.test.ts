// AI 비서 플랫폼별 기본 모델(2026-11-14) — 로컬 Docker Postgres(aww-pg-test)만 쓴다. 실제 AI 호출 없음.
// 1. 회원이 고른 모델이 그 플랫폼 「자동」 모델이 된다(목록에 없는 옛 모델이면 원래 기본값).
// 2. 저장·읽기는 회원마다 따로, 알 수 없는 값은 버린다. 키 없는 플랫폼은 「미등록」.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let cfg: typeof import('../../src/litpage/server/ai/providers/config.ts');
let models: typeof import('../../src/litpage/server/ai/models.ts');
let prefs: typeof import('../../src/server/aiModelPrefs.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const ctx = (userId: string) => ({ userId }) as never;

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  cfg = await import('../../src/litpage/server/ai/providers/config.ts');
  models = await import('../../src/litpage/server/ai/models.ts');
  prefs = await import('../../src/server/aiModelPrefs.ts');
  for (const id of ['mp-a', 'mp-b']) db.putRecord('user_settings', { id, version: 1, settings: {} } as never);
});

describe('플랫폼별 기본 모델', () => {
  it('고른 Claude 모델이 「자동」 모델이 되고, 목록에 없는 값이면 원래 기본값', () => {
    const base = cfg.withMemberAiKeys({ provider: 'anthropic', anthropicKey: 'sk-ant-test-a' }, () => models.autoModel());
    const picked = cfg.withMemberAiKeys({ provider: 'anthropic', anthropicKey: 'sk-ant-test-b', models: { anthropic: 'claude-haiku-5-5' } }, () => models.autoModel());
    expect(picked).toBe('claude-haiku-5-5');
    const gone = cfg.withMemberAiKeys({ provider: 'anthropic', anthropicKey: 'sk-ant-test-c', models: { anthropic: 'claude-old-1' } }, () => models.autoModel());
    expect(gone).toBe(base);
    expect(base).not.toBe('claude-haiku-5-5');
  });

  it('저장·읽기: 회원마다 따로, 알 수 없는 플랫폼·이상한 값은 버린다, 키 없는 플랫폼은 미등록', async () => {
    const h = prefs.aiModelPrefHandlers;
    expect(h.awwSaveAiModelPrefs(ctx('mp-a'), { models: { anthropic: 'claude-sonnet-5-5', openai: 'gpt bad id!', other: 'x' } })).toEqual({ models: { anthropic: 'claude-sonnet-5-5' } });
    expect(prefs.readAiModelPrefs('mp-a')).toEqual({ anthropic: 'claude-sonnet-5-5' });
    expect(prefs.readAiModelPrefs('mp-b')).toEqual({});
    const r = (await cfg.withMemberAiKeys({ provider: 'anthropic', anthropicKey: 'sk-ant-test-d' }, () => h.awwAiModelPrefs(ctx('mp-a'), {}))) as { providers: { id: string; registered: boolean; selected: string; options: { id: string }[] }[] };
    const claude = r.providers.find((p) => p.id === 'anthropic')!;
    expect(claude.registered).toBe(true);
    expect(claude.selected).toBe('claude-sonnet-5-5');
    expect(claude.options.map((o) => o.id)).toContain('claude-haiku-5-5');
    expect(r.providers.find((p) => p.id === 'openai')!.registered).toBe(false);
    expect(() => h.awwSaveAiModelPrefs({} as never, {})).toThrow();
  });
});
