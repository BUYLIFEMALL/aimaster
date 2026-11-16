#!/usr/bin/env node
// 뉴스 N-2(2026-11-17, RE-20261117-03): 지역 뉴스 거르기 측정 도구 — 읽기 전용.
// 지금 저장소의 거르기 규칙(src/lib/news/radarCore.ts pickCandidates, 운영 실행기와 같은 인자)을
// 이미 저장된 기사(real_estate_news_items)에 다시 적용해 「회차별 지역 저장 건수 → 지금 규칙이면 남는 건수」를 센다.
//
// 쓰는 법(real_estate_sales 폴더에서):
//   node scripts/news-noise-sim.mjs                         → 예시 자료로만 실행(DB·비밀값 불필요)
//   node scripts/news-noise-sim.mjs --db --from 2026-11-13 --to 2026-11-14
//   node scripts/news-noise-sim.mjs --db --from 2026-11-17 --region 서초   → 그 지역 빠진 기사 제목 표본
//   옵션: --env <파일>(기본 저장소 루트 .env.local), --samples <n>(표본 수, 기본 10)
//
// 한계(꼭 읽기): 저장분은 그 날 규칙으로 이미 거른 뒤다. 그래서 「지금 규칙이 더 빼는 것」만 잴 수 있고,
// 그 날 규칙이 빼서 저장되지 않은 기사(놓친 기사·더 남겨야 할 기사)는 잴 수 없다.
// 이미 걸러진 저장분이라 배포 전 측정치(원 검색 결과 기준)와 숫자가 다를 수 있다 — 기대값을 맞추려고 규칙을 바꾸지 않는다.
// 운영 실행기와 다른 점(runner.ts): 운영은 「지난 3일 제목」을 회원당 최대 2000건, 정렬 없이 읽고(지역 무관하게 읽은 뒤 지역별로 나눔),
// 이 도구는 같은 회원·같은 지역의 회차 앞 72시간 저장분을 상한 없이 모두 쓴다. 회원당 하루 저장은 지역 5곳 × 많아야 수십 건이라
// 3일 2000건에 닿지 않는 동안은 같은 결과다 — 2000건을 넘는 회원이 생기면 두 결과가 다를 수 있다.
// 자체 점검: node --no-warnings scripts/news-noise-sim.mjs --selftest (운영 DB 호출 없음)
// 지킬 것: DB는 select만. 회원 ID·키·토큰은 출력하지 않고 지역 집계와 일반 뉴스 제목만 보여 준다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pickCandidates, regionTerms } from "../src/lib/news/radarCore.ts";
import { NEWS_DONGS } from "../src/lib/news/dongNames.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const VALUE_FLAGS = ["--from", "--to", "--region", "--samples", "--env"];
for (const a of args) {
  if (a.startsWith("--") && ![...VALUE_FLAGS, "--db", "--selftest"].includes(a)) fail(`모르는 옵션입니다: ${a}`);
}
const opt = (name, def = null) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  const EX = { "--from": "--from 2026-11-17", "--to": "--to 2026-11-17", "--region": "--region 서초", "--samples": "--samples 10", "--env": "--env ../.env.local" };
  if (!v || v.startsWith("--")) fail(`${name} 뒤에 값을 주세요(예: ${EX[name]}).`);
  return v;
};
const useDb = args.includes("--db");
const today = kstDate(new Date());
const FIXTURE_DATE = "2026-11-14"; // 예시 자료의 회차 날짜(KST)
const from = opt("--from", useDb ? today : FIXTURE_DATE);
const to = opt("--to", from);
const regionFilter = opt("--region");
const samples = Number(opt("--samples", "10"));
const envFile = opt("--env", path.resolve(here, "../../.env.local"));
for (const d of [from, to]) {
  const t = Date.parse(`${d}T00:00:00Z`);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d;
  if (!ok) fail(`날짜는 실제 있는 날짜를 YYYY-MM-DD(KST)로 주세요: ${d}`);
}
if (!Number.isInteger(samples) || samples < 0) fail("--samples는 0 이상의 정수로 주세요.");
if (from > to) fail("--from이 --to보다 늦습니다.");

