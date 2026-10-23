import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as pause } from "node:timers/promises";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

// Runs the real production build, with platform configuration intentionally absent.
// No fake member/session or access bypass is injected into this server.
const probe = createServer();
await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: "production" };
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) delete env[key];
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let output = "";
server.stdout.on("data", chunk => { output += chunk; });
server.stderr.on("data", chunk => { output += chunk; });
const checks = [];
let browser;
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try { const response = await fetch(origin + "/setup"); if (response.status === 200) { ready = true; break; } } catch {}
    await pause(200);
  }
  assert.ok(ready, "Production server starts");
  for (const route of ["/dashboard", "/prepare", "/editor", "/export", "/library", "/login"]) {
    const response = await fetch(origin + route, { redirect: "manual" });
    assert.equal(response.status, 307); assert.equal(response.headers.get("location"), "/setup");
    assert.match(response.headers.get("cache-control"), /no-store/);
    checks.push({ name: `${route} redirects to setup without platform configuration`, passed: true });
  }
  const session = await fetch(origin + "/api/session");
  assert.equal(session.status, 503); assert.match(session.headers.get("cache-control"), /no-store/);
  assert.equal((await session.json()).userId, undefined);
  checks.push({ name: "Session API fails closed with JSON 503/no-store", passed: true });
  const foreign = await fetch(origin + "/api/auth/logout", { method: "POST", headers: { Origin: "https://foreign.invalid" } });
  assert.equal(foreign.status, 403);
  checks.push({ name: "Logout rejects a foreign origin", passed: true });
  browser = await chromium.launch({ channel: "chrome", headless: false });
  const page = await browser.newPage(); const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(origin + "/editor");
  await page.getByRole("heading", { name: "마크다운 문서 자동화" }).waitFor();
  await page.getByText("프로그램을 준비하고 있습니다.", { exact: false }).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "마크다운 원문" }).count(), 0);
  assert.deepEqual(errors, []);
  await mkdir("test-artifacts", { recursive: true });
  await page.screenshot({ path: path.resolve("test-artifacts/setup.png"), fullPage: true });
  checks.push({ name: "Real production Chrome displays setup and no document workspace", passed: true });
  const report = { checkedAt: new Date().toISOString(), productionBuild: true, platformConfiguration: "intentionally absent", realMemberLoginVerified: false, checks };
  await writeFile("test-artifacts/runtime-results.json", JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} finally {
  if (browser) await browser.close();
  server.kill();
  await Promise.race([new Promise(resolve => server.once("exit", resolve)), pause(5000)]);
}
