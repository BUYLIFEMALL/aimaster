// 주인님의 2026-10-13 운영 연결 지시: 공통 인증 값만 새 프로젝트에 등록한다.
// 비밀 값은 표준입력으로 전달하며 출력, 파일 생성, 명령 인자로 남기지 않는다.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = fileURLToPath(new URL("../", import.meta.url));
const root = path.resolve(app, "..");
const env = {};
for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
}
if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !== "esgxyikcnnvmlhygjkth.supabase.co") {
  throw new Error("공유 인증 프로젝트가 일치하지 않습니다.");
}
const linked = JSON.parse(readFileSync(path.join(app, ".vercel/project.json"), "utf8"));
if (linked.projectName !== "ai-task-planner" || linked.orgId !== "team_orq6xPe9P3c1uMQdKlJsQ6k9") {
  throw new Error("배포 프로젝트 또는 팀이 일치하지 않습니다.");
}
const cli = process.env.VERCEL_CLI_PATH || path.join(process.env.APPDATA, "npm/node_modules/vercel/dist/vc.js");
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[name]) throw new Error(`공통 인증 값 누락: ${name}`);
  try {
    execFileSync(process.execPath, [cli, "env", "add", name, "production", "--force", "--scope", "buylife"], {
      cwd: app, input: env[name], stdio: ["pipe", "ignore", "pipe"],
    });
  } catch {
    throw new Error(`Vercel 인증 등록 실패: ${name} (비밀 보호를 위해 원문 출력 생략)`);
  }
  console.log(`등록 완료: ${name} (production)`);
}
