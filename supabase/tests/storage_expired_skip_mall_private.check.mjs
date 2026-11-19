// 0076(member_storage_expired_files에서 mall-builder-private 제외) 합성 시험 — 전용 로컬 fixture에서만 돈다.
// 운영·Lab·공유 DB에는 접속하지 않는다: 호스트는 127.0.0.1만, DB 이름은 aimaster_storage_fx_ 로 시작해야 하며
// 스크립트가 직접 만들고(표식 주석) 끝나면 OID·이름·표식을 대조한 뒤 지운다. 실제 회원 자료·실제 파일은 쓰지 않는다.
//
// 사용:
//   node supabase/tests/storage_expired_skip_mall_private.check.mjs show   ← 목적지만 출력(비밀번호 출력 안 함)
//   STORAGE_FX_PG_PASSWORD=<로컬 컨테이너 관리 비밀번호> node supabase/tests/storage_expired_skip_mall_private.check.mjs run
// 선택 환경변수: STORAGE_FX_PG_PORT(기본 55432) · STORAGE_FX_PG_USER(기본 postgres) · STORAGE_FX_DB(기본 aimaster_storage_fx_0076)
//
// 시험 대상 함수 정의는 마이그레이션 파일(0073·0076)을 그대로 읽어 실행한다. 나머지(profiles·정책 함수·storage.objects)는 합성 대역이다.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOST = '127.0.0.1';
const PORT = Number(process.env.STORAGE_FX_PG_PORT ?? 55432);
const USER = process.env.STORAGE_FX_PG_USER ?? 'postgres';
const NAME = process.env.STORAGE_FX_DB ?? 'aimaster_storage_fx_0076';
const MARK = 'B2B-20261119-MALL-STORAGE 0076 합성 fixture(실제 회원·파일 없음)';
if (!/^aimaster_storage_fx_[a-z0-9_]{1,40}$/.test(NAME)) throw new Error('목적지 거절: DB 이름은 aimaster_storage_fx_ 로 시작해야 합니다');

const mode = process.argv[2];
if (mode === 'show') {
  console.log(JSON.stringify({ 호스트: HOST, 포트: PORT, DB이름: NAME, 표식: MARK, 계정: USER, 비밀번호: '<출력 안 함>' }));
  process.exit(0);
}
if (mode !== 'run') throw new Error('사용: show | run');
const password = process.env.STORAGE_FX_PG_PASSWORD;
if (!password) throw new Error('STORAGE_FX_PG_PASSWORD가 필요합니다(값은 출력하지 않습니다)');

// 저장소 루트에는 DB 드라이버가 없어 워크스페이스 폴더의 것을 빌려 쓴다(읽기만).
const require = createRequire(pathToFileURL(resolve(ROOT, 'ai-work-workspace', 'package.json')).href);
const postgres = require('postgres');
const opt = { host: HOST, port: PORT, username: USER, password, max: 1, onnotice: () => {} };
const mig = (f) => readFileSync(resolve(ROOT, 'supabase', 'migrations', f), 'utf8');

// 합성 식별자(고정 값 — 실제 회원과 무관)
const A = 'aaaaaaaa-0000-4000-8000-000000000001'; // 보관 연장: 생성 30일 / 포스팅 90일
const B = 'bbbbbbbb-0000-4000-8000-000000000002'; // 보관 연장: 생성 60일 / 포스팅 180일
const C = 'cccccccc-0000-4000-8000-000000000003'; // 일반 회원(연장 아님)
const D = 'dddddddd-0000-4000-8000-000000000004'; // 관리자 수동 지정(무기한 취급)
const E = 'eeeeeeee-0000-4000-8000-000000000005'; // 연장이지만 기간 없음(무기한)
const STORE = '11111111-0000-4000-8000-0000000000aa';
const SUPPLIER_ROW = '22222222-0000-4000-8000-0000000000bb'; // 공급사 표의 행 번호(회원 id 아님)
const RAND = '33333333-0000-4000-8000-0000000000cc';
const PROPOSAL = '44444444-0000-4000-8000-0000000000dd';
const APPLY = '55555555-0000-4000-8000-0000000000ee';

