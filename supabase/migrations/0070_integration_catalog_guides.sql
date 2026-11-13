-- 공용 연동 항목(integration_catalog)에 이미 있는 연동 매뉴얼 글(platform_guides)을 연결한다 (2026-11-13 [역할: policy])
-- 주인님 지시: 「관련 api키가 등록되어 있지 않다면 db에서 찾아서 맞게 업데이트 해놔」「api관련 링크버튼들도 없는게 있으면 찾아서 옆에 추가」
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 적용 전 20개 항목 모두 guide_id = null 이었다(되돌리기: 아래 키들의 guide_id를 null로).
-- 메인 사이트 「API 설정」 화면의 연동 항목 옆 「📖 연동 매뉴얼」 버튼이 이 값을 쓴다. 매뉴얼 글이 아직 없는 항목은 그대로 null:
--   newsblur, cronjob_org, groq, openrouter, cloudflare_workers_ai, huggingface, wordpress, naver_blog, nvidia_nim
update public.integration_catalog c set guide_id = v.gid::uuid, updated_at = now()
from (values
  (threads, 343996d3-8c77-455d-9bd4-54bcd47a34cd),
  (instagram, 6cdae259-b9d2-45ae-9c21-e5f498f78956),
  (kakao, 4042a4b3-e573-4baa-8f70-103f52b1cbbd),
  (naver_login, ec45e4bd-fccc-4f14-92e8-3e2df3ced50b),
  (youtube, 1c4181ac-a8c4-4b11-80f4-b29f3318c39b),
  (blogger, 523e7401-7393-44f5-ba45-dd437e10fa2d),
  (google_calendar, 523e7401-7393-44f5-ba45-dd437e10fa2d),
  (solapi, eb8f5eaf-6ef7-46b8-9b05-994e944fe69a),
  (smtp, 1dbea19b-4c83-4453-ae41-0b59d7f27b5f),
  (coupang_wing, 34c7fcab-7456-479c-bf0e-85a812489342),
  (fixed_ip_proxy, a72978fc-193e-4895-9cb5-5157cc54b690)
) as v(key, gid)
where c.key = v.key and c.guide_id is null
  and exists (select 1 from public.platform_guides g where g.id = v.gid::uuid);
