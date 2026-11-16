// Lab 0103 실행 자료 만들기 — apply.sql에 0103 원문(LF)을 그대로 넣고 지문을 출력한다. 실행: node mall-builder/docs/handoff-0103-lab/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "..", "supabase", "migrations", "0103_exchange_confirmed_window.sql"), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const EXPECT = "05fd87eeed148ecd9d238430862d8595366e43a6575a46d78b80bf00b3b48de6";
if (sha(src) !== EXPECT) { console.error(`0103 원문 지문이 승인값과 다릅니다: ${sha(src)} (승인 ${EXPECT})`); process.exit(1); }
const apply = `-- Lab 0103 적용(한 트랜잭션) — 대상: Lab(AIMaster_dev, ref rjjtjakljjxsgjelqgek) SQL 편집기. 운영(esgxyik…)에서 실행 금지.
-- 원문: mall-builder/supabase/migrations/0103_exchange_confirmed_window.sql (LF sha256 ${sha(src)}) — 아래 「원문 시작/끝」 사이는 한 글자도 바꾸지 않음.
-- 함수 다시 정의만(표·자료 변경 없음). 0102 적용 기록 1줄이 있고 0103 기록이 없을 때만 진행.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $pre$ begin
  if not exists (select 1 from public.mall_builder_stores where slug = 'aimaster-b2b') then raise exception '[멈춤] 몰 aimaster-b2b가 없습니다(Lab이 맞는지 확인).'; end if;
  if (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') <> 1 then raise exception '[멈춤] 0102 적용 기록이 정확히 1줄이 아닙니다.'; end if;
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window') then raise exception '[멈춤] 0103 적용 기록이 이미 있습니다.'; end if;
  if to_regclass('public.mall_builder_exchanges') is null then raise exception '[멈춤] 교환 표가 없습니다(0102 미적용).'; end if;
  if to_regprocedure('mall_builder_private.exchange_order_status_ok(text)') is not null then raise exception '[멈춤] 0103 도우미 함수가 이미 있습니다.'; end if;
end $pre$;
-- ── 원문 시작 ──
${src}
-- ── 원문 끝 ──
insert into supabase_migrations.schema_migrations (version, name) values (to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), 'mall_builder_0103_exchange_confirmed_window');
commit;
`;
writeFileSync(join(here, "apply.sql"), apply);
console.log(`0103 원문 LF sha256 ${sha(src)}`);
console.log(`apply.sql sha256 ${sha(apply)}`);
