// 격리 사본의 로컬 서버를 띄운다 — 허용한 이름만으로 「새로 조립한」 환경을 자식 프로세스에 넘긴다(주변 셸 환경 상속 없음).
// 원본 설정 파일은 읽기만 하고 복사하지 않는다. 값은 출력하지 않는다. 만드는 파일은 서버 로그 하나뿐이다.
// 사용: node isolated-launch.cjs            → 서버 기동(127.0.0.1:3417)
//       node isolated-launch.cjs --dry      → 서버 대신 「자식이 받은 환경의 이름 목록」만 찍는 자식을 띄운다(값 없음)
// 메인 윈도우 PC 전용 경로다(공유 폴더의 .env.local과 격리 사본 폴더). 환경 조립 규칙 자체는 isolatedEnv.cjs에 있고 어느 장비에서나 시험된다.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { APP_ALLOW, buildChildEnv } = require("./isolatedEnv.cjs");

const SOURCE = "D:/AIMaster/ai-influencer-studio/.env.local"; // 읽기만 한다
const COPY = "D:/AIMaster-qa/aif-v2-20261119/ai-influencer-studio";
const LOG = path.join(process.env.TEMP || "C:/Windows/Temp", "v4_dev.log");
const EXPECT_HOST = "esgxyikcnnvmlhygjkth.supabase.co";
const DRY = process.argv.includes("--dry");

if (fs.existsSync(path.join(COPY, ".env.local")) || fs.existsSync(path.join(COPY, ".env"))) { console.log("중단: 사본에 접속 설정 파일이 있습니다"); process.exit(2); }

const all = {};
for (const line of fs.readFileSync(SOURCE, "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i <= 0 || line.trim().startsWith("#")) continue;
  all[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const picked = {};
for (const k of APP_ALLOW) if (all[k]) picked[k] = all[k];

let built;
try { built = buildChildEnv(process.env, picked); } catch (e) { console.log("중단:", e.message); process.exit(4); }
const { env, dropped } = built;

console.log("전달한 앱 이름:", Object.keys(picked).join(", "));
console.log("전달한 일반 이름 수:", Object.keys(env).length - Object.keys(picked).length);
console.log("버린 이름 수 — 주변 환경:", dropped.ambient, "| 원본 설정(허용 목록 밖):", Object.keys(all).length - Object.keys(picked).length);
let host = "";
try { host = new URL(picked.NEXT_PUBLIC_SUPABASE_URL || "").host; } catch { host = ""; }
console.log("대상이 운영 프로젝트인가:", host === EXPECT_HOST ? "예" : "아니오");
const hasPublic = !!(picked.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || picked.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const hasServer = !!(picked.SUPABASE_SECRET_KEY || picked.SUPABASE_SERVICE_ROLE_KEY);
console.log("공개 키:", hasPublic ? "있음" : "없음", "| 서버 키:", hasServer ? "있음" : "없음");
if (host !== EXPECT_HOST || !hasPublic || !hasServer) { console.log("중단: 조건이 맞지 않아 서버를 띄우지 않습니다"); process.exit(3); }

if (DRY) {
  // 자식이 실제로 받은 환경의 「이름」만 찍는다. 값은 찍지 않는다.
  const probe = "console.log(JSON.stringify(Object.keys(process.env).sort()))";
  const child = spawn(process.execPath, ["-e", probe], { cwd: COPY, env, stdio: ["ignore", "inherit", "inherit"], windowsHide: true });
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  const out = fs.openSync(LOG, "w");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3417", "-H", "127.0.0.1"], { cwd: COPY, env, stdio: ["ignore", out, out], windowsHide: true });
  console.log("서버 프로세스 번호:", child.pid, "| 로그:", LOG);
  child.on("exit", (code) => { console.log("서버 종료, 코드", code); process.exit(code ?? 0); });
}
