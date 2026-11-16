-- 실행 전 확인(읽기 전용) — 운영 프로젝트(ref esgxyikcnnvmlhygjkth) SQL 편집기. 7줄 모두 판정이 OK여야 apply.sql 실행
select 1 순서, '대기열 표 tap_collect_queue 있음' 항목, case when to_regclass('public.tap_collect_queue') is not null then 'OK' else '멈춤' end 판정
union all select 2, '대기열 표 적용 기록 있음', case when exists (select 1 from supabase_migrations.schema_migrations where name = 'tap_collect_queue') then 'OK' else '멈춤' end
union all select 3, '이번 묶음 기록·함수·인덱스 없음', case when not exists (select 1 from supabase_migrations.schema_migrations where name = 'tap_collect_queue_atomic')
    and not exists (select 1 from pg_proc where proname = 'tap_register_collected') and to_regclass('public.tap_collect_queue_user_url_uniq') is null then 'OK' else '멈춤(이미 있음)' end
union all select 4, '같은 회원·같은 링크 중복 0', case when not exists (select 1 from public.tap_collect_queue group by user_id, affiliate_url having count(*) > 1) then 'OK' else '멈춤(중복 있음 — 정리 결정 먼저)' end
union all select 5, '같은 상품에 연결된 줄 중복 0', case when not exists (select 1 from public.tap_collect_queue where product_id is not null group by product_id having count(*) > 1) then 'OK' else '멈춤(중복 있음 — 정리 결정 먼저)' end
union all select 6, '상품 표 affiliate_products 있음', case when to_regclass('public.affiliate_products') is not null then 'OK' else '멈춤' end
union all select 7, '참고: 상품 연결됐는데 등록됨 아닌 줄(0이 정상, 있어도 진행 가능·안 바뀜)',
    case when not exists (select 1 from public.tap_collect_queue where status <> 'registered' and product_id is not null) then 'OK' else 'OK(안내 ' || (select count(*) from public.tap_collect_queue where status <> 'registered' and product_id is not null) || '줄)' end
order by 1;
