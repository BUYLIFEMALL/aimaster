// T0 C(2026-11-12) 운영 배포 — 주인님이 `! node mall-builder/scripts/deploy-prod.mjs`로 실행(빌드 1회).
// · 같은 폴더가 Lab(`dev-mall-builder`, .vercel/project.json)에도 연결돼 있으므로, 운영은 연결 파일을 건드리지 않고 프로젝트 번호를 환경변수로 지정해 올린다.
// · 시작 전 확인: 팀에 빌드 중·대기 배포 없음, 운영 환경변수 7개(서버 키 포함) 있음. 하나라도 없으면 배포하지 않는다.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ORG = "team_orq6xPe9P3c1uMQdKlJsQ6k9";
const PROJECT_ID = "prj_TBwDVEc6vBveDSuv8pquHLEuBHDD"; // mall-builder(운영)
const SCOPE = "buylife";
const dir = fileURLToPath(new URL("..", import.meta.url));
const env = { ...process.env, MSYS_NO_PATHCONV: "1" };
const run = (args, extraEnv = {}) =>
  spawnSync("npx", ["--yes", "vercel@latest", ...args], { cwd: dir, encoding: "utf8", shell: process.platform === "win32", env: { ...env, ...extraEnv }, maxBuffer: 64 * 1024 * 1024 });
const api = (path) => {
  const r = run(["api", path, "--scope", SCOPE]);
  if (r.status !== 0) throw new Error((r.stderr || "").slice(-600));
  return JSON.parse(r.stdout || "{}");
};

const busy = (api(`/v6/deployments?teamId=${ORG}&state=BUILDING,QUEUED,INITIALIZING&limit=5`).deployments ?? []);
if (busy.length) {
  console.log(`✖ 팀에 빌드 중·대기 배포 ${busy.length}개 — 끝난 뒤 다시 실행하세요: ${busy.map((d) => d.name).join(", ")}`);
  process.exit(1);
}
const keys = new Set((api(`/v10/projects/mall-builder/env`).envs ?? []).map((e) => e.key));
const need = ["NEXT_PUBLIC_MALL_PLATFORM", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_MAIN_SITE_URL", "NEXT_PUBLIC_SAMPLE_MALL_SLUG", "MALL_SECRET_KEY"];
const miss = need.filter((k) => !keys.has(k));
if (!keys.has("SUPABASE_SERVICE_ROLE_KEY") && !keys.has("SUPABASE_SECRET_KEY")) miss.push("SUPABASE_SERVICE_ROLE_KEY");
if (miss.length) {
  console.log(`✖ 운영 환경변수가 빠졌습니다: ${miss.join(", ")} — node mall-builder/scripts/prod-env-setup.mjs 먼저`);
  process.exit(1);
}
console.log("✔ 빌드 대기 없음 · 환경변수 7개 확인 → 운영 배포(빌드 1회)");
const r = run(["deploy", "--prod", "--yes", "--scope", SCOPE], { VERCEL_ORG_ID: ORG, VERCEL_PROJECT_ID: PROJECT_ID });
process.stdout.write((r.stdout || "").slice(-1500));
process.stderr.write((r.stderr || "").slice(-2500));
console.log(r.status === 0 ? "\n✔ 배포 명령 끝 — https://mall-builder.buylife.xyz" : `\n✖ 배포 실패(종료 코드 ${r.status})`);
process.exit(r.status ?? 1);
