-- 2026-10-23 v1.10 (#9): 결과 엑셀 버킷을 비공개로. 「엑셀 다운로드」는 /api/jobs/[id]/download 가 본인 확인 뒤 10분짜리 임시 주소로 넘긴다.
-- 버킷 설정은 Storage API(service role)로 바꿨다(public=false). 기존 공개 주소는 더 이상 열리지 않는다(의도). 표 변경 없음.
update storage.buckets set public = false where id = 'web-crawler-results';
update public.programs set version = 'v1.10', updated_at = now() where slug = 'web-crawler-saas';
