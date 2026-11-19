// 0077(member_storage_measure 쇼핑몰 4버킷 몰 대표 귀속) 합성 시험 — 전용 로컬 fixture에서만 돈다.
// 운영·Lab·공유 DB에는 접속하지 않는다: 호스트는 127.0.0.1만, DB 이름은 aimaster_storage_fx_ 로 시작해야 하며
// 스크립트가 직접 만들고(표식 주석) 끝나면 OID·이름·표식을 대조한 뒤 지운다. 실제 회원 자료·실제 파일은 쓰지 않는다.
//
// 사용:
//   node supabase/tests/storage_measure_mall_owner.check.mjs show   ← 목적지만 출력(비밀번호 출력 안 함)
//   STORAGE_FX_PG_PASSWORD=<로컬 컨테이너 관리 비밀번호> node supabase/tests/storage_measure_mall_owner.check.mjs run
// 선택 환경변수: STORAGE_FX_PG_PORT(기본 55432) · STORAGE_FX_PG_USER(기본 postgres) · STORAGE_FX_DB(기본 aimaster_storage_fx_0077)
//
// 시험 대상 함수 정의는 마이그레이션 파일(0066 기준 → 0077)을 그대로 읽어 실행한다. 나머지(profiles·usage 표·쇼핑몰 몰 표·storage.objects)는 합성 대역이다.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOST = '127.0.0.1';
const PORT = Number(process.env.STORAGE_FX_PG_PORT ?? 55432);
const USER = process.env.STORAGE_FX_PG_USER ?? 'postgres';
const NAME = process.env.STORAGE_FX_DB ?? 'aimaster_storage_fx_0077';
const MARK = 'B2B-20261119-MALL-STORAGE 0077 합성 fixture(실제 회원·파일 없음)';
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
const A = 'aaaaaaaa-0000-4000-8000-000000000001'; // 몰 대표(몰 S1·S2)
const B = 'bbbbbbbb-0000-4000-8000-000000000002'; // 직원(몰 없음)
const C = 'cccccccc-0000-4000-8000-000000000003'; // 손님(사업자등록증·리셀러 서류 낸 사람)
const D = 'dddddddd-0000-4000-8000-000000000004'; // 분양몰 S3 대표(거울 상품 — 파일 없음)
const E = 'eeeeeeee-0000-4000-8000-000000000005'; // 몰 이전 받을 새 대표
const F = 'ffffffff-0000-4000-8000-000000000006'; // 쇼핑몰과 무관한 일반 회원
const G = '99999999-0000-4000-8000-000000000007'; // 이름에 F 다음에 나오는 두 번째 회원(경계 사례)
const USERS = [A, B, C, D, E, F, G];
const S1 = '11111111-0000-4000-8000-0000000000a1';
const S2 = '11111111-0000-4000-8000-0000000000a2';
const S3 = '11111111-0000-4000-8000-0000000000a3';
const NOSTORE = '11111111-0000-4000-8000-0000000000ff'; // 없는 몰
const SUP = '22222222-0000-4000-8000-0000000000bb'; // 공급사 행 번호(회원 id 아님)
const R = (n) => `33333333-0000-4000-8000-${String(n).padStart(12, '0')}`;
const PID = '44444444-0000-4000-8000-0000000000dd';
const APPLY = '55555555-0000-4000-8000-0000000000ee';

