// 공용 DB 연결값을 이 프로그램의 Vercel Production 환경변수로 등록한다(값은 출력하지 않음).
// 원본: 루트 .env.local(Git 제외). 새 이름(PUBLISHABLE/SECRET)과 기존 이름을 같은 값으로 함께 등록 — docs/DATABASE_CONNECTION_POLICY.md
// 운영자 AI 키는 등록하지 않는다(최상위 규칙: AI 키는 회원 본인 키만).
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const env = {};
for (const line of fs.readFileSync(path.resolve(appDir, "../.env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}
const targets = [
  ["NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ["SUPABASE_SECRET_KEY", env.SUPABASE_SERVICE_ROLE_KEY],
  ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY],
  ["NEXT_PUBLIC_MAIN_SITE_URL", "https://www.buylife.xyz"],
];
for (const [key, val] of targets) {
  if (!val) { console.log(`건너뜀(값 없음): ${key}`); continue; }
  execSync(`vercel env add ${key} production --force --scope buylife`, { cwd: appDir, input: val, stdio: ["pipe", "ignore", "pipe"] });
  console.log(`등록: ${key}`);
}