function fail(msg) {
  console.error(`오류: ${msg}`);
  process.exit(1);
}
/** 정렬이 고정된 조회를 size씩 끝까지 이어 읽는다(마지막 쪽이 size보다 적으면 끝) */
async function fetchAllPages(fetchPage, size = 1000) {
  const out = [];
  for (let offset = 0; ; offset += size) {
    const page = await fetchPage(offset, size);
    out.push(...page);
    if (page.length < size) return out;
  }
}
/** --selftest: 운영 DB 없이 1000건 경계·같은 시각 대량 동률에서 빠짐·겹침이 없는지 모의 응답으로 확인 */
async function selfTest() {
  const at = "2026-11-17T00:00:00Z";
  const rows = Array.from({ length: 2500 }, (_, i) => ({ id: `id-${String(i).padStart(5, "0")}`, created_at: at }));
  // DB의 order=created_at.asc,id.asc 를 흉내: 매 호출마다 섞인 원본을 같은 열쇠로 정렬한 뒤 자른다
  const sorted = () => [...rows].sort(() => Math.random() - 0.5).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const got = await fetchAllPages(async (offset, size) => sorted().slice(offset, offset + size), 1000);
  const ids = new Set(got.map((r) => r.id));
  const exact = await fetchAllPages(async (offset, size) => sorted().slice(offset, offset + size), 1250); // 쪽 크기로 딱 나눠지는 경우(마지막 빈 쪽)
  const ok = got.length === 2500 && ids.size === 2500 && got.every((r, i) => r.id === `id-${String(i).padStart(5, "0")}`) && exact.length === 2500;
  console.log(`자체 점검(운영 DB 호출 없음): 동률 2500건·1000건씩 → ${got.length}건·중복 없는 ${ids.size}건, 1250건씩 → ${exact.length}건 — ${ok ? "통과" : "실패"}`);
  process.exit(ok ? 0 : 1);
}
function kstDate(d) {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
/** KST 날짜 시작 → UTC ISO */
function kstStartIso(date, addDays = 0) {
  const t = Date.parse(`${date}T00:00:00+09:00`) + addDays * 24 * 3600 * 1000;
  return new Date(t).toISOString();
}

// 예시 자료(실제 기사 아님) — 규칙 네 가지가 도는지 비밀값 없이 확인한다
const FIXTURE = [
  { u: "a", sgg_cd: "11650", sgg_nm: "서초구", title: "서초구 반포 재건축 조합 총회 열려", snippet: "서울 서초구 반포동 한 재건축 단지가 총회를 열었다.", d: "2026-11-13T23:01:00Z" },
  { u: "a", sgg_cd: "11650", sgg_nm: "서초구", title: "[건설 브리핑] 대형 건설사 소식 모음", snippet: "서초구 사옥에서 행사를 열었다.", d: "2026-11-13T23:01:00Z" },
  { u: "a", sgg_cd: "11650", sgg_nm: "서초구", title: "수도권 아파트값 주간 동향", snippet: "강남구와 서초구의 전셋값이 각각 0.2% 올랐다.", d: "2026-11-13T23:01:00Z" },
  { u: "a", sgg_cd: "11650", sgg_nm: "서초구", title: "전국 학군 수요 조사", snippet: "서초구(21.9%), 강남구(20.1%) 순이었다.", d: "2026-11-13T23:01:00Z" },
  { u: "a", sgg_cd: "11650", sgg_nm: "서초구", title: "방배 재건축 이주 시작", snippet: "강남구와 서초구 등 여러 곳에서 이주가 이어지는 가운데 방배동 정비구역 이주가 시작됐다.", d: "2026-11-13T23:01:00Z" },
];

async function loadDb() {
  if (!fs.existsSync(envFile)) fail(`접속 설정 파일이 없습니다: ${envFile}`);
  const env = Object.fromEntries(
    fs.readFileSync(envFile, "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail("접속 설정에 주소·서버 키 이름이 없습니다(값은 출력하지 않음).");
  // 지난 3일 제목(운영 실행기의 recentTitles)을 맞추려고 3일 앞부터 읽는다
  const gte = kstStartIso(from, -3);
  const lt = kstStartIso(to, 1);
  // 같은 created_at이 많아도 페이지 사이에 빠지거나 겹치지 않게 id로 순서를 고정한다(id = 표의 기본 키 uuid)
  const out = await fetchAllPages(async (offset, size) => {
    const q = `${url}/rest/v1/real_estate_news_items?select=user_id,sgg_cd,sgg_nm,title,link,snippet,published_at,created_at&created_at=gte.${gte}&created_at=lt.${lt}&order=created_at.asc,id.asc&limit=${size}&offset=${offset}`;
    const r = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) fail(`DB 읽기 실패 HTTP ${r.status}`);
    return r.json();
  });
  return out.map((x) => ({ u: x.user_id, sgg_cd: x.sgg_cd, sgg_nm: x.sgg_nm, title: x.title, snippet: x.snippet ?? "", link: x.link, pub: x.published_at, d: x.created_at }));
}

if (args.includes("--selftest")) await selfTest();
const rows = useDb ? await loadDb() : FIXTURE.map((x, i) => ({ ...x, link: `https://example.com/${i}`, pub: null }));
const inRange = (r) => kstDate(new Date(r.d)) >= from && kstDate(new Date(r.d)) <= to;

// 회차 = 같은 회원·같은 지역·같은 KST 날짜(뉴스는 하루 1번)
const batches = new Map();
for (const r of rows.filter(inRange)) {
  const k = `${r.u}|${r.sgg_cd}|${kstDate(new Date(r.d))}`;
  batches.set(k, [...(batches.get(k) ?? []), r]);
}

const perRegion = new Map(); // "날짜|지역" → { stored, kept, dropped: [] }
for (const [k, items] of batches) {
  const [u, sggCd, date] = k.split("|");
  const sggNm = items[0].sgg_nm;
  const now = new Date(Math.max(...items.map((x) => Date.parse(x.d))));
  // 회차 앞 3일 같은 회원·지역 제목 = 운영 실행기의 recentTitles
  const since = now.getTime() - 3 * 24 * 3600 * 1000;
  const recent = rows.filter((x) => x.u === u && x.sgg_cd === sggCd && Date.parse(x.d) >= since && kstDate(new Date(x.d)) < date).map((x) => x.title);
  const raw = items.map((x) => ({ title: x.title, link: x.link, description: x.snippet, pubDate: x.pub ?? undefined }));
  const kept = pickCandidates([{ category: "개발", items: raw }], regionTerms(sggCd, sggNm, NEWS_DONGS[sggCd]), now, recent);
  const keptLinks = new Set(kept.map((c) => c.link));
  const key = `${date}|${sggNm}`;
  const agg = perRegion.get(key) ?? { stored: 0, kept: 0, dropped: [] };
  agg.stored += items.length;
  agg.kept += kept.length;
  for (const it of raw) if (!keptLinks.has(it.link)) agg.dropped.push(it.title);
  perRegion.set(key, agg);
}

console.log(`측정 기준: 저장소 radarCore.ts pickCandidates(동 이름·지난 3일 제목 포함, 운영 실행기와 같은 인자)`);
console.log(`자료: ${useDb ? "운영 DB 저장분(읽기만)" : "예시 자료(실제 기사 아님)"} · 기간(KST) ${from} ~ ${to} · 조회 시각 ${new Date().toISOString()}`);
console.log(`한계: 저장분은 그 날 규칙으로 이미 거른 뒤라 「더 빼는 것」만 잼. 놓친 기사는 잴 수 없음.`);
console.log(`회차(회원·지역·날짜) ${batches.size}개 · 저장 기사 ${[...batches.values()].reduce((s, b) => s + b.length, 0)}건\n`);
console.log("날짜(KST)   지역                 저장 → 지금 규칙 남음 (빠짐)");
for (const [key, v] of [...perRegion].sort()) {
  const [date, nm] = key.split("|");
  console.log(`${date}  ${nm.padEnd(18)} ${String(v.stored).padStart(4)} → ${String(v.kept).padStart(4)} (${v.stored - v.kept})`);
  if (regionFilter && nm.includes(regionFilter)) for (const t of v.dropped.slice(0, samples)) console.log(`      빠짐: ${t.slice(0, 70)}`);
}
