-- v1.29 (2026-10-22): 「🎬 레퍼런스 쇼츠에서 대본 따기」 — 브라우저가 영상에서 소리만 뽑아(공용 browser-video-extract, 기준 INSTA reelsMedia.ts) 회원 본인 OpenAI 키로 Whisper 받아쓰기 → 참고 자료 칸. 저장 없음, 표 구조 변경 없음.
update public.programs set version='v1.29', updated_at=now() where slug='shorts-onestop-studio';
