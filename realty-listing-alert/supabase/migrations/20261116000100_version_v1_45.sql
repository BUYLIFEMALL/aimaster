-- v1.45 (2026-11-16): 카톡 보내기 실패 알리기(L-6 — 401·403 다시 연결, 그 밖 다음 회차 안내, 끊긴 같은 토큰 재발송 안 함), 단지 이름 고치기 결과 기록(L-7). 운영 DB 적용 완료.
update programs set version = 'v1.45', extension_version = 'v1.45', updated_at = now() where slug = 'realty-listing-alert';
