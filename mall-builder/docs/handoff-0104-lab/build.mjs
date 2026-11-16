// Lab 0104 실행 자료 만들기 — apply.sql에 0104 원문(LF)을 그대로 넣고 지문을 출력한다. 실행: node mall-builder/docs/handoff-0104-lab/build.mjs
// 이 스크립트는 파일만 만든다(DB 접속 0). 원문 지문이 고정값과 다르면 아무것도 쓰지 않고 멈춘다.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "..", "supabase", "migrations", "0104_exchange_fee_payments.sql"), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const EXPECT = "739b35e9f20b45ba7c83309918da0cc099ca6a0b5715bf5514e755cb108662e6"; // Mac 소스 PASS 고정(37fdcabb4)
if (sha(src) !== EXPECT) { console.error(`0104 원문 지문이 고정값과 다릅니다: ${sha(src)} (고정 ${EXPECT})`); process.exit(1); }
if (/^\s*(begin|commit|rollback)\s*;/im.test(src)) { console.error("0104 원문 안에 트랜잭션 문이 있습니다 — 감싸기 불가"); process.exit(1); }

const apply = `-- Lab 0104 적용(한 트랜잭션) — 대상: Lab(AIMaster_dev, ref rjjtjakljjxsgjelqgek) SQL 편집기. 운영(esgxyik…)에서 실행 금지.
-- 원문: mall-builder/supabase/migrations/0104_exchange_fee_payments.sql (LF sha256 ${sha(src)}, 커밋 37fdcabb4) — 아래 「원문 시작/끝」 사이는 한 글자도 바꾸지 않음.
-- 하는 일: 표 2개(결제 기록·시도 이력)·함수·지킴 트리거·권한 정의만. 실제 토스 호출·시험 자료 넣기·키 읽기·준비 함수 호출 0.
-- ⚠ 적용하면 로그인 회원이 준비·승인·다시 확인 함수를 부를 수 있게 된다(실행 권한). 몰에 실제 토스 비밀 키가 이미 저장돼 있으면 그 몰은 실제 결제 승인이 가능해진다.
--   교환비만 따로 끄는 스위치는 없다(card_enabled는 새 결제 진입만 막는 공용 설정 — 완전 중단 아님). 이 파일이 있다는 것은 적용 승인이 아니다.
-- 진행 조건: 0102·0103 기록이 각각 정확히 1줄, 0104 기록·객체가 하나도 없음, 선행 함수·확장·칸이 모두 있음. 하나라도 어긋나면 아무것도 바꾸지 않고 멈춘다.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $pre$ begin
  if not exists (select 1 from public.mall_builder_stores where slug = 'aimaster-b2b') then raise exception '[멈춤] 몰 aimaster-b2b가 없습니다(Lab이 맞는지 확인).'; end if;
  if (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') <> 1 then raise exception '[멈춤] 0102 적용 기록이 정확히 1줄이 아닙니다.'; end if;
  if (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window') <> 1 then raise exception '[멈춤] 0103 적용 기록이 정확히 1줄이 아닙니다.'; end if;
  if exists (select 1 from supabase_migrations.schema_migrations where name like 'mall_builder_0104%') then raise exception '[멈춤] 0104 적용 기록이 이미 있습니다.'; end if;
  -- 0104 객체가 하나라도 있으면(부분 적용·옛 정의) 멈춤
  if to_regclass('public.mall_builder_exchange_fee_payments') is not null or to_regclass('public.mall_builder_exchange_fee_payment_attempts') is not null
     or exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where (n.nspname = 'public' and p.proname in ('mall_builder_exchange_fee_card_prepare', 'mall_builder_exchange_fee_card_confirm', 'mall_builder_exchange_fee_card_recheck'))
                   or (n.nspname = 'mall_builder_private' and p.proname in ('exchange_fee_attempt_archive', 'exchanges_fee_card_guard', 'exchange_fee_mark_card_paid', 'exchange_fee_card_hold_canceled')))
     or exists (select 1 from pg_trigger where tgname = 'mall_builder_exchanges_fee_card_guard' and not tgisinternal) then
    raise exception '[멈춤] 0104 객체가 이미 일부 있습니다(부분 적용 또는 옛 정의). 사람이 확인하세요.';
  end if;
  -- 선행 객체(0102·0103·0029·직원 권한)
  if to_regclass('public.mall_builder_exchanges') is null then raise exception '[멈춤] 교환 표가 없습니다(0102).'; end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'mall_builder_exchanges' and column_name in ('fee', 'fee_status', 'fee_paid_at', 'updated_at')) <> 4 then raise exception '[멈춤] 교환 표 교환비 칸이 모자랍니다.'; end if;
  if to_regprocedure('mall_builder_private.toss_call(text,text,text,jsonb,text)') is null then raise exception '[멈춤] toss_call(0029)이 없습니다.'; end if;
  if to_regprocedure('mall_builder_private.exchange_event(uuid,text,text)') is null then raise exception '[멈춤] exchange_event(0102)가 없습니다.'; end if;
  if to_regprocedure('mall_builder_private.lock_exchange(uuid)') is null then raise exception '[멈춤] lock_exchange(0102)가 없습니다.'; end if;
  if to_regprocedure('mall_builder_private.exchange_order_status_ok(text)') is null then raise exception '[멈춤] exchange_order_status_ok(0103)가 없습니다.'; end if;
  if to_regprocedure('public.mall_builder_staff_can(uuid,text)') is null then raise exception '[멈춤] mall_builder_staff_can이 없습니다.'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mall_builder_store_scheduler_secrets' and column_name = 'toss_secret_key') then raise exception '[멈춤] 토스 비밀 키 칸(0029)이 없습니다.'; end if;
  if not exists (select 1 from pg_extension where extname = 'http') then raise exception '[멈춤] http 확장이 없습니다(toss_call 선행).'; end if;
end $pre$;
-- ── 원문 시작 ──
${src}
-- ── 원문 끝 ──
insert into supabase_migrations.schema_migrations (version, name) values (to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), 'mall_builder_0104_exchange_fee_payments');
commit;
`;
writeFileSync(join(here, "apply.sql"), apply);
console.log(`0104 원문 LF sha256 ${sha(src)}`);
console.log(`apply.sql sha256 ${sha(apply)}`);
