// 실행: node --test docs/analysis-ai-influencer-20261118/tools/isolatedEnv.test.cjs
// 실제 키·실제 설정 파일을 쓰지 않는다. 가짜 표식 값만 쓰고, 자식 프로세스에서는 환경의 「이름」만 받아 본다.
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { buildChildEnv, assertChildEnv, APP_ALLOW } = require("./isolatedEnv.cjs");

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
