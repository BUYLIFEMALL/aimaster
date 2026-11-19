// 실행: node --test docs/analysis-ai-influencer-20261118/tools/isolatedEnv.test.cjs
// 실제 키·실제 설정 파일을 쓰지 않는다. 가짜 표식 값만 쓰고, 자식 프로세스에서는 환경의 「이름」만 받아 본다.
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildChildEnv, assertChildEnv, APP_ALLOW, ENV_FILE_CANDIDATES, findEnvFiles, assertNoEnvFiles, launchGuarded } = require("./isolatedEnv.cjs");

// 실제 실행에 필요한 일반 이름은 이 장비의 것을 그대로 쓰고(값은 보지 않는다), 비밀 모양의 이름은 가짜 표식으로 덧씌운다.
function fakeAmbient() {
  return {
    ...process.env,
    GOOGLE_API_KEY: "FAKE_MARK_GOOGLE",
    GEMINI_API_KEY: "FAKE_MARK_GEMINI",
    OPENAI_API_KEY: "FAKE_MARK_OPENAI",
    ANTHROPIC_API_KEY: "FAKE_MARK_ANTHROPIC",
    CRON_SECRET: "FAKE_MARK_CRON",
    VERCEL_TOKEN: "FAKE_MARK_VERCEL",
    SOME_UNRELATED_NAME: "FAKE_MARK_OTHER",
  };
}
function fakePicked() {
  const p = {};
  for (const k of APP_ALLOW) p[k] = "FAKE_APP_" + k;
  p.CRON_SECRET = "FAKE_MARK_CRON_FROM_FILE"; // 원본 설정에 있어도 허용 목록 밖이면 버려져야 한다
  return p;
}
const FORBIDDEN = ["GOOGLE_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "CRON_SECRET", "VERCEL_TOKEN", "SOME_UNRELATED_NAME"];

// 자식이 실제로 받은 환경의 이름 목록과, 가짜 표식 값이 하나라도 들어왔는지 여부만 돌려받는다.
function childView(env) {
  const probe = "const e=process.env;console.log(JSON.stringify({names:Object.keys(e),leak:Object.values(e).some(v=>String(v).includes('FAKE_MARK_'))}))";
  const r = spawnSync(process.execPath, ["-e", probe], { env, encoding: "utf8" });
  assert.equal(r.status, 0, "자식 프로세스가 정상 종료해야 한다: " + r.stderr);
  return JSON.parse(r.stdout);
}

test("대조군 — 주변 환경을 통째로 넘기면 금지 이름이 자식에 들어간다(시험이 실제로 누출을 잡는지 확인)", () => {
  const view = childView({ ...fakeAmbient(), ...fakePicked() });
  for (const k of FORBIDDEN) assert.ok(view.names.includes(k), k + " 가 있어야 대조군이 성립한다");
  assert.equal(view.leak, true);
});

test("조립한 환경 — 금지 이름은 자식에 없고 허용 앱 이름은 모두 있다", () => {
  const { env, dropped } = buildChildEnv(fakeAmbient(), fakePicked());
  const view = childView(env);
  const upper = view.names.map((n) => n.toUpperCase());
  for (const k of FORBIDDEN) assert.ok(!upper.includes(k), k + " 가 자식에 있으면 안 된다");
  for (const k of APP_ALLOW) assert.ok(view.names.includes(k), k + " 가 자식에 있어야 한다");
  assert.equal(view.leak, false, "가짜 표식 값이 자식 환경 어디에도 없어야 한다");
  assert.ok(upper.includes("PATH"), "실행에 필요한 일반 이름은 남는다");
  assert.ok(dropped.ambient >= FORBIDDEN.length);
  assert.equal(dropped.picked, 1, "원본 설정의 허용 목록 밖 이름 1개가 버려진다");
});

test("실패 차단 — 허용되지 않은 이름이 섞인 환경은 던지고, 호출한 쪽은 자식을 띄우지 못한다", () => {
  const { env } = buildChildEnv(fakeAmbient(), fakePicked());
  for (const k of ["GOOGLE_API_KEY", "GEMINI_API_KEY", "SOME_UNRELATED_NAME"]) {
    assert.throws(() => assertChildEnv({ ...env, [k]: "FAKE_MARK_X" }), (e) => e.code === "ISOLATED_ENV_REJECTED" && e.message.includes(k) && !e.message.includes("FAKE_MARK_"));
  }
});

test("빈 값·없는 값 — 허용 이름이라도 값이 비면 넣지 않는다", () => {
  const { env } = buildChildEnv({ PATH: process.env.PATH || process.env.Path || "x" }, { NEXT_PUBLIC_SUPABASE_URL: "", SUPABASE_SECRET_KEY: "FAKE_APP_S" });
  assert.ok(!("NEXT_PUBLIC_SUPABASE_URL" in env));
  assert.equal(Object.keys(env).filter((k) => k.startsWith("SUPABASE")).length, 1);
});

// ── 환경 파일 차단 — 임시 폴더의 「빈 파일」만 쓴다(내용 없음, 실제 사본·실제 설정에 닿지 않는다) ──
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aif-envfile-"));
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  fs.writeFileSync(path.join(dir, ".gitignore"), "");
  fs.writeFileSync(path.join(dir, ".env.example"), ""); // Next가 읽지 않는 이름 — 막지 않는다
  return dir;
}
// 띄우기를 흉내 내는 가짜. 불린 횟수와 받은 환경의 이름만 기억한다
function fakeSpawn() { const calls = []; const fn = (env) => { calls.push(Object.keys(env)); return { pid: 0 }; }; fn.calls = calls; return fn; }

