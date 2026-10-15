// 2026-10-15 threads-content-ops 독립 분리: 새 Vercel 프로젝트에 공용 DB 연결 3종 + CRON_SECRET(새 임의값)을 등록한다.
// 값은 루트 .env.local에서 읽어 표준입력으로만 넘기고 출력하지 않는다. FIXIE_URL(토스쇼핑 고정 IP 프록시)은 민감값이라 주인님이 직접 등록.
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const env = Object.fromEntries(
  fs.readFileSync("D:/Antigravity/AIMaster/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
const cwd = "D:/Antigravity/AIMaster/threads-content-ops";
const link = JSON.parse(fs.readFileSync(`${cwd}/.vercel/project.json`, "utf8"));
if (link.projectName !== "threads-content-ops") throw new Error("연결된 프로젝트가 threads-content-ops가 아닙니다.");
const targets = [
  ["NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL, false],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", env.NEXT_PUBLIC_SUPABASE_ANON_KEY, false],
  ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY, true],
  ["CRON_SECRET", crypto.randomBytes(24).toString("hex"), true],
];
for (const [key, val, sensitive] of targets) {
  if (!val) { console.error(`${key}: 값 없음 — 건너뜀`); continue; }
  const args = ["env", "add", key, "production", "--force", "--scope", "buylife", ...(sensitive ? ["--sensitive"] : [])];
  const r = spawnSync("vercel", args, { cwd, input: val, encoding: "utf8", shell: true, timeout: 90000 });
  console.log(`${key}: ${r.status === 0 ? "등록 완료(값 비공개)" : "실패 " + (r.stderr || "").split("\n").filter(Boolean).pop()}`);
}
