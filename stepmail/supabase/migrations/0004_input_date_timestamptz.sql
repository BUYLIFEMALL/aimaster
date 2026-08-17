-- 입력일도 시:분까지 표시할 수 있도록 date -> timestamptz로 확장한다(기존 값은 자정 UTC로 유지).
alter table public.stepmail_leads alter column input_date type timestamptz using input_date::timestamptz;
