// MOV-20261119-01 표·권한 정책 격리 시험 — 실제 마이그레이션 파일(supabase/migrations/20261120_product_videos.sql)을
// 내장형 Postgres(PGlite)에 그대로 적용해, 로그인 회원 역할로 읽기·넣기를 해 본다. 운영 DB·Supabase 는 건드리지 않는다.
//
// PGlite 는 이 프로그램의 의존성이 아니다(설치하지 않는다). 저장소 밖에 설치한 뒤 위치를 알려 줄 때만 돈다:
//   PGLITE_MODULE=<…/node_modules/@electric-sql/pglite/dist/index.js> node --test tests/productVideoRls.test.mjs
// 알려 주지 않으면 건너뛴다(SKIP).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const where = process.env.PGLITE_MODULE;
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
const PA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", PB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VID = "dQw4w9WgXcQ", VID2 = "abcdefghijk";

async function freshDb() {
  const { PGlite } = await import(pathToFileURL(where).href);
  const db = new PGlite();
  // Supabase 와 같은 바탕: 로그인 회원 역할, auth.uid(), 본인 행만 보이는 상품 표(0001_multitenancy.sql 과 같은 정책)
  await db.exec(`
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated;
    create table public.shop_products (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, name text);
    alter table public.shop_products enable row level security;
    create policy "shop_products_select_own" on public.shop_products for select using (auth.uid() = user_id);
    create policy "shop_products_delete_own" on public.shop_products for delete using (auth.uid() = user_id);
    insert into auth.users values ('${A}'), ('${B}');
    insert into public.shop_products values ('${PA}', '${A}', 'A의 상품'), ('${PB}', '${B}', 'B의 상품');
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/20261120_product_videos.sql", import.meta.url), "utf8"));
  // Supabase 기본값처럼 표 권한은 모두 주고, 막는 일은 권한 정책(RLS)만 하게 한다 — 정책이 없으면 통째로 뚫리는 조건
  await db.exec(`grant select, insert, update, delete on public.shop_products, public.shop_product_videos to authenticated;`);
  const as = async (userId, sql, params = []) => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${userId}';`);
    try { return await db.query(sql, params); } finally { await db.exec(`reset role; reset request.jwt.claim.sub;`); }
  };
  return { db, as };
}
// 서버 동작이 PostgREST(upsert·ignoreDuplicates)로 보내는 것과 같은 문장
const INSERT = `insert into public.shop_product_videos (user_id, product_id, video_id, title, privacy, publish_at)
  values ($1, $2, $3, $4, $5, $6) on conflict (user_id, product_id, video_id) do nothing returning id`;
const put = (as, who, userId, productId, videoId = VID, privacy = "public", publishAt = null, title = "쇼츠") => as(who, INSERT, [userId, productId, videoId, title, privacy, publishAt]);
const denied = (p) => assert.rejects(p, (e) => e.code === "42501" || /row-level security/.test(String(e.message)));

test("정책은 읽기·넣기 두 개뿐이고(고치기·지우기 없음), 권한 정책이 켜져 있다", { skip: !where && "PGLITE_MODULE 없음" }, async () => {
  const { db } = await freshDb();
  const { rows } = await db.query(`select cmd from pg_policies where schemaname = 'public' and tablename = 'shop_product_videos' order by cmd`);
  assert.deepEqual(rows.map((r) => r.cmd), ["INSERT", "SELECT"]);
  const rls = await db.query(`select relrowsecurity from pg_class where oid = 'public.shop_product_videos'::regclass`);
  assert.equal(rls.rows[0].relrowsecurity, true);
});

