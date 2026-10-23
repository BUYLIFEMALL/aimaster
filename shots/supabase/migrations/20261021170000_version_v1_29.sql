-- v1.29 (2026-10-21): 유튜브 연결 카드(YoutubeConnectCard) — 설정·영상·영상 포스팅 화면에 상태와 연결/다시 연결/해제 버튼을 크게. 구조 변경 없음 — 버전만
update public.programs set version='v1.29', updated_at=now() where slug='auto-shorts-posting';
