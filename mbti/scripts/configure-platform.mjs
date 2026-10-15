// 공용 DB 연결값 3종을 성격코드(mbti) Vercel 프로젝트에 등록한다(2026-10-16 주인님 지시: 성격코드도 로그인·권한 판정 적용).
// Credentials stay in memory/stdin or the ignored .env.local; never print them.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
if (!process.argv.includes("--approved")) throw new Error("운영 연결 승인(2026-10-15) 후 --approved로 실행하세요.");
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.dirname(app);
const link = JSON.parse(fs.readFileSync(path.join(app, ".vercel/project.json"), "utf8"));
if (link.projectName !== "mbti" || link.projectId !== "prj_6qDvramU9GzOqKssqtw8yA3u6BHH" || link.orgId !== "team_orq6xPe9P3c1uMQdKlJsQ6k9") throw new Error("배포 프로젝트가 다릅니다. 연결을 확인하세요.");
const envText = fs.readFileSync(path.join(repo, ".env.local"), "utf8");
const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const values = Object.fromEntries(names.map(name => {
  const line = envText.split(/\r?\n/).find(x => x.startsWith(name + "="));
  let value = line?.slice(name.length + 1).trim();
  if (value && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) value = value.slice(1, -1);
  if (!value || /[\r\n]/.test(value)) throw new Error(`${name} 기존 연결 값이 없습니다.`);
  return [name, value];
}));
if (new URL(values.NEXT_PUBLIC_SUPABASE_URL).hostname !== "esgxyikcnnvmlhygjkth.supabase.co") throw new Error("공용 DB 주소가 다릅니다.");
const target = path.join(app, ".env.local");
const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
const kept = existing.split(/\r?\n/).filter(line => !names.some(n => line.startsWith(n + "="))).join("\n").trimEnd();
fs.writeFileSync(target, kept + "\n" + names.map(n => `${n}=${JSON.stringify(values[n])}`).join("\n") + "\n", { mode: 0o600 });
const cli = path.join(process.env.APPDATA, "npm/node_modules/vercel/dist/index.js");
if (!fs.existsSync(cli)) throw new Error("설치된 Vercel CLI 경로를 확인하세요.");
for (const name of names) {
  for (const environment of ["production", "development"]) {
    const args = [cli, "env", "add", name, environment, "--yes", "--scope", "buylife", "--project", link.projectId, "--cwd", app];
    if (environment === "production" && name === "SUPABASE_SERVICE_ROLE_KEY") args.push("--sensitive");
    const result = spawnSync(process.execPath, args, { cwd: app, input: values[name] + "\n", encoding: "utf8", timeout: 90_000 });
    if (result.status !== 0) throw new Error(`${name} ${environment} 등록 실패. 값은 출력하지 않았습니다. 환경변수 목록과 권한을 확인하세요.`);
    console.log(`${name} · ${environment} 등록 완료 (값 비공개)`);
  }
}
console.log("공용 연결 3종 등록 완료. 회원 AI API 키는 등록하지 않았습니다.");
