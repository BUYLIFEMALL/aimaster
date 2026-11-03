-- v1.08(2026-11-03): 일정 알림 실행 방식 = 회원 본인 cron-job.org가 기본·유일(주인님 「일반 사용자들은 vercel을 사용하지 않으니 기본값은 cron-job 가입후 등록」),
-- AI 초안은 OpenAI·Claude·Gemini 중 고르고 모델도 고름(주인님 「플랫폼 3개와 각각의 모델을 선택」). 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth.
alter table public.realty_desk_member_scheduler alter column mode set default 'cronjob';
update public.realty_desk_member_scheduler set mode = 'cronjob', updated_at = now() where mode = 'vercel';

update public.programs set
  description = replace(replace(description,
    '<p>📅 임장·계약·잔금·만기 일정을 넣으면 정한 날 아침 8시에 내 핸드폰으로 알려 드립니다.</p>',
    '<p>📅 임장·계약·잔금·만기 일정을 넣으면 정한 날 아침 8시에 내 핸드폰으로 알려 드립니다(본인 무료 cron-job.org 계정 연결).</p>'),
    '<p>🔑 문자는 회원 본인 SOLAPI 계정, AI 초안은 회원 본인 Claude API 키를 사용합니다.',
    '<p>🔑 문자는 회원 본인 SOLAPI 계정, AI 초안은 회원 본인 AI 키(OpenAI·Claude·Gemini 중 고르고 모델도 선택)를 사용합니다.'),
  updated_at = now()
where slug = 'realty-client-desk';

select (select count(*) from public.realty_desk_member_scheduler where mode = 'vercel') vercel_rows,
  position('OpenAI·Claude·Gemini' in (select description from public.programs where slug = 'realty-client-desk')) > 0 desc_ok,
  position('cron-job.org' in (select description from public.programs where slug = 'realty-client-desk')) > 0 cron_ok;
