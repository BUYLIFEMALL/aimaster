-- v1.46 (2026-11-17): 감시 화면 지역 겹침 안내(U-5), 확장 계정 기록 격리(QA17-003 — 다른 계정으로 다시 연결하면 이전 계정 기록을 지우고, 소유 표시 없는 옛 기록은 같은 PC의 legacyQuarantine 칸에 원값 그대로 격리 보존, 웹에는 로그인=연결=소유 계정일 때만 전달). 운영 DB 적용 완료.
update programs set version = 'v1.46', extension_version = 'v1.46', updated_at = now() where slug = 'realty-listing-alert';
