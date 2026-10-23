-- AI 음악 스튜디오 카탈로그 썸네일 — 2026-10-23 (Claude Code 윈도우, 주인님 승인 「진행해」)
-- scripts/generate-program-thumbnail.mjs 로 생성·업로드·반영 완료(관리자 본인 Gemini 키, gemini-3-pro-image-preview 1회).
-- 내용: 한국인 크리에이터가 헤드폰을 쓰고 노트북에서 세 갈래 음파(보라·하늘·분홍)를 나란히 듣는 홈 스튜디오 실사, 글자·로고 없음(확대본 6장 확인).
-- 아래는 기록용(이미 적용됨, 다시 실행해도 같은 값):
update public.programs
   set thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ai-music-studio-thumbnail.jpg?v=1792693698514'
 where slug = 'ai-music-studio';
