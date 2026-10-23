// Visible Microsoft Edge + ordinary member; read-only verification, no AI calls or publication.
// local-new: temporarily starts the two already-built apps with only NEW names in child envs.
// live: verifies their current production deployments without changing any environment settings.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import assert from 'node:assert/strict';
import { loadPlatformEnv } from './platform-env.mjs';
const mode = process.env.PLATFORM_ENV_VERIFY_MODE || 'local-new';
assert.ok(['local-new', 'live'].includes(mode));
const root = path.resolve('..'), own = process.cwd(), env = await loadPlatformEnv();
const main = mode === 'live' ? 'https://www.buylife.xyz' : 'http://localhost:3139';
const blog = mode === 'live' ? 'https://blog-content-maker.buylife.xyz' : 'http://localhost:3140';
const output = path.resolve('test-artifacts'); await fs.mkdir(output, { recursive: true });
const children = [];
async function start(folder, port) {
  const childEnv = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    SUPABASE_SECRET_KEY: (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '' };
  const child = spawn(process.execPath, [path.join(folder, 'node_modules/next/dist/bin/next'), 'start', '-p', String(port)], { cwd: folder, env: childEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child); let errors = '';
  child.stderr.on('data', bytes => { errors = (errors + bytes).slice(-2000); });
  child.stdout.resume();
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Verification server failed to start on port ' + port);
    try { if ((await fetch(`http://localhost:${port}/login`)).status === 200) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Verification server not ready on port ' + port);
}
let context;
const checks = [], check = (name, value) => { assert.ok(value, name); checks.push({ name, passed: true }); console.log('PASS', name); };
try {
  if (mode === 'local-new') { await start(root, 3139); await start(own, 3140); }
  context = await chromium.launchPersistentContext(path.resolve('.local/env-' + mode), { channel: 'msedge', headless: false, viewport: { width: 1280, height: 900 } });
  await context.clearCookies();
  const page = context.pages()[0] || await context.newPage();
  for (const [label, base] of [['main', main], ['blog', blog]]) {
    const response = await page.goto(base + '/login', { waitUntil: 'networkidle' });
    check(label + ' login renders without configuration failure', response.status() === 200 && new URL(page.url()).pathname === '/login');
    await page.goto(base + '/dashboard', { waitUntil: 'networkidle' });
    check(label + ' anonymous protected route remains gated', new URL(page.url()).pathname === '/login');
  }
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()), { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'buylifemall@naver.com' });
  if (linkError) throw new Error('Could not prepare ordinary test member sign-in');
  const { data: auth, error: authError } = await publicClient.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
  if (authError || auth.user?.email !== 'buylifemall@naver.com') throw new Error('Ordinary test member authentication failed');
  const cookies = [];
  await createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()), { cookies: { getAll: () => [], setAll: values => cookies.push(...values) } }).auth.setSession(auth.session);
  const domain = mode === 'live' ? '.buylife.xyz' : 'localhost';
  await context.addCookies(cookies.map(c => ({ name: c.name, value: c.value, domain, path: '/', secure: mode === 'live', httpOnly: false, sameSite: 'Lax' })));
  await page.goto(main + '/programs/blog-content-maker', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'AI 블로그 콘텐츠 제작 자동화', exact: true }).first().waitFor();
  const use = page.locator('a[href="https://blog-content-maker.buylife.xyz"]').filter({ hasText: '지금 바로 이용하기' });
  await use.waitFor();
  check('main server reads member program entitlement', await use.count() === 1);
  const profile = page.locator('header button').filter({ has: page.locator('span.text-sm.text-white') }).first();
  await profile.waitFor();
  check('main browser public-key client loads signed-in profile', (await profile.innerText()).trim().length > 0);
  await page.screenshot({ path: path.join(output, 'env-' + mode + '-main.png'), fullPage: true });
  await page.goto(blog + '/dashboard', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '대시보드', exact: true }).waitFor();
  await page.getByText('buylifemall@naver.com', { exact: true }).first().waitFor();
  check('blog ordinary member authenticated and entitled', new URL(page.url()).pathname === '/dashboard');
  const workspace = await page.request.get(blog + '/api/workspace');
  const data = await workspace.json();
  check('blog server authenticated workspace DB read', workspace.status() === 200 && Array.isArray(data.projects));
  check('workspace does not expose platform secrets', !JSON.stringify(data).includes((env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim())));
  await page.screenshot({ path: path.join(output, 'env-' + mode + '-blog.png'), fullPage: true });
  await page.setViewportSize({ width: 400, height: 860 });
  check('blog mobile no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.join(output, 'env-' + mode + '-mobile.png'), fullPage: true });
  await fs.writeFile(path.join(output, 'env-' + mode + '-result.json'), JSON.stringify({ mode, main, blog, account: 'ordinary test member', checks, noPaidCalls: true, noEnvironmentChanges: true }, null, 2));
  console.log('ENV BROWSER VERIFIED', mode, checks.length);
} finally {
  if (context) await context.close();
  for (const child of children) child.kill();
}
