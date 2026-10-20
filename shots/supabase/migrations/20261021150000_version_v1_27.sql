-- v1.27 (2026-10-21): 배경음악 파일 보관을 서버 관리자 키로·실패 시 임시 주소 저장 안 함, 브라우저 만들기 음성 보관·재사용(shots-bgm <회원>/<영상>/voice/), 30일 정리에 보관 음성 포함. 구조 변경 없음 — 버전만
update public.programs set version='v1.27', updated_at=now() where slug='auto-shorts-posting';