// [버킷, 이름, 며칠 전, 설명, 0073에서 후보?, 0076에서 후보?]
const OBJECTS = [
  ['mall-builder-private', `${STORE}/${A}/business-cert-1.pdf`, 400, 'A 사업자등록증', true, false],
  ['mall-builder-private', `${STORE}/${A}/reseller-apply-bankbook-1.jpg`, 400, 'A 리셀러 통장 사본', true, false],
  ['mall-builder-private', `${STORE}/${A}/reseller-apply-doc-1.pdf`, 400, 'A 리셀러 서류', true, false],
  ['mall-builder-private', `${STORE}/${B}/supplier-apply-1.pdf`, 400, 'B 공급사 신청 서류', true, false],
  ['mall-builder-private', `${STORE}/${A}/business-cert-2.pdf`, 10, 'A 최근 서류(기간 전)', false, false],
  ['mall-builder-private', `${STORE}/${C}/business-cert-1.pdf`, 400, 'C 일반 회원 서류', false, false],
  ['mall-builder-private', `${STORE}/${D}/business-cert-1.pdf`, 400, 'D 수동 지정 회원 서류', false, false],
  ['mall-builder-private', `${STORE}/${E}/business-cert-1.pdf`, 400, 'E 무기한 회원 서류', false, false],
  ['workspace-files', `${A}/${RAND}/note.png`, 400, 'A 워크스페이스 첨부(0073 제외 유지)', false, false],
  ['blog-images', `${A}/old.png`, 400, 'A 추적 안 하는 버킷(포스팅 90일 적용)', true, true],
  ['blog-images', `${A}/mid.png`, 60, 'A 추적 안 하는 버킷 60일(90일 전)', false, false],
  ['insta-media', `${A}/not-posted-60d.png`, 60, 'A 추적 버킷·미포스팅 60일(생성 30일 적용)', true, true],
  ['insta-media', `${A}/posted-60d.png`, 60, 'A 추적 버킷·포스팅됨 60일(포스팅 90일 적용)', false, false],
  ['insta-media', `${B}/not-posted-45d.png`, 45, 'B 추적 버킷·미포스팅 45일(생성 60일 전)', false, false],
  ['insta-media', `${B}/not-posted-70d.png`, 70, 'B 추적 버킷·미포스팅 70일', true, true],
  ['mall-builder-public', `${STORE}/products/${RAND}.jpg`, 400, '몰 상품 사진(회원 id 없음)', false, false],
  ['mall-builder-public', `${STORE}/supplier/${SUPPLIER_ROW}/${RAND}.jpg`, 400, '공급사 상품 사진(행 번호, 회원 id 없음)', false, false],
  ['mall-builder-public', `${STORE}/banners/${RAND}.png`, 400, '몰 배너', false, false],
  ['mall-builder-proposals', `${STORE}/${PROPOSAL}.jpg`, 400, '사진 제안', false, false],
  ['mall-builder-applied', `${STORE}/${APPLY}.k1.${'ab'.repeat(32)}.${'cd'.repeat(16)}.jpg`, 400, '적용 사진', false, false],
  // 남는 위험을 드러내는 가정 사례: 나중에 다른 몰 버킷 경로에 회원 id가 들어가면 0076(private만 제외)으로는 막히지 않는다.
  ['mall-builder-public', `${STORE}/${A}/hypothetical.jpg`, 400, '[가정] 공개 버킷 경로에 회원 id', true, true],
];