test("본인 상품에만 넣을 수 있다 — 남의 상품·남의 이름·없는 상품은 DB가 거절한다(서버 동작을 건너뛴 직접 넣기)", { skip: !where && "PGLITE_MODULE 없음" }, async () => {
  const { db, as } = await freshDb();
  assert.equal((await put(as, A, A, PA)).rows.length, 1, "본인 상품");
  await denied(put(as, A, A, PB), "내 이름으로 남의 상품에");
  await denied(put(as, A, B, PB), "남의 이름으로 남의 상품에");
  await denied(put(as, A, B, PA), "남의 이름으로 내 상품에");
  await denied(put(as, B, B, PA), "B가 A의 상품에");
  await assert.rejects(put(as, A, A, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"), "없는 상품");
  await denied(put(as, "", A, PA), "로그인하지 않은 요청");
  const all = await db.query(`select user_id, product_id from public.shop_product_videos`);
  assert.deepEqual(all.rows, [{ user_id: A, product_id: PA }], "남은 것은 본인 상품 한 줄뿐");
});

test("같은 상품·같은 영상은 한 줄만 — 다시 넣으면 0줄이 돌아오고 기존 값은 그대로다", { skip: !where && "PGLITE_MODULE 없음" }, async () => {
  const { db, as } = await freshDb();
  assert.equal((await put(as, A, A, PA, VID, "public", null, "처음 제목")).rows.length, 1);
  assert.equal((await put(as, A, A, PA, VID, "unlisted", null, "바뀐 제목")).rows.length, 0, "중복은 0줄(= duplicate)");
  // 연달아 몰려와도 한 줄(내장형 DB는 연결이 하나라 실제 동시 접속은 아니다 — 최종 방어는 unique 제약)
  const burst = await Promise.all([1, 2, 3, 4].map(() => put(as, A, A, PA, VID2)));
  assert.equal(burst.filter((r) => r.rows.length === 1).length, 1);
  const rows = (await db.query(`select video_id, title, privacy from public.shop_product_videos order by created_at, video_id`)).rows;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.find((r) => r.video_id === VID), { video_id: VID, title: "처음 제목", privacy: "public" }, "기존 값 유지");
  const con = await db.query(`select conname from pg_constraint where conrelid = 'public.shop_product_videos'::regclass and contype = 'u'`);
  assert.deepEqual(con.rows.map((r) => r.conname), ["shop_product_videos_once"]);
  assert.equal((await put(as, B, B, PB, VID)).rows.length, 1, "다른 회원이 같은 영상을 자기 상품에 붙이는 것은 별개");
});

test("다른 회원은 읽지 못하고, 고치기·지우기는 누구에게도 되지 않는다", { skip: !where && "PGLITE_MODULE 없음" }, async () => {
  const { db, as } = await freshDb();
  await put(as, A, A, PA);
  assert.equal((await as(A, `select video_id from public.shop_product_videos`)).rows.length, 1);
  assert.equal((await as(B, `select video_id from public.shop_product_videos`)).rows.length, 0, "B에게는 보이지 않는다");
  assert.equal((await as("", `select video_id from public.shop_product_videos`)).rows.length, 0, "로그인 없이는 보이지 않는다");
  for (const who of [A, B]) {
    assert.equal((await as(who, `update public.shop_product_videos set title = '바꿈' returning id`)).rows.length, 0, "고치기 0줄");
    assert.equal((await as(who, `delete from public.shop_product_videos returning id`)).rows.length, 0, "지우기 0줄");
  }
  assert.deepEqual((await db.query(`select title from public.shop_product_videos`)).rows, [{ title: "쇼츠" }]);
});

test("형식 제약 — 예약 없는 비공개·틀린 영상 번호·틀린 공개 범위·긴 제목은 DB도 거절한다", { skip: !where && "PGLITE_MODULE 없음" }, async () => {
  const { as } = await freshDb();
  await assert.rejects(put(as, A, A, PA, VID, "private", null), /shop_product_videos_private_needs_schedule/);
  assert.equal((await put(as, A, A, PA, VID, "private", "2026-12-01T00:00:00Z")).rows.length, 1, "예약 공개는 저장");
  // 공개·일부 공개에 예약 시각이 붙으면 과거·미래 모두 거절(서버 검사와 같은 규칙), 비공개+지난 예약은 저장
  for (const privacy of ["public", "unlisted"]) {
    for (const at of ["2099-01-01T00:00:00Z", "2020-01-01T00:00:00Z"]) {
      await assert.rejects(put(as, A, A, PA, VID2, privacy, at), /shop_product_videos_schedule_needs_private/, `${privacy} + ${at}`);
    }
  }
  assert.equal((await put(as, A, A, PA, VID2, "private", "2020-01-01T00:00:00Z")).rows.length, 1);
  assert.equal((await put(as, A, A, PA, "ZZZZZZZZZZZ", "unlisted", null)).rows.length, 1);
  await assert.rejects(put(as, A, A, PA, "short"), /check/);
  await assert.rejects(put(as, A, A, PA, "dQw4w9WgXc/"), /check/);
  await assert.rejects(put(as, A, A, PA, VID2, "secret"), /check/);
  await assert.rejects(put(as, A, A, PA, VID2, "public", null, "가".repeat(101)), /check/);
});

test("상품이 지워지면 붙인 영상도 함께 지워진다(30일 정리·회원 삭제를 따로 고칠 필요가 없다)", { skip: !where && "PGLITE_MODULE 없음" }, async () => {
  const { db, as } = await freshDb();
  await put(as, A, A, PA);
  await put(as, B, B, PB);
  assert.equal((await as(A, `delete from public.shop_products where id = '${PA}' returning id`)).rows.length, 1);
  assert.deepEqual((await db.query(`select user_id from public.shop_product_videos`)).rows, [{ user_id: B }]);
  await db.exec(`delete from auth.users where id = '${B}'`);
  assert.equal((await db.query(`select 1 from public.shop_product_videos`)).rows.length, 0);
});
