import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const port = 3219;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "" }, stdio: ["ignore", "pipe", "pipe"] });
const origin = `http://localhost:${port}`;
try {
  for (let attempt = 0; attempt < 60; attempt++) { try { if ((await fetch(`${origin}/setup`)).ok) break; } catch {} await new Promise(r => setTimeout(r, 300)); }
  for (const route of ["/", "/dashboard", "/plan", "/focus", "/results", "/records", "/settings", "/login"]) {
    const res = await fetch(`${origin}${route}`, { redirect: "manual" }); assert.equal(res.status, 307); assert.equal(res.headers.get("location"), route === "/" ? "/dashboard" : "/setup", route);
  }
  const get = await fetch(`${origin}/api/workspace`); assert.equal(get.status, 503); assert.match(get.headers.get("cache-control"), /no-store/);
  const wrongOrigin = await fetch(`${origin}/api/workspace`, { method: "POST", headers: { origin: "https://attacker.example" }, body: "{}" }); assert.equal(wrongOrigin.status, 403);
  const sameOrigin = await fetch(`${origin}/api/workspace`, { method: "POST", headers: { origin }, body: "{}" }); assert.equal(sameOrigin.status, 503);
  const logout = await fetch(`${origin}/api/auth/logout`, { method: "POST", headers: { origin: "https://attacker.example" } }); assert.equal(logout.status, 403);
  console.log(JSON.stringify({ passed: 12, realMemberLoginVerified: false, scope: "unconfigured production runtime is fail-closed" }));
} finally { server.kill(); }
