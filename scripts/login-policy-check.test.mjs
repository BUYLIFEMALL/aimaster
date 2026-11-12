// node --test scripts/login-policy-check.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unscopedSignOutFiles, serverLoginUaStatus } from "./login-policy-check.mjs";

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "login-policy-"));
  for (const [p, body] of Object.entries(files)) {
    const abs = join(root, "prog", p);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
}

test("범위 없는 signOut()은 알리고, 비밀번호 재설정·범위 있는 호출은 알리지 않는다", () => {
  const root = fixture({
    "src/components/Sidebar.tsx": "await supabase.auth.signOut();",
    "src/app/reset-password/Form.tsx": "await supabase.auth.signOut();",
    "src/app/settings/page.tsx": 'await supabase.auth.signOut({ scope: "local" });',
    "node_modules/x/index.js": "a.signOut()",
  });
  try {
    assert.deepEqual(unscopedSignOutFiles(root, "prog"), ["src/components/Sidebar.tsx"]);
    writeFileSync(join(root, "prog/src/components/Sidebar.tsx"), 'await supabase.auth.signOut({ scope: "local" });');
    assert.deepEqual(unscopedSignOutFiles(root, "prog"), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("서버 로그인은 User-Agent 전달 전엔 missing, 넣으면 done, 화면 로그인만 있으면 none", () => {
  const root = fixture({
    "src/lib/actions/auth.ts": '"use server";\nawait supabase.auth.signInWithPassword({ email, password });',
    "src/lib/supabase/server.ts": "return createServerClient(url, key, { cookies });",
  });
  try {
    assert.equal(serverLoginUaStatus(root, "prog"), "missing");
    writeFileSync(
      join(root, "prog/src/lib/supabase/server.ts"),
      'const ua = (await headers()).get("user-agent") ?? "";\nreturn createServerClient(url, key, { cookies, global: { headers: { "User-Agent": ua } } });',
    );
    assert.equal(serverLoginUaStatus(root, "prog"), "done");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const client = fixture({ "src/app/login/LoginForm.tsx": '"use client";\nawait supabase.auth.signInWithPassword({ email, password });' });
  try {
    assert.equal(serverLoginUaStatus(client, "prog"), "none");
  } finally {
    rmSync(client, { recursive: true, force: true });
  }
});
