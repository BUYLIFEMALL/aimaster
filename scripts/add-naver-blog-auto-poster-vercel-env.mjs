// 2026-10-15 naver-blog-auto-poster(App)·naver-blog-auto-poster-web(Web) 웹 화면 독립 분리: 새 Vercel 프로젝트 2개에 공용 DB 연결 3종을 등록한다.
// 값은 루트 .env.local에서 읽어 표준입력으로만 넘기고 출력하지 않는다.
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const env = Object.fromEntries(
  fs.readFileSync("D:/Antigravity/AIMaster/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
for (const [cwd, project] of [["naver-blog-auto-poster_app/web", "naver-blog-auto-poster"], ["naver-blog-auto-poster_web/web", "naver-blog-auto-poster-web"]]) {
  const dir = `D:/Antigravity/AIMaster/${cwd}`;
  const link = JSON.parse(fs.readFileSync(`${dir}/.vercel/project.json`, "utf8"));
  if (link.projectName !== project) throw new Error(`${cwd}: 연결된 프로젝트가 ${project}가 아닙니다.`);
  for (const [key, sensitive] of [["NEXT_PUBLIC_SUPABASE_URL", false], ["NEXT_PUBLIC_SUPABASE_ANON_KEY", false], ["SUPABASE_SERVICE_ROLE_KEY", true]]) {
    const args = ["env", "add", key, "production", "--force", "--scope", "buylife", ...(sensitive ? ["--sensitive"] : [])];
    const r = spawnSync("vercel", args, { cwd: dir, input: env[key], encoding: "utf8", shell: true, timeout: 90000 });
    console.log(`${project} ${key}: ${r.status === 0 ? "등록 완료(값 비공개)" : "실패"}`);
  }
}
