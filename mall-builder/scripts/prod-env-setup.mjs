// T0 C(2026-11-12) 운영 Vercel 프로젝트 `mall-builder` 환경변수 넣기 — 주인님이 `! node mall-builder/scripts/prod-env-setup.mjs`로 실행.
// · 공개 값 5개(운영 스위치·운영 Supabase 주소·공개 키·메인 주소·샘플몰 주소)를 넣고, MALL_SECRET_KEY는 여기서 무작위 32바이트를 만들어 바로 저장(화면·파일에 남기지 않음).
// · 이미 있으면 값을 바꾸지 않는다(특히 MALL_SECRET_KEY — 바꾸면 이미 암호화한 몰 대표 키를 못 푼다). 바꾸려면 Vercel 화면에서 지우고 다시 실행.
// · Supabase 서버 키(SUPABASE_SERVICE_ROLE_KEY)는 「민감」 형식이라 다른 프로젝트에서 옮길 수 없음 → Vercel 화면에서 직접 넣는다(안내 출력).
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT = "mall-builder";
const SCOPE = "buylife";
const env = { ...process.env, MSYS_NO_PATHCONV: "1" };
const api = (path, args = []) => {
  const r = spawnSync("npx", ["--yes", "vercel@latest", "api", path, "--scope", SCOPE, ...args], { encoding: "utf8", shell: process.platform === "win32", env, maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || "").slice(-800));
  return JSON.parse(r.stdout || "{}");
};

const have = new Set((api(`/v10/projects/${PROJECT}/env`).envs ?? []).map((e) => e.key));
const t = ["production"];
const want = [
  { key: "NEXT_PUBLIC_MALL_PLATFORM", value: "aimaster", type: "plain", target: t },
  { key: "NEXT_PUBLIC_SUPABASE_URL", value: "https://esgxyikcnnvmlhygjkth.supabase.co", type: "plain", target: t },
  { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: "sb_publishable_dpa8WnGOUodpmS7_eNy91g_G-smJrml", type: "plain", target: t },
  { key: "NEXT_PUBLIC_MAIN_SITE_URL", value: "https://www.buylife.xyz", type: "plain", target: t },
  { key: "NEXT_PUBLIC_SAMPLE_MALL_SLUG", value: "aimaster-b2b", type: "plain", target: t },
  { key: "MALL_SECRET_KEY", value: randomBytes(32).toString("base64"), type: "sensitive", target: t, comment: "몰 대표 AI 키 암호화 열쇠(32바이트 base64) — 값은 어디에도 적지 않음, 바꾸면 저장된 키를 못 품" },
];
const add = want.filter((e) => !have.has(e.key));
if (add.length) {
  const dir = mkdtempSync(join(tmpdir(), "mb-env-"));
  const file = join(dir, "env.json");
  writeFileSync(file, JSON.stringify(add));
  try {
    api(`/v10/projects/${PROJECT}/env`, ["-X", "POST", "--input", file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const now = new Set((api(`/v10/projects/${PROJECT}/env`).envs ?? []).map((e) => e.key));
for (const e of want) console.log(`${now.has(e.key) ? "✔" : "✖"} ${e.key}${add.some((a) => a.key === e.key) ? " (이번에 넣음)" : " (이미 있음)"}`);
const svc = now.has("SUPABASE_SERVICE_ROLE_KEY") || now.has("SUPABASE_SECRET_KEY");
console.log(`${svc ? "✔" : "✖"} Supabase 서버 키(SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_SECRET_KEY)`);
if (!svc) console.log("  → https://vercel.com/buylife/mall-builder/settings/environment-variables 에서 이름 SUPABASE_SERVICE_ROLE_KEY, 값은 운영 Supabase service_role 키, 환경 Production, 「Sensitive」로 추가해 주세요.");
