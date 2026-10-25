-- 운영 esgxyikcnnvmlhygjkth, 배포 dpl_CRZ4ZSzCehcwovNfGSKkDu6xsq2L Ready 뒤 적용. 프로그램 버전 행만 변경.
do $$ begin if not exists (select 1 from public.programs where slug='ai-doc-chatbot' and version in ('v1.07','v1.08')) then raise exception 'Unexpected ai-doc-chatbot version; no update applied'; end if; update public.programs set version='v1.08' where slug='ai-doc-chatbot' and version='v1.07'; end $$;
