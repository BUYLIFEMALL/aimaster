-- naver-blog-agent v1.15 버전 갱신
-- 생성 결과물 2026년 당해 연도 100% 엄수 3중 방어막(Safe-guard) 구축:
-- 1. 입력단 정제(Input Sanitization): 글감 보관함 선택 및 URL 파라미터 로드, 파이프라인 진입 시 과거 연도(2020~2025)를 당해 연도(2026)로 자동 치환
-- 2. 프롬프트 절대 엄수 제약(Prompt Constraint): Research/Writer/Reviewer 프롬프트에 사용자가 넘긴 주제나 소재에 과거 연도가 있더라도 무조건 당해 연도(2026년)로 변경하여 기획 및 작성하도록 절대 지침 보강
-- 3. 출력단 정규식 Safe-guard(Output Post-processing): LLM의 확률적 연도 누출을 원천 방어하기 위해 최종 반환 직전 제목(Title), 본문(Content), 태그(Tags), 이미지 프롬프트/캡션 전역 정규식 교정 수행
-- 4. 글감 수집기(collector.ts) 생성 단계에서도 동일한 sanitizeYear 필터링 탑재

UPDATE programs
SET version = 'v1.15',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
