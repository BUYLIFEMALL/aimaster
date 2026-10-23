#!/usr/bin/env node
// AIMaster_dev Lab 프로그램 삭제 — docs/AIMASTER_DEV_LAB_GUIDELINES.md 4-3
// 사용: node scripts/lab/delete-lab.mjs <이름>         지울 목록만 출력(아무것도 지우지 않음)
//       node scripts/lab/delete-lab.mjs <이름> --yes   실제 삭제
//
// 선택 환경변수(주인님 PC에만 등록, 저장소에 넣지 않음):
//   LAB_DB_URL                 AIMaster_dev Postgres 연결 문자열 — 있고 pg 라이브러리를 찾으면 테이블을 직접 지운다
//   LAB_SUPABASE_SECRET_KEY    AIMaster_dev 서버 키 — 있으면 Storage 버킷을 비우고 지운다
// 없으면 실행할 SQL·할 일을 출력만 한다(에이전트는 Supabase MCP execute_sql 을 project_id=rjjtjakljjxsgjelqgek 로 실행).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEV_REF = "rjjtjakljjxsgjelqgek";
const PROD_REF = "esgxyikcnnvmlhygjkth";
const DEV_URL = `https://${DEV_REF}.supabase.co`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const name = process.argv[2];
const yes = process.argv.includes("--yes");

if (!name || !/^[a-z][a-z0-9-]{1,40}$/.test(name)) {
  console.error("이름을 넣어 주세요. 예: node scripts/lab/delete-lab.mjs card-demo");
  process.exit(1);
}
const labDir = path.join(root, "labs", name);
if (!fs.existsSync(labDir)) {
  console.error(`Lab 폴더가 없습니다: labs/${name}`);
  process.exit(1);
}

const prefix = `${name.replace(/-/g, "_")}_`;
const bucketPrefix = `${name}-`;

// 1) 마이그레이션의 create table 문에서 지울 테이블 찾기(목록 표시용 — 실제 삭제는 DB의 drop_program이 이름표 기준으로 한다)
const migDir = path.join(labDir, "supabase", "migrations");
const tables = new Set();
const skipped = new Set();
if (fs.existsSync(migDir)) {
  for (const f of fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"))) {
    const sql = fs.readFileSync(path.join(migDir, f), "utf8");
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?public"?\.)?"?([a-z0-9_]+)"?/gi)) {
      const t = m[1].toLowerCase();
      (t.startsWith(prefix) ? tables : skipped).add(t);
    }
  }
}
// 이름표가 붙은 테이블·뷰·함수를 모두 지우고 등록부에 삭제 표시(labs/_platform/migrations/0001_lab_admin.sql)
const dropSql = `select lab_admin.drop_program('${name}');`;

// 2) Vercel 프로젝트 이름(.vercel/project.json → lab.json → 규칙 "dev-<이름>")
let vercelProject = name.startsWith("dev-") ? name : `dev-${name}`;
try {
  vercelProject = JSON.parse(fs.readFileSync(path.join(labDir, "lab.json"), "utf8")).vercelProject ?? vercelProject;
} catch {}
try {
  vercelProject = JSON.parse(fs.readFileSync(path.join(labDir, ".vercel", "project.json"), "utf8")).projectName ?? vercelProject;
} catch {}
if (!vercelProject.startsWith("dev-")) {
  console.error(`Vercel 프로젝트 이름이 "dev-"로 시작하지 않습니다(${vercelProject}). 운영 프로젝트 보호를 위해 중단합니다.`);
  process.exit(1);
}

console.log(`\n[Lab 삭제 대상] ${name}  (DB: AIMaster_dev ${DEV_REF})`);
console.log(`  테이블(${tables.size}): ${[...tables].join(", ") || "없음"}`);
if (skipped.size) console.log(`  이름표가 달라 건너뜀(직접 확인): ${[...skipped].join(", ")}`);
console.log(`  Storage 버킷: "${bucketPrefix}"로 시작하는 버킷`);
console.log(`  Vercel 프로젝트: ${vercelProject} (팀 buylife)`);
console.log(`  폴더: labs/${name}`);

if (!yes) {
  console.log("\n목록만 확인했습니다. 실제로 지우려면 끝에 --yes 를 붙여 다시 실행하세요.");
  process.exit(0);
}

const leftovers = [];

// 3) DB 테이블
{
  const dbUrl = process.env.LAB_DB_URL ?? "";
  if (dbUrl && (dbUrl.includes(PROD_REF) || !dbUrl.includes(DEV_REF))) {
    console.error("LAB_DB_URL이 AIMaster_dev 주소가 아닙니다(운영 DB 보호). 중단합니다.");
    process.exit(1);
  }
  let pg = null;
  if (dbUrl) {
    for (const base of [labDir, root, path.join(root, "threads")]) {
      try {
        pg = createRequire(path.join(base, "package.json"))("pg");
        break;
      } catch {}
    }
  }
  if (dbUrl && pg) {
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();
    await client.query(dropSql);
    await client.end();
    console.log("이름표가 붙은 DB 객체를 지웠습니다.");
  } else {
    leftovers.push(`AIMaster_dev(ref ${DEV_REF}) SQL 편집기 또는 MCP execute_sql 로 실행:\n${dropSql}`);
  }
}

// 4) Storage 버킷
const secret = process.env.LAB_SUPABASE_SECRET_KEY ?? "";
if (secret) {
  const headers = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
  const res = await fetch(`${DEV_URL}/storage/v1/bucket`, { headers });
  const buckets = res.ok ? (await res.json()).filter((b) => b.id.startsWith(bucketPrefix)) : [];
  for (const b of buckets) {
    await fetch(`${DEV_URL}/storage/v1/bucket/${b.id}/empty`, { method: "POST", headers });
    const del = await fetch(`${DEV_URL}/storage/v1/bucket/${b.id}`, { method: "DELETE", headers });
    console.log(`버킷 ${b.id}: ${del.ok ? "삭제" : `실패(${del.status})`}`);
  }
  if (!res.ok) leftovers.push(`버킷 목록 조회 실패(${res.status}) — 대시보드 Storage에서 "${bucketPrefix}" 버킷을 지워 주세요.`);
} else {
  leftovers.push(`버킷: AIMaster_dev 대시보드 Storage에서 "${bucketPrefix}"로 시작하는 버킷이 있으면 비우고 지워 주세요.`);
}

// 5) Vercel 프로젝트
if (fs.existsSync(path.join(labDir, ".vercel"))) {
  const r = spawnSync("vercel", ["project", "rm", vercelProject, "--scope", "buylife"], {
    input: "y\n",
    encoding: "utf8",
    shell: true,
  });
  console.log(r.status === 0 ? `Vercel 프로젝트 ${vercelProject}를 지웠습니다.` : (r.stderr || r.stdout).trim());
  if (r.status !== 0) leftovers.push(`Vercel 프로젝트 ${vercelProject}를 직접 지워 주세요: vercel project rm ${vercelProject} --scope buylife`);
} else {
  console.log("배포한 적이 없어(.vercel 없음) Vercel 프로젝트 삭제는 건너뜁니다.");
}

// 6) 폴더
fs.rmSync(labDir, { recursive: true, force: true });
console.log(`폴더 labs/${name}를 지웠습니다.`);

if (leftovers.length) {
  console.log("\n[남은 할 일]");
  for (const l of leftovers) console.log(`- ${l}`);
}
