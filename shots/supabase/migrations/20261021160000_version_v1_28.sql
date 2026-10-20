-- v1.28 (2026-10-21): 유튜브 올리기 공개 범위(비공개 기본·일부 공개·공개)·예약 공개(15분 뒤~6개월). 공용 youtube-upload-client uploadYoutubeVideo에 publishAt 선택값. 구조 변경 없음 — 버전만
update public.programs set version='v1.28', updated_at=now() where slug='auto-shorts-posting';
