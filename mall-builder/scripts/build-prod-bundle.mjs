// T0 운영 DB 적용 묶음 만들기 — supabase/migrations/*.sql 을 파일 이름 순서대로 합쳐 한 트랜잭션(전부 되거나 전부 안 됨)으로 만든다.
// Lab 전용 줄(lab_admin.register_program)은 「lab_admin 스키마가 있을 때만」으로 바꾼다(운영 DB에는 없음).
// 사용: node scripts/build-prod-bundle.mjs [--from 0058]  → supabase/prod-bundle/T0_prod_bundle.sql (저장소에 커밋하지 않아도 됨)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "supabase", "migrations");
const fromIdx = process.argv.indexOf("--from");
const from = fromIdx > 0 ? process.argv[fromIdx + 1] : null;

const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const picked = from ? files.filter((f) => f >= from) : files;
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;

let labLines = 0;
const parts = picked.map((f) => {
  // 줄바꿈은 LF로 맞춘다(2026-11-12: 윈도우 작업 폴더는 CRLF라 함수 본문 「정확히 한 번 바꾸기」 단계가 문구를 못 찾아 멈춤 — Lab은 LF로 적용됐음)
  let sql = readFileSync(join(dir, f), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (LAB_LINE.test(sql)) {
    labLines++;
    sql = sql.replace(LAB_LINE, "do $lab$ begin if to_regnamespace('lab_admin') is not null then perform lab_admin.register_program('mall-builder'); end if; end $lab$;");
  }
  if (/^\s*(commit|rollback)\s*;/im.test(sql)) throw new Error(`${f}: 파일 안에 commit/rollback 이 있어 한 트랜잭션으로 묶을 수 없습니다.`);
  return `-- ===== ${f} =====\n${sql.trimEnd()}\n`;
});

const out = [
  "-- AI 쇼핑몰 빌더 T0 운영 DB 적용 묶음 (자동 생성 — scripts/build-prod-bundle.mjs)",
  `-- 파일 ${picked.length}개: ${picked[0]} … ${picked.at(-1)}`,
  "-- 한 트랜잭션: 중간에 하나라도 실패하면 전부 되돌아간다.",
  "begin;",
  ...parts,
  "commit;",
  "",
].join("\n");

const outDir = join(root, "supabase", "prod-bundle");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, from ? `T0_prod_bundle_from_${from}.sql` : "T0_prod_bundle.sql");
writeFileSync(outFile, out);
console.log(`✔ ${outFile}\n  파일 ${picked.length}개 · ${out.split("\n").length}줄 · Lab 전용 줄 바꿈 ${labLines}개`);
