#!/usr/bin/env node
// AIMaster_dev Lab 프로그램 새로 만들기 — docs/AIMASTER_DEV_LAB_GUIDELINES.md 4-1
// 사용: node scripts/lab/new-lab.mjs <이름>   (이름: 영문 소문자·숫자·하이픈, 예: card-demo)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const name = process.argv[2];

if (!name || !/^[a-z][a-z0-9-]{1,40}$/.test(name)) {
  console.error("이름을 영문 소문자·숫자·하이픈으로 넣어 주세요. 예: node scripts/lab/new-lab.mjs card-demo");
  process.exit(1);
}

const templateDir = path.join(root, "labs", "_template");
const targetDir = path.join(root, "labs", name);
if (fs.existsSync(targetDir)) {
  console.error(`이미 있는 Lab입니다: labs/${name}`);
  process.exit(1);
}
if (fs.existsSync(path.join(root, name))) {
  console.error(`운영 프로그램 폴더와 이름이 겹칩니다: ${name}/ — 다른 이름을 써 주세요.`);
  process.exit(1);
}

const prefix = name.replace(/-/g, "_");
const skip = new Set(["node_modules", ".next", ".vercel"]);

function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copy(s, d);
    else {
      const text = fs.readFileSync(s, "utf8");
      fs.writeFileSync(d, text.replaceAll("__LAB_PREFIX__", prefix).replaceAll("__LAB_NAME__", name));
    }
  }
}

copy(templateDir, targetDir);

// Vercel 프로젝트 이름은 항상 "dev-<이름>" — 목록에서 운영(AIMaster) 프로젝트와 바로 구분(2026-10-19 주인님 지시).
// 도메인에는 밑줄(_)을 쓸 수 없어 "dev_"가 아니라 "dev-"를 쓴다. 처음 배포할 때 이 이름으로 프로젝트가 만들어진다.
const vercelProject = name.startsWith("dev-") ? name : `dev-${name}`;
fs.writeFileSync(
  path.join(targetDir, "lab.json"),
  JSON.stringify({ name, vercelProject, tablePrefix: `${prefix}_`, bucketPrefix: `${name}-` }, null, 2) + "\n",
);

console.log(`Lab을 만들었습니다: labs/${name}`);
console.log(`  테이블 이름표: ${prefix}_   버킷 이름표: ${name}-`);
console.log("다음 단계:");
console.log(`  1) labs/${name}/.env.example → .env.local 복사 후 AIMaster_dev 값 입력`);
console.log(`  2) labs/${name}/supabase/migrations/*.sql 을 AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용`);
console.log(`  3) cd labs/${name} && npm install && npm run dev`);
console.log(`  4) 배포: cd labs/${name} && vercel link --yes --project ${vercelProject} --scope buylife && vercel deploy --prod --yes --scope buylife`);
console.log(`     → 주소 https://${vercelProject}.vercel.app (이미 쓰이는 이름이면 Vercel이 뒤에 글자를 붙인다)`);