const key = (r) => `${r.bucket_id}|${r.name}|${r.user_id}`;
const expected = (col) => OBJECTS.filter((o) => o[col]).map((o) => `${o[0]}|${o[1]}|${[A, B, C, D, E].find((u) => o[1].includes(u))}`).sort();
let fail = 0;
const check = (label, ok, detail = '') => { console.log(`${ok ? '통과' : '실패'}  ${label}${ok || !detail ? '' : `\n      ${detail}`}`); if (!ok) fail++; };
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const admin = postgres({ ...opt, database: 'postgres' });
let oid = null;
const madeRoles = []; // 역할은 컨테이너 전체에 남으므로, 이 시험이 새로 만든 것만 끝에 지운다
try {
  const had = await admin`select 1 from pg_database where datname = ${NAME}`;
  if (had.length) throw new Error('같은 이름의 DB가 이미 있습니다 — 중단(덮어쓰지 않음)');
  await admin.unsafe(`create database ${NAME}`);
  await admin.unsafe(`comment on database ${NAME} is '${MARK}'`);
  oid = (await admin`select oid from pg_database where datname = ${NAME}`)[0].oid;
  console.log(`fixture 만듦: ${NAME} (oid ${oid}, ${HOST}:${PORT})`);

  const sql = postgres({ ...opt, database: NAME });
  try {
    // 합성 대역 — 함수가 읽는 것만 최소로
    for (const r of ['anon', 'authenticated', 'service_role']) {
      if ((await admin`select 1 from pg_roles where rolname = ${r}`).length) continue;
      await admin.unsafe(`create role ${r} nologin`);
      madeRoles.push(r);
    }
    await sql.unsafe(`
      create schema storage;
      create table storage.objects (bucket_id text not null, name text not null, created_at timestamptz not null, primary key (bucket_id, name));
      create table public.profiles (id uuid primary key, retention_exempt boolean not null default false, retention_exempt_manual boolean not null default false);
      create table public.fx_policy (id uuid primary key, retention_days integer, posted_retention_days integer);
      create function public.member_storage_policy(uid uuid) returns table(retention_days integer, posted_retention_days integer)
        language sql stable as $f$ select f.retention_days, f.posted_retention_days from public.fx_policy f where f.id = uid $f$;
      create table public.member_posted_assets (bucket_id text not null, object_name text not null, primary key (bucket_id, object_name));
      create table public.storage_posting_tracked_buckets (bucket_id text primary key);
    `).simple();
    await sql`insert into public.profiles ${sql([
      { id: A, retention_exempt: true, retention_exempt_manual: false },
      { id: B, retention_exempt: true, retention_exempt_manual: false },
      { id: C, retention_exempt: false, retention_exempt_manual: false },
      { id: D, retention_exempt: true, retention_exempt_manual: true },
      { id: E, retention_exempt: true, retention_exempt_manual: false },
    ])}`;
    await sql`insert into public.fx_policy ${sql([
      { id: A, retention_days: 30, posted_retention_days: 90 },
      { id: B, retention_days: 60, posted_retention_days: 180 },
      { id: C, retention_days: 30, posted_retention_days: 30 },
      { id: D, retention_days: 30, posted_retention_days: 90 },
      { id: E, retention_days: null, posted_retention_days: null },
    ])}`;
    await sql`insert into public.storage_posting_tracked_buckets ${sql([{ bucket_id: 'insta-media' }])}`;
    await sql`insert into public.member_posted_assets ${sql([{ bucket_id: 'insta-media', object_name: `${A}/posted-60d.png` }])}`;
    for (const [bucket, name, days] of OBJECTS) {
      await sql`insert into storage.objects (bucket_id, name, created_at) values (${bucket}, ${name}, now() - make_interval(days => ${days}))`;
    }
    const meta = async () => (await sql`
      select p.prosecdef, p.provolatile, p.proconfig::text as cfg, pg_get_function_result(p.oid) as res,
             pg_get_function_arguments(p.oid) as args, coalesce(p.proacl::text, '') as acl
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'member_storage_expired_files'`)[0];
    const run = async (n = 500) => (await sql`select * from public.member_storage_expired_files(${n})`).map(key).sort();
    const objectCount = async () => (await sql`select count(*)::int as n from storage.objects`)[0].n;

    // 1) 기준: 0073 정의 + 0068의 권한 문장
    await sql.unsafe(mig('0073_storage_expired_skip_workspace_files.sql')).simple();
    await sql.unsafe(`revoke all on function public.member_storage_expired_files(integer) from public, anon, authenticated;
                      grant execute on function public.member_storage_expired_files(integer) to service_role;`).simple();
    const before = await run();
    const metaBefore = await meta();
    check('기준(0073): 후보가 기대와 같다 — mall-builder-private 서류 4건이 후보에 들어 있음(문제 재현)', same(before, expected(4)), `실제 ${JSON.stringify(before)}`);

    // 2) 후보: 0076 적용
    await sql.unsafe(mig('0076_storage_expired_skip_mall_private.sql')).simple();
    const after = await run();
    const metaAfter = await meta();
    check('0076: 후보가 기대와 같다', same(after, expected(5)), `실제 ${JSON.stringify(after)}`);
    check('0076: mall-builder-private 후보 0건', after.every((k) => !k.startsWith('mall-builder-private|')));
    const dropped = before.filter((k) => !after.includes(k));
    check('0076: 빠진 것은 mall-builder-private 4건뿐', dropped.length === 4 && dropped.every((k) => k.startsWith('mall-builder-private|')), JSON.stringify(dropped));
    check('0076: 새로 생긴 후보 없음', after.every((k) => before.includes(k)));
    check('회귀: 다른 버킷 후보는 그대로', same(before.filter((k) => !k.startsWith('mall-builder-private|')), after));
    check('회귀: workspace-files 후보 0건 유지', after.every((k) => !k.startsWith('workspace-files|')));
    check('회귀: 회원 id가 없는 쇼핑몰 버킷은 앞뒤 모두 후보 아님',
      [before, after].every((s) => s.every((k) => !/^mall-builder-(proposals|applied)\|/.test(k) && !/\/(products|supplier|banners)\//.test(k))));
    check('남는 위험(가정 사례): 다른 몰 버킷 경로에 회원 id가 들어가면 0076 뒤에도 후보로 남는다',
      after.includes(`mall-builder-public|${STORE}/${A}/hypothetical.jpg|${A}`));
    check('함수 속성 그대로(SECURITY DEFINER·STABLE·search_path·반환 열·인자)',
      metaAfter.prosecdef === true && metaAfter.provolatile === 's' && metaAfter.cfg === metaBefore.cfg && metaAfter.res === metaBefore.res && metaAfter.args === metaBefore.args,
      JSON.stringify(metaAfter));
    check('실행 권한 그대로(service_role만)', metaAfter.acl === metaBefore.acl && /service_role=X/.test(metaAfter.acl) && !/(^|[{,])(anon|authenticated)?=X/.test(metaAfter.acl), metaAfter.acl);
    check('max_rows 제한 동작', (await run(2)).length === 2);
    check('함수는 읽기만 한다(객체 수 그대로)', (await objectCount()) === OBJECTS.length);

    // 3) 되돌리기: 0073 정의를 다시 실행하면 기준 결과로 돌아간다
    await sql.unsafe(mig('0073_storage_expired_skip_workspace_files.sql')).simple();
    check('되돌리기(0073 재실행): 후보가 기준과 같아진다', same(await run(), before));
    const metaBack = await meta();
    check('되돌리기 뒤 권한·속성 그대로', metaBack.acl === metaBefore.acl && metaBack.cfg === metaBefore.cfg);
  } finally { await sql.end(); }
} finally {
  if (oid !== null) {
    const row = await admin`select d.datname, shobj_description(d.oid, 'pg_database') as mark from pg_database d where d.oid = ${oid}`;
    if (row.length && row[0].datname === NAME && row[0].mark === MARK) {
      await admin.unsafe(`drop database ${NAME} with (force)`);
      const left = (await admin`select count(*)::int as n from pg_database where oid = ${oid} or datname = ${NAME}`)[0].n;
      console.log(`fixture 지움: ${NAME} (oid ${oid}) 잔여 ${left}`);
    } else console.log('fixture를 지우지 않았습니다(OID·이름·표식 불일치)');
  }
  for (const r of madeRoles) await admin.unsafe(`drop role if exists ${r}`);
  console.log(`역할: 새로 만든 것 ${madeRoles.length}개${madeRoles.length ? ' 지움' : ''}(이미 있던 것은 그대로)`);
  await admin.end();
}
console.log(fail ? `실패 ${fail}건` : '전부 통과');
process.exit(fail ? 1 : 0);
