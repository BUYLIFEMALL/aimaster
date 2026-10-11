-- YOUTUBE CHANNEL CONSULTANT v1.03 (2026-10-11): 공략 채널 찾기 추가. 새 테이블 없음, 프로그램 설명과 버전만 갱신.
UPDATE public.programs
SET version = 'v1.03',
    short_desc = '유튜브 채널·키워드 분석, 소형 고효율 공략 채널 찾기, AI 영상 요약·경쟁 전략·성장 과정·채널 진단까지 한 번에 하는 채널 컨설턴트',
    updated_at = NOW()
WHERE slug = 'youtube-channel-consultant';
