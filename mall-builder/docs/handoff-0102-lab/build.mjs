// Lab 0102 실행 자료 만들기 — apply.sql에 0102 원문(LF)을 그대로 넣고 지문을 README에 적을 수 있게 출력한다. 실행: node mall-builder/docs/handoff-0102-lab/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "..", "supabase", "migrations", "0102_exchanges.sql"), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const apply = `-- Lab 0102 적용(한 트랜잭션) — 대상: Lab(AIMaster_dev, ref rjjtjakljjxsgjelqgek) SQL 편집기. 운영(esgxyik…)에서 실행 금지.
-- 원문: mall-builder/supabase/migrations/0102_exchanges.sql (LF sha256 ${sha(src)}) — 아래 「원문 시작/끝」 사이는 한 글자도 바꾸지 않음.
begin;
do $pre$ begin
  if to_regclass('public.mall_builder_exchanges') is not null then raise exception '[멈춤] 교환 표가 이미 있습니다(0102 적용됨).'; end if;
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') then raise exception '[멈춤] 0102 적용 기록이 이미 있습니다.'; end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging') then raise exception '[멈춤] 0101 적용 기록이 없습니다(Lab이 맞는지 확인).'; end if;
  if not exists (select 1 from public.mall_builder_stores where slug = 'aimaster-b2b') then raise exception '[멈춤] 몰 aimaster-b2b가 없습니다(Lab이 맞는지 확인).'; end if;
end $pre$;
-- ── 원문 시작 ──
${src}
-- ── 원문 끝 ──
insert into supabase_migrations.schema_migrations (version, name) values (to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), 'mall_builder_0102_exchanges');
commit;
`;
writeFileSync(join(here, "apply.sql"), apply);
console.log(`0102 원문 LF sha256 ${sha(src)}`);
console.log(`apply.sql sha256 ${sha(apply)}`);
