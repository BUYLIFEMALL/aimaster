-- v1.12 (2026-11-20): L-3 고객별 맞는 내 매물, C-1 매물 알림 후보 받기·후보 전용 저장(의뢰 확인), 상태 변경 결과 표시, Next.js 16.4.6 보안 패치.
-- 선행: 20261120010000_listing_candidate_status.sql 운영 적용 완료(2026-11-20, 허용 값 4개 확인).
update programs set version = 'v1.12', updated_at = now() where slug = 'realty-client-desk';
