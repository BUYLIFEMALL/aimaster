import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const stub = `import React from 'react';
export default function Link({children,href,...props}){return React.createElement('a',{...props,href},children)}
export function useRouter(){return {push:(p)=>{window.fixture.lastPush=p},refresh:()=>{window.fixture.refresh++}}}
export function usePathname(){return '/seeds/seed-one/runs/run-0'}
export async function createSeedAction(){window.fixture.created++;await new Promise(r=>setTimeout(r,20));return {}}
export async function deleteSeedAction(){window.fixture.deleted++;}
export async function deleteRunAction(){window.fixture.deleted++;}
export async function runKeywordExpansionAction(){window.fixture.expanded++;return {needsApiKey:'serpapi'}}
export async function requireProgramAccess(){return {id:'fixture-member'}}
export function notFound(){throw Error('Fixture not found')}
const seed={id:'seed-one',keyword:'제주 가을 여행',engine:'naver'};
const data={longtail_seed_keywords:[seed],longtail_runs:[{id:'run-0',executed_at:'2026-10-15T23:30:00Z',related_count:2,expansion_count:3,summary_text:'제주 가을 여행 블로그 작업 지시문'}],longtail_related_keywords:[{id:'related-one',keyword:'제주 가을 코스',relevance_score:0.86},{id:'related-two',keyword:'가족 여행',relevance_score:null}],longtail_expansions:[{id:'exp-one',keyword:'제주 가을 2박3일 코스',related_id:'related-one'},{id:'exp-two',keyword:'제주 가족 가을 산책 코스',related_id:'related-two'},{id:'exp-three',keyword:'제주 가을 혼자 여행',related_id:null}]};
export async function createClient(){return {from:(table)=>{let single=false;const q={};for(const m of ['select','eq','order','limit'])q[m]=()=>q;q.maybeSingle=()=>{single=true;return q};q.then=(ok,err)=>Promise.resolve({data:single?data[table]?.[0]:data[table]||[]}).then(ok,err);return q}}}
`;
const bundle = await build({ entryPoints: ['tests/browser-entry.tsx'], bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'isolated-fixtures', setup(b) {
  b.onResolve({ filter: /^(next\/(link|navigation)|@\/lib\/(access|supabase\/server|actions\/.*))$/ }, a => ({ path: a.path, namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: stub, loader: 'jsx', resolveDir: process.cwd() }));
} }] });
const cssDir = '.next/static/css';
const css = (await Promise.all((await fs.readdir(cssDir)).filter(f => f.endsWith('.css')).map(f => fs.readFile(path.join(cssDir, f), 'utf8')))).join('\n');
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/app.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(bundle.outputFiles[0].text); }
  else if (req.url === '/app.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
  else { res.setHeader('Content-Type', 'text/html;charset=utf-8'); res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body><main style="padding:16px;max-width:1200px;margin:auto"><div id="root"></div></main><script>window.fixture={created:0,deleted:0,expanded:0,refresh:0};</script><script src="/app.js"></script></body></html>'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ channel: 'msedge', headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const errors = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
const ok = name => { checks.push({ name, passed: true }); console.log('PASS', name); };
await fs.mkdir('docs/evidence', { recursive: true });
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  const seeds = page.locator('#seeds'), runs = page.locator('#runs');
  assert.equal(await seeds.locator('tbody tr').count(), 3);
  await seeds.getByRole('button', { name: '구글', exact: true }).click();
  assert.equal(await seeds.locator('tbody tr').count(), 1);
  assert.match(await seeds.innerText(), /AI Automation/);
  await seeds.getByRole('button', { name: '전체', exact: true }).click();
  await seeds.getByLabel('키워드 검색', { exact: true }).fill(' 제주 ');
  assert.equal(await seeds.locator('tbody tr').count(), 1);
  await seeds.getByLabel('키워드 검색', { exact: true }).fill('nothing');
  await seeds.getByText('조건에 맞는 키워드가 없습니다.', { exact: true }).waitFor();
  await seeds.getByLabel('키워드 검색', { exact: true }).fill('');
  ok('씨드 검색·엔진 필터·검색 없음');
  await seeds.getByRole('button', { name: '▦ 카드', exact: true }).click();
  assert.equal(await seeds.locator('table').count(), 0);
  assert.equal(await seeds.getByRole('button', { name: '삭제', exact: true }).count(), 3);
  await seeds.getByRole('button', { name: '☰ 표', exact: true }).click();
  ok('씨드 표/카드 전환·액션 유지');
  await runs.getByLabel('키워드로 결과 찾기').fill('automation');
  assert.equal(await runs.locator('tbody tr').count(), 1);
  await runs.getByRole('button', { name: '▦ 카드', exact: true }).click();
  assert.equal(await runs.locator('table').count(), 0);
  await runs.getByLabel('키워드로 결과 찾기').fill('');
  assert.equal(await runs.getByRole('button', { name: '삭제', exact: true }).count(), 2);
  await runs.getByRole('button', { name: '☰ 표', exact: true }).click();
  ok('결과 대소문자 검색·표/카드 전환');
  for (const section of [seeds, runs]) {
    const dialog = page.waitForEvent('dialog');
    const click = section.getByRole('button', { name: '삭제', exact: true }).first().click();
    const confirm = await dialog;
    assert.equal(confirm.type(), 'confirm');
    await confirm.dismiss();
    await click;
  }
  assert.equal(await page.evaluate(() => window.fixture.deleted), 0);
  ok('씨드/실행 삭제 확인 취소 시 삭제 액션 0');
  const sidebarDialog = page.waitForEvent('dialog');
  const sidebarClick = page.locator('#detail').getByTitle('이 실행 결과 삭제', { exact: true }).click();
  const sidebarConfirm = await sidebarDialog;
  await sidebarConfirm.dismiss(); await sidebarClick;
  assert.equal(await page.evaluate(() => window.fixture.deleted), 0);
  assert.ok(await page.locator('#detail').getByTitle('이 실행 결과 삭제', { exact: true }).evaluate(el => el.getBoundingClientRect().height >= 44));
  ok('상세 실행 이력 삭제 확인 취소·44px 터치 영역');
  await seeds.getByRole('button', { name: '⚡ 지금 확장하기', exact: true }).first().click();
  await page.getByRole('heading', { name: '🔑 API 키 등록이 필요합니다', exact: true }).waitFor();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  ok('본인 키 필요 안내 모달·닫기(액션 모의)');
  const detail = page.locator('#detail');
  assert.match(await detail.innerText(), /오전 08:30/);
  assert.match(await detail.innerText(), /86%/);
  assert.match(await detail.innerText(), /제주 가을 혼자 여행/);
  ok('실제 결과 상세·누적 지표·관련도·한국 시각 렌더');
  await detail.getByRole('button', { name: '📋 지시문 복사', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '제주 가을 여행 블로그 작업 지시문');
  await detail.getByRole('button', { name: '📋 롱테일 전체 복사', exact: true }).click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).split('\n').length, 3);
  ok('실제 클립보드 지시문·전체 롱테일 3개 복사');
  await detail.getByRole('button', { name: '📋 지시문 복사', exact: true }).waitFor();
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => { throw new DOMException('Fixture clipboard denied', 'NotAllowedError'); } }));
  await detail.getByRole('button', { name: '📋 지시문 복사', exact: true }).click();
  await detail.getByRole('status').filter({ hasText: '복사하지 못했습니다.' }).waitFor();
  ok('클립보드 권한 거부 시 실패·수동 복사 안내');
  await page.screenshot({ path: 'docs/evidence/fixture-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'fixture page overflow');
  const scrollers = await page.locator('div.overflow-x-auto').evaluateAll(els => els.map(e => ({ box: e.clientWidth, content: e.scrollWidth })));
  assert.ok(scrollers.some(e => e.content > e.box));
  ok('375px 채워진 표·상세 화면 가로 넘침 없음·표 안 스크롤');
  await page.screenshot({ path: 'docs/evidence/fixture-mobile.png', fullPage: true });
  await page.locator('#seed-form input').fill('비동기 등록 검수');
  await page.locator('#seed-form button[type="submit"]').click();
  await page.waitForFunction(() => window.fixture.created === 1);
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#seed-form input').inputValue(), '');
  assert.equal(await page.evaluate(() => window.fixture.refresh), 1);
  ok('비동기 씨드 등록 후 폼 초기화·목록 새로고침(액션 모의)');
  assert.deepEqual(errors, []);
  ok('페이지 오류 없음');
} catch (e) {
  checks.push({ name: 'FAILED', passed: false, error: e.message });
  console.error('FAIL', e.message);
  process.exitCode = 1;
} finally {
  await fs.writeFile('docs/evidence/browser-fixtures.json', JSON.stringify({ browser: 'Microsoft Edge (visible)', mode: 'isolated actual components with synthetic data/actions; not production auth/API verification', checked_at: new Date().toISOString(), checks, errors }, null, 2));
  await context.close(); await browser.close(); await new Promise(r => server.close(r));
}
