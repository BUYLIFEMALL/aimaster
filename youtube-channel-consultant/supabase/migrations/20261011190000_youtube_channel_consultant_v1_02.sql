-- YOUTUBE CHANNEL CONSULTANT v1.02 (2026-10-11): AI 분석(영상 요약·경쟁 전략·성장 과정·채널 진단) 추가.
-- 새 테이블 없음(결과는 서버에 저장하지 않음). 프로그램 설명과 버전만 갱신한다.
UPDATE public.programs
SET version = 'v1.02',
    short_desc = '유튜브 채널 지표 진단과 키워드 분석, AI 영상 요약·경쟁 전략·성장 과정·채널 진단까지 한 번에 하는 채널 컨설턴트',
    updated_at = NOW()
WHERE slug = 'youtube-channel-consultant';
