// Real ordinary-member session; no production auth mocks, paid calls, or data writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const base = process.env.CA_TEST_BASE || 'http://localhost:3035';
const local = new URL(base).hostname === 'localhost';
const mode = local ? 'local' : 'live';
const env = {};
for (const line of (await fs.readFile(path.resolve('../.env.local'), 'utf8')).split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, 'esgxyikcnnvmlhygjkth.supabase.co');
const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const secret = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);
const member = createClient(url, pub, options);
const email = 'buylifemall@naver.com';
const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
if (linkError) throw Error('Test-member sign-in link unavailable');
const { data: auth, error: authError } = await member.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
assert.equal(authError, null);
assert.equal(auth.user.email, email);
const { data: profile } = await member.from('profiles').select('is_admin').eq('id', auth.user.id).single();
assert.equal(profile?.is_admin, false);
const tables = ['competitor_keywords', 'competitor_serp_jobs', 'competitor_serp_results', 'competitor_analyses', 'user_tracked_competitors'];
async function counts() {
  return Promise.all(tables.map(async table => {
    const { count, error } = await member.from(table).select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id);
    if (error) throw Error('Member read failed: ' + table);
    return count;
  }));
}
const before = await counts();
const cookies = [];
await createServerClient(url, pub, { cookies: { getAll: () => [], setAll: values => cookies.push(...values) } }).auth.setSession(auth.session);
const browser = await chromium.launch({ channel: 'msedge', headless: false });
const checks = [], errors = [], posts = [];
let after = null;
const ok = name => { checks.push({ name, passed: true }); console.log('PASS', name); };
let context;
await fs.mkdir('docs/evidence', { recursive: true });
try {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let page = await context.newPage();
  await page.goto(base + '/dashboard');
  assert.match(page.url(), /\/login\?redirect=/);
  ok('비로그인 접근 차단·돌아올 경로 유지');
  await context.close();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies(cookies.map(c => ({ name: c.name, value: c.value, domain: new URL(base).hostname, path: '/', secure: !local, httpOnly: false, sameSite: 'Lax' })));
  page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => { if (route.request().method() === 'POST') { posts.push(new URL(route.request().url()).pathname); return route.abort(); } return route.continue(); });
  const response = await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  assert.equal(new URL(page.url()).pathname, '/dashboard');
  await page.getByRole('heading', { name: '키워드 하나로 경쟁사와 콘텐츠 전략까지' }).waitFor();
  assert.match(await page.locator('aside').innerText(), /v1\.07/);
  assert.match(await page.locator('aside').innerText(), /buylifemall@naver\.com/);
  ok('일반 회원·루트 대시보드 이동·v1.07 표시');
  assert.equal(await page.locator('.mx-kpi').count(), 4);
  const keyRows = page.locator('main ul li');
  assert.ok(await keyRows.filter({ hasText: 'SerpApi' }).count());
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(15, 17, 21)');
  assert.equal(await page.locator('.mx-card').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(23, 26, 33)');
  assert.equal(await page.locator('main ul li').count(), 4);
  ok('회원별 지표·키 4종 등록 상태·실제 다크 토큰');
  await page.screenshot({ path: `docs/evidence/${mode}-dashboard-desktop.png` });
  await page.locator('aside a[href="/keywords"]').click();
  await page.getByRole('heading', { name: '키워드 등록 & 분석' }).waitFor();
  if (!before[0]) await page.getByText('아직 등록한 키워드가 없습니다.', { exact: false }).waitFor();
  ok('실제 좌측 키워드 메뉴·회원 목록');
  await page.locator('aside a[href="/analyses"]').click();
  await page.getByRole('heading', { name: '경쟁사 분석 결과 모아 보기' }).waitFor();
  if (!before[1]) await page.getByText('아직 분석한 결과가 없습니다.', { exact: false }).waitFor();
  ok('실제 분석 메뉴·회원 결과 목록');
  await page.locator('aside a[href="/competitors"]').click();
  await page.getByRole('heading', { name: '내 경쟁사 모아 보기' }).waitFor();
  if (!before[4]) await page.getByText('아직 경쟁사로 표시해 둔 도메인이 없습니다.', { exact: false }).waitFor();
  ok('실제 내 경쟁사 빈 목록·회원 소유 데이터');
  await page.locator('aside a[href="/settings"]').click();
  await page.getByRole('heading', { name: 'API 키 설정', exact: true }).waitFor();
  assert.match(await page.locator('main').innerText(), /본인.*키/);
  ok('본인 API 설정 화면·외부 호출 없음');
  await page.locator('aside a[href="/guide"]').click();
  await page.locator('main').getByRole('heading').first().waitFor();
  assert.match(await page.locator('main').innerText(), /SerpApi/);
  assert.match(await page.locator('main').innerText(), /OpenAI/);
  ok('사용 매뉴얼·연동 안내');
  await page.screenshot({ path: `docs/evidence/${mode}-guide-desktop.png`, fullPage: true });
  for (const route of ['/dashboard', '/keywords', '/analyses', '/competitors', '/guide', '/settings']) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(base + route, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('aside').isVisible(), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(15, 17, 21)', route + ' theme');
    await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '메뉴 닫기', exact: true }).getAttribute('aria-expanded'), 'true');
    const mobile = page.locator('div.md\\:hidden');
    assert.match(await mobile.innerText(), /buylifemall@naver\.com/);
    await page.getByRole('button', { name: '메뉴 닫기', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ' overflow');
    if (route === '/dashboard' || route === '/guide') await page.screenshot({ path: `docs/evidence/${mode}-${route.slice(1)}-mobile.png`, fullPage: route === '/guide' });
  }
  ok('375px 6개 화면·메뉴 열기/닫기·회원 표시·가로 넘침 없음');
  await page.goto(base + '/dashboard', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.locator('div.md\\:hidden a[href="/keywords"]').click();
  await page.getByRole('heading', { name: '키워드 등록 & 분석' }).waitFor();
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).waitFor();
  ok('모바일 메뉴에서 이동 후 자동 닫힘');
  const missing = await page.goto(base + '/keywords/00000000-0000-4000-8000-000000000000', { waitUntil: 'networkidle' });
  assert.ok(missing.status() === 404 || await page.getByRole('heading', { name: '404' }).count());
  ok('존재하지 않는 키워드 상세 차단');
  after = await counts();
  assert.deepEqual(after, before);
  assert.deepEqual(posts, []);
  assert.deepEqual(errors, []);
  ok('회원 데이터 수 유지·쓰기/유료 호출·페이지 오류 없음');
} catch (e) {
  checks.push({ name: 'FAILED', passed: false, error: String(e.message).replace(/sb_(?:secret|publishable)_[\w-]+/g, '[redacted]') });
  console.error('FAIL', checks.at(-1).error);
  process.exitCode = 1;
} finally {
  await fs.writeFile(`docs/evidence/runtime-${mode}.json`, JSON.stringify({ base, browser: 'Microsoft Edge (visible)', member: email, member_is_admin: false, checked_at: new Date().toISOString(), counts_before: before, counts_after: after, blocked_posts: posts, paid_calls: 0, errors, checks }, null, 2));
  await context?.close();
  await browser.close();
}
