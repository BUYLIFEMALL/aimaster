-- naver-blog-agent v1.14 버전 갱신
-- 수집된 글감 보관함(/collector) 보관(is_archived) 독립 속성 분리 및 전체선택 삭제 시 보관 콘텐츠 100% 보호:
-- 1. 보관 상태(is_archived: boolean)를 사용 상태(ready / used)와 완전히 독립적인 직교 속성으로 분리
-- 2. 보관 여부와 무관하게 사용 가능 ↔ 사용 완료 토글 버튼 상시 독립 동작
-- 3. 보관 토글(보관 ↔ 보관 해제) 버튼 상시 독립 동작 및 상단 '🗄 보관중' 뱃지 독립 표시
-- 4. 전체 선택 삭제 및 일괄 정리 시 보관된 콘텐츠는 자동 제외 및 100% 안전 보호
-- 5. 상단 통계 카드에 사용 가능, 사용 완료, 보관함(삭제 보호) 3대 지표 독립 집계

UPDATE programs
SET version = 'v1.14',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
