// markdown-studio Vercel 프로젝트에 AIMaster 공용 인증 환경변수 3개를 등록한다 (주인님 승인 2026-10-13).
// 값은 루트 .env.local에서 읽어 표준입력으로만 전달하며 출력·기록하지 않는다.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const env = {};
for (const line of fs.readFileSync("D:/Antigravity/AIMaster/.env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "").replace(/\r$/, "");
}
const keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
for (const key of keys) {
  if (!env[key]) { console.error(`건너뜀: ${key} 값이 비어 있음`); continue; }
  for (const target of ["production", "development"]) {
    try {
      execFileSync("vercel", ["env", "add", key, target, "--force", "--scope", "buylife"], {
        cwd: "D:/Antigravity/AIMaster/markdown-studio", input: env[key], stdio: ["pipe", "ignore", "pipe"], shell: true,
      });
      console.log(`등록 완료: ${key} (${target})`);
    } catch (e) { console.error(`실패: ${key} (${target}) — ${String(e.stderr || e.message).slice(0, 200)}`); }
  }
}
