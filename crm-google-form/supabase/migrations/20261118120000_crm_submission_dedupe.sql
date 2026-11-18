-- crm-google-form: 웹훅 중복 접수·중복 발송 방지 준비(CRM-20261118-02 2A 초안).
-- ⚠️ 운영 미적용 초안. 적용은 별도 승인 + 화면(새 상태 라벨·필터·KPI) 준비 뒤. 설계: .ai/results/PORT-20261118-02-CC-B2B-BACK-01.md
--
-- 하는 일(한 트랜잭션, 하나라도 어긋나면 전체 취소):
--   1. 사전 확인 — dedupe_key 칸·crm_submissions_dedupe_uq 이름이 없고, status 검사 제약이 정확히 1개이며
--      정의가 기존(received·notified·failed) 그대로인지. 다르면 [멈춤].
--   2. dedupe_key text 칸 추가(NULL 허용·기본값 없음) — 기존 행은 NULL 그대로(채우기 0).
--   3. 부분 유니크 (user_id, form_source_id, dedupe_key) where dedupe_key is not null
--      — user_id를 넣는 이유: 회원 insert 정책(0001)이 user_id만 검사해, 남의 form_source_id를 아는 회원이
--        (form_source_id, key)만의 유니크를 먼저 차지해 정상 접수를 막을 수 있기 때문. 웹훅은 토큰으로 찾은
--        source.user_id로 넣으므로 회원 간 서로 간섭하지 않는다. NULL 키(구버전 본문)는 몇 번이든 허용.
--   4. status 검사 제약을 같은 이름으로 다시 만들어 dispatching·partial·unknown 추가(기존 3개 유지, 행 값 변경 0).
--   5. 사후 확인 — 칸 타입·인덱스 정의·제약 정의를 글자 그대로 대조, 행 수 그대로, dedupe_key 전부 NULL.
-- 권한·RLS 정책 변경 0(새 칸은 기존 표 권한·정책을 그대로 따름).

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $crm_dedupe$
declare
  v_n int;
  v_name text;
  v_def text;
  v_rows bigint;
  v_old constant text := 'CHECK ((status = ANY (ARRAY[''received''::text, ''notified''::text, ''failed''::text])))';
  v_new constant text := 'CHECK ((status = ANY (ARRAY[''received''::text, ''notified''::text, ''failed''::text, ''dispatching''::text, ''partial''::text, ''unknown''::text])))';
  v_idx constant text := 'CREATE UNIQUE INDEX crm_submissions_dedupe_uq ON public.crm_submissions USING btree (user_id, form_source_id, dedupe_key) WHERE (dedupe_key IS NOT NULL)';
begin
  -- 1. 사전 확인
  if to_regclass('public.crm_submissions') is null then
    raise exception '[멈춤] public.crm_submissions 표가 없습니다';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'crm_submissions' and column_name = 'dedupe_key') then
    raise exception '[멈춤] dedupe_key 칸이 이미 있습니다(이미 적용했거나 다른 정의)';
  end if;
  if to_regclass('public.crm_submissions_dedupe_uq') is not null then
    raise exception '[멈춤] crm_submissions_dedupe_uq 이름이 이미 있습니다';
  end if;
  select count(*) into v_n from pg_constraint
   where conrelid = 'public.crm_submissions'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) like '%status%';
  if v_n <> 1 then
    raise exception '[멈춤] status 검사 제약이 1개가 아닙니다(%개)', v_n;
  end if;
  select conname, pg_get_constraintdef(oid) into v_name, v_def from pg_constraint
   where conrelid = 'public.crm_submissions'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) like '%status%';
  if v_def <> v_old then
    raise exception '[멈춤] status 검사 제약 정의가 예상과 다릅니다: % = %', v_name, v_def;
  end if;
  select count(*) into v_rows from public.crm_submissions;

  -- 2~4. 변경
  alter table public.crm_submissions add column dedupe_key text;
  create unique index crm_submissions_dedupe_uq
    on public.crm_submissions (user_id, form_source_id, dedupe_key)
    where dedupe_key is not null;
  execute format('alter table public.crm_submissions drop constraint %I', v_name);
  execute format(
    'alter table public.crm_submissions add constraint %I check (status in (''received'',''notified'',''failed'',''dispatching'',''partial'',''unknown''))',
    v_name);

  -- 5. 사후 확인
  if (select format_type(atttypid, atttypmod) || '|' || attnotnull::text || '|' || atthasdef::text
        from pg_attribute where attrelid = 'public.crm_submissions'::regclass and attname = 'dedupe_key')
     <> 'text|false|false' then
    raise exception '[멈춤] dedupe_key 칸 정의가 예상과 다릅니다';
  end if;
  if pg_get_indexdef('public.crm_submissions_dedupe_uq'::regclass) <> v_idx then
    raise exception '[멈춤] 인덱스 정의가 예상과 다릅니다: %', pg_get_indexdef('public.crm_submissions_dedupe_uq'::regclass);
  end if;
  if (select pg_get_constraintdef(oid) from pg_constraint
       where conrelid = 'public.crm_submissions'::regclass and conname = v_name) is distinct from v_new then
    raise exception '[멈춤] 새 status 제약 정의가 예상과 다릅니다';
  end if;
  if (select count(*) from public.crm_submissions) <> v_rows
     or exists (select 1 from public.crm_submissions where dedupe_key is not null) then
    raise exception '[멈춤] 기존 행 수가 바뀌었거나 dedupe_key가 채워졌습니다';
  end if;
  raise notice '[완료] crm_submissions dedupe 준비: 행 %개 그대로, 제약 이름 %', v_rows, v_name;
end
$crm_dedupe$;

commit;
