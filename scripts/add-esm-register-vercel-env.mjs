// esm-register(AI G마켓·옥션 상품 자동등록기) Vercel 프로젝트에 공용 인증 환경변수 3개 + 30일 정리용 CRON_SECRET(이 프로젝트 전용, 새로 만듦)을 등록한다.
// 주인님 승인 2026-11-15 「진행해」(첫 배포 — 플랜 docs/PLAN_20261115_ESM_EXTENSION.md 결정 5).
// 값은 루트 .env.local에서 읽어 표준입력으로만 전달하며 출력·기록하지 않는다(add-elevenst-register-vercel-env.mjs와 같은 방식).
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const env = {};
for (const line of fs.readFileSync("D:/AIMaster/.env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "").replace(/\r$/, "");
}
const values = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: crypto.randomBytes(32).toString("hex"),
};
for (const [key, value] of Object.entries(values)) {
  if (!value) { console.error(`건너뜀: ${key} 값이 비어 있음`); continue; }
  const targets = key === "CRON_SECRET" ? ["production"] : ["production", "development"];
  for (const target of targets) {
    try {
      execFileSync("vercel", ["env", "add", key, target, "--force", "--scope", "buylife"], {
        cwd: "D:/AIMaster/esm-register", input: value, stdio: ["pipe", "ignore", "pipe"], shell: true,
      });
      console.log(`등록 완료: ${key} (${target})`);
    } catch (e) { console.error(`실패: ${key} (${target}) — ${String(e.stderr || e.message).slice(0, 200)}`); }
  }
}
