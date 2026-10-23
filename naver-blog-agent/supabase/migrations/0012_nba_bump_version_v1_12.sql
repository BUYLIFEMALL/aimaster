-- naver-blog-agent v1.12 버전 갱신
-- 당해 연도(현재 2026년) 기준 엄수 및 LLM 사전학습 컷오프(2023/2024년) 퇴행 방지:
-- 1. CLAUDE.md 불변의 핵심 원칙 8번 및 AGENTS.md 원칙 9번에 당해 연도 엄수 메인 지침 확정
-- 2. 4단계 멀티 에이전트 파이프라인(리서치, 라이터, 리뷰어)에 동적 new Date().getFullYear() 연동 및 기준 연도 절대 엄수 프롬프트 주입
-- 3. 블로그 휴머나이저(Humanizer) 13번 규칙에 당해 연도(현재 2026년) 기준 윤문 및 과거 연도 교정 규칙 추가
-- 4. 떡상 글감 수집소(Perplexity 실시간 검색, 블로그 글감 AI 구조화)에 당해 연도 기준 팩트/이슈 추출 지침 적용

UPDATE programs
SET version = 'v1.12',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
