-- naver-blog-agent v1.13 버전 갱신
-- 수집된 글감 보관함(/collector) 상태 버튼 로직 개편 및 인라인 편집 기능 추가:
-- 1. 보관(archived) 상태 시 '사용 가능으로', '사용 완료 표시', '보관 해제' 3개 버튼이 동시 노출되던 버그 해소
-- 2. 상태별 배타적 액션 버튼 재구성:
--    - ready: '사용 완료 표시', '보관'
--    - used: '사용 가능으로 복원', '보관'
--    - archived: '보관 해제 (사용 가능으로 복원)' 단독 노출
-- 3. 글감 제목 및 본문 요약 인라인 편집(✎) 및 즉시 저장 기능 탑재

UPDATE programs
SET version = 'v1.13',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
