-- v1.03: public option metadata, independent recipes and selective generation.
-- Catalog metadata only; no schema, credentials or access changes.
UPDATE public.programs
SET version = 'v1.03',
    description = '461개 프리셋·200개 댄스, 243개 스타일 그룹·13개 시대, 태그 조합·내 Style 저장, 세부 보컬·별도 랩·고음 억제, 제목·Style·가사 선택 생성, 커서 구간 삽입과 3~12곡 앨범 기획을 제공합니다. 기존 원고 보존·순차 작사·중지·회원별 보관·TXT·JSON 백업을 지원합니다. Gemini·OpenAI·Claude의 본인 API 키만 사용하며 최종 음악 생성은 본인 Suno 계정에서 진행합니다.'
WHERE id = 'bd242e47-7c13-4973-950d-9027f1bbfba9' AND slug = 'suno-music-studio';
