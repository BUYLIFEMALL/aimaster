// 크롬 확장 배포 검증 (루트 CLAUDE.md 핵심 원칙 10번, docs/EXTENSION_RELEASE_RULES.md)
// 사용: node scripts/check-extension-release.mjs [slug ...]   (slug를 생략하면 확장이 있는 5개 프로그램 전체)
// DB(programs)의 version / extension_version / extension_download_url 과 라이브 ZIP 안 manifest.json 이 모두 같은지 본다.
// 다른 의존 패키지 없이 동작한다(ZIP 중앙 디렉터리를 직접 읽음). 읽기 전용 — 아무것도 쓰지 않는다.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 확장이 있는 프로그램. 새 확장 프로그램을 만들면 여기에 추가한다.
const EXTENSION_PROGRAMS = ["naver-blog-agent", "ai-auto-blog", "naver-blog-seo-studio", "tistory-auto-blog", "naver-blog-auto-poster-web"];
// manifest에 version_name이 없는 예전 방식 프로그램(규칙 위반이지만 경고로만 표시). 현재는 없다 — 예외를 새로 만들지 않는다.
const LEGACY_NUMERIC = new Set([]);

function envValue(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    const m = fs.readFileSync(full, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

/** ZIP 안에서 가장 얕은 manifest.json을 읽는다. */
function readManifest(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP 형식이 아닙니다.");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("ZIP 중앙 디렉터리가 손상되었습니다.");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const hit = entries.filter((e) => /(^|\/)manifest\.json$/.test(e.name)).sort((a, b) => a.name.length - b.name.length)[0];
  if (!hit) throw new Error("ZIP 안에 manifest.json이 없습니다.");
  const lh = hit.localOffset;
  const dataStart = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28);
  const raw = buf.subarray(dataStart, dataStart + hit.compSize);
  const text = (hit.method === 8 ? zlib.inflateRawSync(raw) : raw).toString("utf8");
  return { manifest: JSON.parse(text.replace(/^﻿/, "")), path: hit.name };
}

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : EXTENSION_PROGRAMS;
const base = envValue("NEXT_PUBLIC_SUPABASE_URL");
// 비공개(숨김) 프로그램까지 보려면 서비스 키가 필요하다. 있으면 읽기 전용 조회에만 쓰고 출력하지 않는다.
const serviceKey = envValue("SUPABASE_SERVICE_ROLE_KEY");
const key = serviceKey || envValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!base || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 .env.local 또는 환경변수에서 찾지 못했습니다.");
  process.exit(2);
}

const res = await fetch(`${base}/rest/v1/programs?select=slug,version,extension_version,extension_download_url&slug=in.(${slugs.join(",")})`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) {
  console.error(`DB 조회 실패: HTTP ${res.status}`);
  process.exit(2);
}
const rows = new Map((await res.json()).map((r) => [r.slug, r]));

let failed = 0;
let warned = 0;
for (const slug of slugs) {
  const row = rows.get(slug);
  const problems = [];
  const warnings = [];
  let zipVersion = "-";
  if (!row) (serviceKey ? problems : warnings).push(serviceKey ? "programs 행이 없습니다." : "공개 키로는 이 프로그램 행을 읽을 수 없습니다(비공개 프로그램일 수 있음). SUPABASE_SERVICE_ROLE_KEY가 있으면 다시 확인합니다.");
  else {
    if (!row.extension_download_url) problems.push("DB extension_download_url 이 비어 있습니다.");
    if (!row.extension_version) problems.push("DB extension_version 이 비어 있습니다.");
    if (row.extension_download_url) {
      try {
        const zipRes = await fetch(row.extension_download_url, { redirect: "follow" });
        if (!zipRes.ok) problems.push(`다운로드 주소가 HTTP ${zipRes.status} 입니다.`);
        else {
          const { manifest } = readManifest(Buffer.from(await zipRes.arrayBuffer()));
          zipVersion = manifest.version_name || manifest.version || "?";
          if (row.extension_version && zipVersion !== row.extension_version) problems.push(`ZIP 안 버전(${zipVersion}) ≠ DB extension_version(${row.extension_version})`);
          if (!manifest.version_name) (LEGACY_NUMERIC.has(slug) ? warnings : problems).push("manifest에 version_name 이 없습니다(프로그램 버전 vX.YY 표기 필요).");
        }
      } catch (e) {
        problems.push(`ZIP 확인 실패: ${e.message}`);
      }
    }
    if (row.extension_version && row.version !== row.extension_version) (LEGACY_NUMERIC.has(slug) ? warnings : problems).push(`프로그램 버전(${row.version}) ≠ extension_version(${row.extension_version})`);
  }
  const status = problems.length ? "FAIL" : warnings.length ? "WARN" : "OK  ";
  if (problems.length) failed++;
  else if (warnings.length) warned++;
  console.log(`${status} ${slug.padEnd(28)} DB ${row?.version ?? "-"} / ext ${row?.extension_version ?? "-"} / zip ${zipVersion}${[...problems, ...warnings].map((m) => `\n       - ${m}`).join("")}`);
}
console.log(`\n${slugs.length}개 중 실패 ${failed}, 경고 ${warned}`);
process.exit(failed ? 1 : 0);