// [버킷, 이름, 바이트, mimetype, 0077 귀속(null=없음), 설명]
const OBJECTS = [
  ['mall-builder-public', `${S1}/products/${R(1)}.jpg`, 100, 'image/jpeg', A, '몰 상품 사진'],
  ['mall-builder-public', `${S1}/supplier/${SUP}/${R(2)}.jpg`, 200, 'image/jpeg', A, '공급사 상품 사진'],
  ['mall-builder-public', `${S1}/banners/${R(3)}.png`, 300, 'image/png', A, '첫 화면 배너'],
  ['mall-builder-public', `${S2}/logo/${R(4)}.png`, 400, 'image/png', A, '두 번째 몰 로고'],
  ['mall-builder-private', `${S1}/${C}/business-cert-1.pdf`, 500, 'application/pdf', A, '손님 사업자등록증'],
  ['mall-builder-private', `${S1}/${C}/reseller-apply-bankbook-1.jpg`, 600, 'image/jpeg', A, '리셀러 통장 사본'],
  ['mall-builder-proposals', `${S1}/${PID}.jpg`, 700, 'image/jpeg', A, '사진 제안'],
  ['mall-builder-applied', `${S1}/${APPLY}.k1.${'ab'.repeat(32)}.${'cd'.repeat(16)}.jpg`, 800, 'image/jpeg', A, '적용 사진'],
  ['mall-builder-public', `not-a-uuid/${R(5)}.jpg`, 50, 'image/jpeg', null, '첫 폴더가 UUID 아님'],
  ['mall-builder-public', `${NOSTORE}/products/${R(6)}.jpg`, 60, 'image/jpeg', null, '없는 몰'],
  ['mall-builder-public', `${S1.toUpperCase()}/products/${R(7)}.jpg`, 65, 'image/jpeg', null, '대문자 몰 id(형식 불일치)'],
  ['mall-builder-other', `${S1}/${C}/x.jpg`, 70, 'image/jpeg', null, '규칙 없는 새 쇼핑몰 버킷(회원 id 있어도 귀속 없음)'],
  ['blog-images', `${F}/a.png`, 1000, 'image/png', F, '일반 회원 이미지'],
  ['insta-media', `${F}/b.mp4`, 2000, 'video/mp4', F, '일반 회원 영상'],
  ['workspace-files', `${F}/${R(8)}/note.txt`, 3000, 'text/plain', F, '워크스페이스 첨부'],
  ['blog-images', `${C}/c.png`, 90, 'image/png', C, '손님 본인 다른 프로그램 파일'],
  ['blog-images', `${F}/${G}/x.png`, 5, 'image/png', F, '이름에 회원 2명(첫 번째 회원 귀속)'],
];

let fail = 0;
const check = (label, ok, detail = '') => { console.log(`${ok ? '통과' : '실패'}  ${label}${ok || !detail ? '' : `\n      ${detail}`}`); if (!ok) fail++; };
const norm = (r) => (r ? JSON.stringify({ bytes: Number(r.bytes), cnt: r.file_count, bb: r.by_bucket, bk: r.by_kind }) : JSON.stringify({ bytes: 0, cnt: 0, bb: {}, bk: {} }));
const kindOf = (m) => (m.startsWith('image/') ? 'image' : m.startsWith('video/') ? 'video' : m.startsWith('audio/') ? 'audio' : 'other');
const expect = (u, list = OBJECTS, owners = (o) => o[4]) => {
  const mine = list.filter((o) => owners(o) === u);
  const bb = {}, bk = {};
  for (const o of mine) { bb[o[0]] = (bb[o[0]] ?? 0) + o[2]; bk[kindOf(o[3])] = (bk[kindOf(o[3])] ?? 0) + o[2]; }
  return { bytes: mine.reduce((s, o) => s + o[2], 0), cnt: mine.length, bb, bk };
};
const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const eqRow = (row, e) => {
  const got = row ? { bytes: Number(row.bytes), cnt: row.file_count, bb: sortKeys(row.by_bucket), bk: sortKeys(row.by_kind) } : { bytes: 0, cnt: 0, bb: {}, bk: {} };
  return JSON.stringify(got) === JSON.stringify({ ...e, bb: sortKeys(e.bb), bk: sortKeys(e.bk) });
};

