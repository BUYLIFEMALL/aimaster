// 분야별 요약의 연결과 이번 작업의 원문 보존을 로컬에서 확인합니다.
// --check-preservation은 2026-10-23 이전 본문 보존 검사이며 이후 정상 수정 시 실패할 수 있습니다.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const args = process.argv.slice(2);
const preservation = args.includes("--check-preservation");
const start = "<!-- GUIDELINES_SUMMARY_20261023 -->";
const end = "<!-- /GUIDELINES_SUMMARY_20261023 -->\n\n";
const names = ["COMMON", "DEVELOPMENT", "DESIGN", "DESIGN_TEMPLATES", "SUBPROGRAMS", "COST_AND_DEPLOY", "COLLABORATION", "KOREAN", "CONSOLIDATION", "ERROR_HANDLING"];
const baseline = JSON.parse(readFileSync(resolve(here, "evidence/source-baseline.json"), "utf8"));
const errors = [];
const summaries = readdirSync(here).filter((name) => name.endsWith(".md")).map((name) => resolve(here, name));
const files = [...summaries, resolve(root, "docs/PLAN_20261023_GUIDELINES_SUMMARY.md"), resolve(root, "docs/IMPROVEMENT_HANDOFF_20261023_GUIDELINES_SUMMARY.md"), resolve(root, "docs/MULTI_AGENT_SESSION_RULES.md")];
const hash = (raw) => createHash("sha256").update(raw).digest("hex");
let checkedLinks = 0;
for (const name of names) if (!existsSync(resolve(here, `${name}.md`))) errors.push(`분야 요약 없음: ${name}`);
const index = readFileSync(resolve(here, "README.md"), "utf8");
for (const name of names) if (!index.includes(`](${name}.md)`)) errors.push(`색인 연결 없음: ${name}`);
for (const file of files) {
  if (!existsSync(file)) { errors.push(`문서 없음: ${relative(root, file)}`); continue; }
  const body = readFileSync(file, "utf8");
  for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^[a-z][\w+.-]*:/i.test(target) || target.startsWith("#")) continue;
    const path = decodeURIComponent(target.split("#")[0]);
    if (!path) continue;
    checkedLinks++;
    if (!existsSync(resolve(dirname(file), path))) errors.push(`깨진 연결: ${relative(root, file)} -> ${target}`);
  }
}
const roots = [];
let shared;
for (const source of baseline.sources) {
  const raw = readFileSync(resolve(root, source.source));
  const text = raw.toString("utf8");
  const begin = text.indexOf(start);
  const boundary = text.indexOf(end, begin);
  if (begin < 0 || boundary < 0 || text.indexOf(start, begin + start.length) >= 0) { errors.push(`루트 요약 안내 없음/중복: ${source.source}`); continue; }
  const notice = text.slice(begin, boundary + end.length);
  if (shared !== undefined && shared !== notice) errors.push(`루트 안내 불일치: ${source.source}`);
  shared = notice;
  const byteStart = Buffer.byteLength(text.slice(0, begin));
  const byteEnd = byteStart + Buffer.byteLength(notice);
  const body = Buffer.concat([raw.subarray(0, byteStart), raw.subarray(byteEnd)]);
  const preserved = body.length === source.bytes && hash(body) === source.sha256;
  if (preservation && !preserved) errors.push(`원문 보존 불일치: ${source.source}`);
  roots.push({ source: source.source, originalBytes: source.bytes, currentBodyBytes: body.length, originalSha256: source.sha256, currentBodySha256: hash(body), originalBodyPreserved: preserved });
}
const result = { status: errors.length ? "fail" : "pass", scope: "2026-10-23 guideline summaries and optional original-body preservation", domains: names.length, checkedMarkdownFiles: files.length, checkedRelativeFileLinks: checkedLinks, rootNoticesIdentical: roots.length === 3 && !errors.some((e) => e.includes("루트")), preservationRequired: preservation, roots, errors };
if (args.includes("--write-report")) writeFileSync(resolve(here, "evidence/summary-checks.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
