// Vitest setup (apps/server/vitest.config.mjs): unit tests run against fake clients and fetches only. Model-provider
// settings exported in the calling shell (e.g. sourced from apps/server/.env.local) are dropped before each test file,
// so no test can reach a real endpoint; tests that need a provider set their own fake values at the top of the file.
// AI 업무 워크스페이스 이식판: 시험 파일마다 로컬 Docker Postgres의 aww 스키마를 새로 만든다(운영 DB에는 접속하지 않음).
import { setupLocalDb } from '../../tests/setup-local-db.mjs';
process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

for (const k of ['NC_AI_PROVIDER', 'OPENAI_BASE_URL', 'OPENAI_API_KEY', 'NC_AI_MODEL', 'NC_AI_FAST_MODEL', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL']) {
  delete process.env[k];
}
