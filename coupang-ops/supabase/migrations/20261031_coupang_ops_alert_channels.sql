-- 아침 요약 받을 곳(텔레그램·이메일·카카오톡). 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth.
alter table public.coupang_ops_alerts add column if not exists channels text[] not null default array['telegram'];
