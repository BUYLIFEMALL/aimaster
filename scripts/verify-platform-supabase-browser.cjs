// Visible Microsoft Edge, ordinary member, navigation and read-only checks only.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const cp = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker/package.json'));
const { chromium } = ownRequire('playwright');
const { createClient } = ownRequire('@supabase/supabase-js');
const { createServerClient } = ownRequire('@supabase/ssr');
const mode = process.env.PLATFORM_BROWSER_MODE || 'local-new';
const filter = process.env.PLATFORM_BROWSER_SLUGS?.split(',');
const releases = JSON.parse(fs.readFileSync(path.join(root, 'docs/supabase-compat-rollout-20261016/releases.json'), 'utf8')).filter(r => !filter || filter.includes(r.slug));
const projects = JSON.parse(fs.readFileSync(path.join(root, 'docs/supabase-compat-rollout-20261016/projects-before.json'), 'utf8'));
const output = path.join(root, '.vercel/supabase-compat-browser', mode);
fs.mkdirSync(output, { recursive: true });
function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}
const platform = readEnv(path.join(root, '.env.local'));
const url = platform.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = platform.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || platform.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serverKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();
const specialRoutes = { '.': '/programs/blog-content-maker', 'ai-auto-blog': '/dashboard', 'tistory-auto-blog': '/dashboard', 'blog-content-maker': '/dashboard', 'ai-task-planner': '/dashboard', 'document-translator': '/dashboard', 'file-merge': '/excel-merge', 'blog-workroom': '/write', 'tarot-reading': '/draw', 'personality-code': '/test', 'mbti-character': '/test', 'threads-content-ops': '/threads-content-ops' };
function routeFor(r) {
  if (specialRoutes[r.slug]) return specialRoutes[r.slug];
  const manifest = JSON.parse(fs.readFileSync(path.join(root, r.folder, '.next/server/app-paths-manifest.json'), 'utf8'));
  const routes = Object.keys(manifest).filter(x => x.endsWith('/page')).map(x => '/' + x.split('/').filter(s => s && !s.startsWith('(') && s !== 'page').join('/'));
  return ['/dashboard', '/studio', '/player', '/analyze', '/convert', '/reservations', '/competitors', '/submissions', '/comments', '/conversations', '/seeds', '/plannings', '/products', '/leads', '/sourcing', '/scripts', '/source-finder'].find(x => routes.includes(x)) || '/';
}
function liveBase(r) {
  const aliases = projects.find(p => p.slug === r.slug)?.production?.aliases || [];
  if (r.slug === '.') return 'https://www.buylife.xyz';
  if (r.slug === 'ai-image-studio') return 'https://ai-image-studio.vercel.app';
  const desired = new URL(r.app_url);
  return desired.pathname === '/' && aliases.includes(desired.hostname) ? desired.origin : 'https://' + (aliases.find(a => a.endsWith('.buylife.xyz')) || aliases.find(a => !a.includes('-buylife.')) || aliases[0]);
}
const resultsFile = path.join(output, 'results.json');
const results = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, 'utf8')) : [];
let browser;
async function main() {
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'buylifemall@naver.com' });
  if (linkError) throw new Error('Test-member sign-in could not be prepared');
  const { data: auth, error } = await authClient.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
  if (error || auth.user?.email !== 'buylifemall@naver.com') throw new Error('Test-member sign-in failed');
  const cookies = [];
  await createServerClient(url, publicKey, { cookies: { getAll: () => [], setAll: vals => cookies.push(...vals) } }).auth.setSession(auth.session);
  const checkUser = await authClient.auth.getUser(auth.session.access_token);
  const ssrUser = await createServerClient(url, publicKey, { cookies: { getAll: () => cookies, setAll: () => {} } }).auth.getUser();
  if (checkUser.error || ssrUser.error) throw new Error('Ordinary member session validation failed');
  console.log('Ordinary member session verified');
  browser = await chromium.launch({ channel: 'msedge', headless: false });
  for (const r of releases) {
    if (!process.env.PLATFORM_BROWSER_FORCE && results.some(x => x.slug === r.slug && x.ok && x.version === r.version && x.browser === 'Microsoft Edge')) continue;
    let child, context, fd;
    const slug = r.slug === '.' ? 'aimaster' : r.slug;
    const base = mode === 'live' ? liveBase(r) : 'http://localhost:3150';
    const row = { slug: r.slug, version: r.version, base, mode, browser: 'Microsoft Edge', checks: {} };
    const started = Date.now();
    try {
      if (mode === 'live') {
        const state = path.join(root, 'docs/supabase-compat-rollout-20261016/deployments.json');
        let ready = false;
        for (let n = 0; n < 3600; n++) {
          const deployed = fs.existsSync(state) ? JSON.parse(fs.readFileSync(state, 'utf8')) : [];
          const hit = deployed.find(x => x.slug === r.slug && x.version === r.version);
          if (hit?.ok) { row.deployment_id = hit.deployment_id; ready = true; break; }
          if (hit && !hit.ok) throw new Error('Production deployment needs repair before live verification');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if (!ready) throw new Error('Production deployment still pending');
      }
      if (mode !== 'live') {
        const ownEnvFile = path.join(root, r.folder, '.env.local');
        const ownEnvText = fs.existsSync(ownEnvFile) ? fs.readFileSync(ownEnvFile, 'utf8') : '';
        const needsProof = !/^NEXT_PUBLIC_SUPABASE_URL=/m.test(ownEnvText) || !/^NEXT_PUBLIC_SUPABASE_(PUBLISHABLE|ANON)_KEY=/m.test(ownEnvText);
        const proof = path.join(root, '.vercel/supabase-compat-builds/config-proof', (r.folder === '.' ? 'aimaster' : r.folder.replaceAll('/', '--')) + '.json');
        for (let n = 0; needsProof && !fs.existsSync(proof) && n < 480; n++) await new Promise(resolve => setTimeout(resolve, 1000));
        if (needsProof && !fs.existsSync(proof)) throw new Error('Complete new-name-only build still pending');
        fd = fs.openSync(path.join(output, `${slug}-server.log`), 'w');
        child = cp.spawn(process.execPath, [path.join(root, r.folder, 'node_modules/next/dist/bin/next'), 'start', '-p', '3150'], { cwd: path.join(root, r.folder), windowsHide: true, stdio: ['ignore', fd, fd], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey, SUPABASE_SECRET_KEY: serverKey, NEXT_PUBLIC_SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '' } });
        let ready = false;
        for (let n = 0; n < 80; n++) {
          try { await fetch(base + '/favicon.ico', { signal: AbortSignal.timeout(1000) }); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
        }
        if (!ready) throw new Error('Local server did not start');
      }
      context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      // Explicitly prevent publish/send/generate mutations during passive verification.
      await context.route('**/api/**', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.fulfill({ status: 405, body: 'Read-only verification' }));
      let page = await context.newPage();
      const target = routeFor(r);
      const anonResponse = await page.goto(base + target, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(400);
      const anonPath = new URL(page.url()).pathname;
      const anonText = await page.locator('body').innerText();
      row.checks.anonymous_no_server_error = anonResponse.status() < 500;
      row.checks.anonymous_gated_or_public_entry = /login|auth|programs|subscribe|no-access/.test(page.url()) || /로그인|Login|이용 권한|이용권|시작하기/.test(anonText);
      const host = new URL(base).hostname;
      // A still-hydrating anonymous auth client must not clear the injected member session.
      await context.close();
      context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.route('**/api/**', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.fulfill({ status: 405, body: 'Read-only verification' }));
      await context.addCookies(cookies.map(c => ({ name: c.name, value: c.value, domain: host.endsWith('.buylife.xyz') ? '.buylife.xyz' : host, path: '/', secure: mode === 'live', httpOnly: false, sameSite: 'Lax' })));
      // Old vercel.app entry URLs may redirect to the program's shared-SSO domain.
      if (mode === 'live' && !host.endsWith('.buylife.xyz')) await context.addCookies(cookies.map(c => ({ name: c.name, value: c.value, domain: '.buylife.xyz', path: '/', secure: true, httpOnly: false, sameSite: 'Lax' })));
      row.session_cookie_count = (await context.cookies(base)).length;
      page = await context.newPage();
      const rawResponse = await context.request.get(base + target, { maxRedirects: 0 }); row.raw_status = rawResponse.status(); row.raw_location = rawResponse.headers()['location'] || null;
      const response = await page.goto(base + target, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(300);
      const body = await page.locator('body').innerText();
      row.final_path = new URL(page.url()).pathname;
      row.final_origin = new URL(page.url()).origin;
      row.checks.member_no_server_error = response.status() < 500 && !/Application error:|서버 연결 설정이 준비되지|회원 저장 설정이 준비되지/.test(body);
      const inactive = ['naver-blog-auto-poster', 'naver-blog-auto-poster-web'].includes(r.slug);
      row.checks.member_access = inactive
        ? /programs|subscribe|no-access/.test(page.url()) || /권한|구독|신청|프로그램/.test(body)
        : r.slug === '.'
          ? body.includes('지금 바로 이용하기')
          : !/\/(login|auth|setup|subscribe|no-access|programs)(?:[/?]|$)/.test(page.url()) && !/Application error:|프로그램 이용 권한 필요|이용할 수 있는 권한이 없습니다/.test(body);
      row.checks.version_visible = !r.version || body.includes(r.version);
      row.version_note = row.checks.version_visible ? null : 'Current UI does not display this version on the selected entry';
      await page.screenshot({ path: path.join(output, `${slug}-desktop.png`), fullPage: false });
      await page.setViewportSize({ width: 400, height: 860 });
      await page.waitForTimeout(150);
      row.checks.mobile_no_overflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      await page.screenshot({ path: path.join(output, `${slug}-mobile.png`), fullPage: false });
      // Version/mobile observations are recorded separately from credential compatibility.
      row.ok = row.checks.anonymous_no_server_error && row.checks.member_no_server_error && row.checks.member_access && (inactive || row.checks.version_visible);
      row.anonymous_path = anonPath;
    } catch (e) { row.ok = false; row.error = e.message.replace(/sb_(?:secret|publishable)_[\w-]+/g, '[redacted]'); }
    finally {
      if (context) await context.close();
      if (child) { const closed = new Promise(resolve => child.once('exit', resolve)); child.kill(); await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 2000))]); }
      if (fd !== undefined) fs.closeSync(fd);
    }
    row.seconds = Math.round((Date.now() - started) / 1000);
    const old = results.findIndex(x => x.slug === r.slug);
    if (old >= 0) results[old] = row; else results.push(row);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`BROWSER ${row.ok ? 'PASS' : 'FAIL'} ${slug} ${row.seconds}s ${row.error || row.final_path || ''}`);
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