const admin = postgres({ ...opt, database: 'postgres' });
let oid = null;
const madeRoles = [];
try {
  const had = await admin`select 1 from pg_database where datname = ${NAME}`;
  if (had.length) throw new Error('같은 이름의 DB가 이미 있습니다 — 중단(덮어쓰지 않음)');
  await admin.unsafe(`create database ${NAME}`);
  await admin.unsafe(`comment on database ${NAME} is '${MARK}'`);
  oid = (await admin`select oid from pg_database where datname = ${NAME}`)[0].oid;
  console.log(`fixture 만듦: ${NAME} (oid ${oid}, ${HOST}:${PORT})`);

  const sql = postgres({ ...opt, database: NAME });
  try {
    for (const r of ['anon', 'authenticated', 'service_role']) {
      if ((await admin`select 1 from pg_roles where rolname = ${r}`).length) continue;
      await admin.unsafe(`create role ${r} nologin`);
      madeRoles.push(r);
    }
    // 합성 대역 — 함수가 읽는 것만 최소로(usage 표는 0063 정의 그대로, by_kind는 0066이 추가)
    await sql.unsafe(`
      create schema storage;
      create table storage.objects (bucket_id text not null, name text not null, metadata jsonb, created_at timestamptz not null default now(), primary key (bucket_id, name));
      create table public.profiles (id uuid primary key);
      create table public.member_storage_usage (
        user_id uuid primary key references public.profiles(id) on delete cascade,
        bytes bigint not null default 0, file_count integer not null default 0,
        by_bucket jsonb not null default '{}'::jsonb, measured_at timestamptz not null default now());
      create table public.mall_builder_stores (id uuid primary key, owner_id uuid not null);
    `).simple();
    await sql`insert into public.profiles ${sql(USERS.map((id) => ({ id })))}`;
    await sql`insert into public.mall_builder_stores ${sql([{ id: S1, owner_id: A }, { id: S2, owner_id: A }, { id: S3, owner_id: D }])}`;
    for (const [bucket, name, size, mime] of OBJECTS) {
      await sql`insert into storage.objects (bucket_id, name, metadata) values (${bucket}, ${name}, ${sql.json({ size: String(size), mimetype: mime })})`;
    }
    const rows = async () => Object.fromEntries((await sql`select * from public.member_storage_usage`).map((r) => [r.user_id, r]));
    const meta = async (fn) => (await sql`
      select p.prosecdef, p.provolatile, p.proconfig::text as cfg, pg_get_function_result(p.oid) as res,
             pg_get_function_arguments(p.oid) as args, coalesce(p.proacl::text, '') as acl
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = ${fn}`)[0];
    const objCount = async () => (await sql`select count(*)::int as n from storage.objects`)[0].n;

    // 1) 기준: 0066 정의(파일 끝의 전체 측정 포함)
    await sql.unsafe(mig('0066_member_storage_by_kind.sql')).simple();
    const base = await rows();
    const baseOwner = (o) => { const ids = o[1].match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []; return ids.find((x) => USERS.includes(x)) ?? null; };
    check('기준(0066): 몰 대표 A 0바이트 — 몰 사진이 아무에게도 안 잡힘(문제 재현)', eqRow(base[A], { bytes: 0, cnt: 0, bb: {}, bk: {} }), norm(base[A]));
    check('기준(0066): 손님 C에 쇼핑몰 서류 1,100바이트가 잡힘(오귀속 재현)', Number(base[C]?.bytes) === 1100 + 90 + 70, norm(base[C]));
    check('기준(0066): 전체 측정 결과가 「이름 속 첫 회원」 규칙과 같다', USERS.every((u) => eqRow(base[u], expect(u, OBJECTS, baseOwner))));
    const measureMeta0 = await meta('member_storage_measure');
    const def0 = (await sql`select pg_get_functiondef('public.member_storage_measure(uuid)'::regprocedure) as d`)[0].d;

    // 2) 0077 적용 → 전체 측정
    await sql.unsafe(mig('0077_storage_measure_mall_owner.sql')).simple();
    check('0077 적용만으로는 사용량 표를 바꾸지 않는다(전체 측정 자동 실행 없음)', JSON.stringify(await rows()) === JSON.stringify(base));
    await sql`select public.member_storage_measure()`;
    const full = await rows();
    for (const u of USERS) check(`전체 측정: ${u.slice(0, 8)} 값이 기대와 같다`, eqRow(full[u], expect(u)), norm(full[u]));
    check('네 버킷 모두 몰 대표 A에 귀속(공급사·서류·제안·적용 포함)',
      ['mall-builder-public', 'mall-builder-private', 'mall-builder-proposals', 'mall-builder-applied'].every((b) => Number(full[A]?.by_bucket?.[b]) > 0));
    check('직원 B·분양몰 D 0바이트(중복 없음)', eqRow(full[B], expect(B)) && Number(full[D]?.bytes ?? 0) === 0);
    check('손님 C는 본인 파일 90바이트만(쇼핑몰 서류 빠짐)', Number(full[C]?.bytes) === 90);
    check('한 대표의 몰 2개 합산(S1+S2)', Number(full[A]?.bytes) === 3600);
    check('형식 불일치·없는 몰·규칙 없는 새 몰 버킷은 누구에게도 안 잡힘',
      Object.values(full).every((r) => !Object.keys(r.by_bucket).includes('mall-builder-other')) &&
      USERS.reduce((s, u) => s + Number(full[u]?.bytes ?? 0), 0) === OBJECTS.filter((o) => o[4]).reduce((s, o) => s + o[2], 0));
    check('비몰 회귀: 쇼핑몰 아닌 버킷의 회원별 값은 0066과 같다', USERS.every((u) => {
      const nonMall = (r) => Object.entries(r?.by_bucket ?? {}).filter(([b]) => !b.startsWith('mall-builder-')).sort().join('|');
      return nonMall(full[u]) === nonMall(base[u]);
    }));

    // 3) 한 명 측정 = 전체 측정
    let singleSame = true; const diffs = [];
    for (const u of USERS) {
      await sql`select public.member_storage_measure(${u}::uuid)`;
      const one = (await rows())[u];
      if (norm(one) !== norm(full[u])) { singleSame = false; diffs.push(`${u.slice(0, 8)}: ${norm(one)} ≠ ${norm(full[u])}`); }
    }
    check('한 명 측정 결과가 전체 측정과 모든 회원에서 같다', singleSame, diffs.join(' / '));
    await sql`select public.member_storage_measure(${G}::uuid)`;
    check('경계: 이름에 회원 2명인 파일은 첫 회원(F)에만 — 두 번째 회원 G 한 명 측정 0(0066 한 명 측정과의 차이 정리)', Number((await rows())[G]?.bytes ?? 0) === 0);

    // 4) 몰 이전(S1 대표 A → E): 파일 이동 없이 재측정만으로 옮겨진다
    await sql`update public.mall_builder_stores set owner_id = ${E} where id = ${S1}`;
    const moved = (o) => (o[4] === A && o[1].startsWith(S1) ? E : o[4]);
    for (const u of [A, E]) await sql`select public.member_storage_measure(${u}::uuid)`;
    const afterOne = await rows();
    check('몰 이전 뒤 한 명 측정: A는 S2 400바이트만', eqRow(afterOne[A], expect(A, OBJECTS, moved)), norm(afterOne[A]));
    check('몰 이전 뒤 한 명 측정: E는 S1 3,200바이트', eqRow(afterOne[E], expect(E, OBJECTS, moved)), norm(afterOne[E]));
    await sql`select public.member_storage_measure()`;
    const afterFull = await rows();
    check('몰 이전 뒤 전체 측정도 같은 값', [A, E].every((u) => norm(afterFull[u]) === norm(afterOne[u])));
    check('측정은 파일을 바꾸지 않는다(객체 수 그대로)', (await objCount()) === OBJECTS.length);

    // 5) 권한·속성
    const m1 = await meta('member_storage_measure');
    const o1 = await meta('member_storage_object_owner');
    check('member_storage_measure 속성·권한 그대로(SECURITY DEFINER·search_path·인자·반환·service_role만)',
      m1.prosecdef && m1.cfg === measureMeta0.cfg && m1.args === measureMeta0.args && m1.res === measureMeta0.res && m1.acl === measureMeta0.acl, JSON.stringify(m1));
    check('새 규칙 함수: SECURITY DEFINER·STABLE·search_path 비움·service_role만 실행',
      o1.prosecdef && o1.provolatile === 's' && o1.cfg === m1.cfg && o1.cfg.includes('search_path=') && /service_role=X/.test(o1.acl) && !/(^|[{,])(anon|authenticated)?=X/.test(o1.acl), JSON.stringify(o1));

    // 6) 되돌리기: 0066 정의 재실행 + 규칙 함수 삭제
    await sql.unsafe(`drop function public.member_storage_object_owner(text, text);`).simple();
    await sql.unsafe(mig('0066_member_storage_by_kind.sql')).simple();
    await sql`update public.mall_builder_stores set owner_id = ${A} where id = ${S1}`;
    const defBack = (await sql`select pg_get_functiondef('public.member_storage_measure(uuid)'::regprocedure) as d`)[0].d;
    const m2 = await meta('member_storage_measure');
    check('되돌리기(0066 재실행 + 규칙 함수 삭제) 뒤 함수 정의·권한이 0077 전과 같다', defBack === def0 && m2.acl === measureMeta0.acl);
    check('되돌리기 뒤 규칙 함수 없음', (await sql`select to_regprocedure('public.member_storage_object_owner(text,text)') as r`)[0].r === null);
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

// 7) 정적 확인: 쇼핑몰 코드는 용량 확인으로 업로드를 막지 않는다(집계·안내만)
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const mallSrc = walk(resolve(ROOT, 'mall-builder', 'src')).filter((p) => /\.(ts|tsx)$/.test(p));
const blocking = mallSrc.filter((p) => readFileSync(p, 'utf8').includes('member_storage_check'));
check('쇼핑몰 소스에 member_storage_check 호출 0건(업로드 막지 않음)', blocking.length === 0, blocking.join(', '));

console.log(fail ? `실패 ${fail}건` : '전부 통과');
process.exit(fail ? 1 : 0);
