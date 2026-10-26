// 외부 호출 없는 모의 검수와 재현 가능한 요약 기록. 앱 배포/DB 적용 없음.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('.', import.meta.url));
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'preflight.test.mjs'], {
  cwd, encoding: 'utf8', env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH },
});
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);
const count = key => Number(output.match(new RegExp(`^# ${key} (\\d+)$`, 'm'))?.[1] ?? NaN);
const summary = {
  checkedAt: new Date().toISOString(), command: 'node docs/analysis-naver-blog-neighbor-20261024/simulation/run-verification.mjs',
  nodeVersion: process.version, exitCode: result.status, tests: count('tests'), passed: count('pass'), failed: count('fail'),
  scope: 'fictional search summaries and single-process in-memory queue only',
  productionDbConcurrencyVerified: false, rlsVerified: false, extensionVerified: false,
  externalApiCalls: 0, aiCalls: 0, productionWrites: 0,
  sourceHashEncoding: 'UTF-8; CRLF normalized to LF',
  sourceSha256: Object.fromEntries(['candidates.mjs', 'queue-model.mjs', 'preflight.test.mjs', 'run-verification.mjs']
    .map(name => [name, createHash('sha256').update(readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex')])),
};
const out = new URL('../evidence/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('simulation-20261026.tap', out), output);
writeFileSync(new URL('simulation-20261026.json', out), `${JSON.stringify(summary, null, 2)}\n`);
process.exitCode = result.status === 0 && summary.tests > 0 && summary.failed === 0 ? 0 : 1;