test("환경 파일 후보 — Next가 읽는 이름을 모두 담고 있다(세 모드의 .env.<모드>, .env.<모드>.local, .env, .env.local)", () => {
  const need = [".env", ".env.local"];
  for (const m of ["development", "production", "test"]) need.push(`.env.${m}`, `.env.${m}.local`);
  for (const n of need) assert.ok(ENV_FILE_CANDIDATES.includes(n), n);
});

for (const name of ENV_FILE_CANDIDATES) {
  test(`부팅 전 거절 — 사본에 ${name} 이 있으면 띄우기가 불리지 않는다`, () => {
    const dir = fixture();
    try {
      fs.writeFileSync(path.join(dir, name), "");
      const spawnFn = fakeSpawn();
      assert.throws(() => launchGuarded({ copyDir: dir, ambient: fakeAmbient(), picked: fakePicked(), spawnFn }),
        (e) => e.code === "ISOLATED_ENVFILE_PRESENT" && e.message.includes(name));
      assert.equal(spawnFn.calls.length, 0, "띄우기는 0회여야 한다");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}

test("부팅 전 거절 — 대소문자가 달라도, 파일이 아니라 폴더여도 막는다", () => {
  // 실제 파일 시스템의 대소문자 처리와 무관하게 판정 규칙만 본다(이름 목록을 직접 준다)
  assert.deepEqual(findEnvFiles("x", () => ["package.json", ".ENV.Local", ".Env.Development"]), [".ENV.Local", ".Env.Development"]);
  const dir = fixture();
  try {
    fs.mkdirSync(path.join(dir, ".env.development.local"));
    assert.throws(() => assertNoEnvFiles(dir), (e) => e.code === "ISOLATED_ENVFILE_PRESENT");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("부팅 전 거절 — 여러 개가 있으면 모두 이름으로 알리고, 판정 중에 파일을 열지 않는다", () => {
  const dir = fixture();
  try {
    fs.writeFileSync(path.join(dir, ".env.development"), "");
    fs.writeFileSync(path.join(dir, ".env.development.local"), "");
    // 파일을 여는 함수가 불리면 실패하도록 막아 두고 판정한다
    const real = { r: fs.readFileSync, o: fs.openSync };
    fs.readFileSync = fs.openSync = () => { throw new Error("환경 파일 판정 중에 파일을 열었다"); };
    let err;
    try { assertNoEnvFiles(dir); } catch (e) { err = e; } finally { fs.readFileSync = real.r; fs.openSync = real.o; }
    assert.equal(err && err.code, "ISOLATED_ENVFILE_PRESENT");
    assert.ok(err.message.includes(".env.development") && err.message.includes(".env.development.local"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("정상 경로 — 환경 파일이 없으면 띄우기가 1회 불리고, 넘어간 환경에 금지 이름이 없다", () => {
  const dir = fixture();
  try {
    const spawnFn = fakeSpawn();
    const r = launchGuarded({ copyDir: dir, ambient: fakeAmbient(), picked: fakePicked(), spawnFn });
    assert.equal(spawnFn.calls.length, 1);
    const upper = spawnFn.calls[0].map((n) => n.toUpperCase());
    for (const k of FORBIDDEN) assert.ok(!upper.includes(k), k);
    for (const k of APP_ALLOW) assert.ok(spawnFn.calls[0].includes(k), k);
    assert.equal(r.dropped.picked, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("순서 — 환경 파일이 있으면 띄우기까지 가지 않는다(입력에 금지 이름이 섞여 있어도 환경 파일 오류가 먼저다)", () => {
  const dir = fixture();
  try {
    fs.writeFileSync(path.join(dir, ".env.local"), "");
    const spawnFn = fakeSpawn();
    assert.throws(() => launchGuarded({ copyDir: dir, ambient: fakeAmbient(), picked: fakePicked(), spawnFn }), (e) => e.code === "ISOLATED_ENVFILE_PRESENT");
    assert.equal(spawnFn.calls.length, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
