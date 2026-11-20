-- v1.47 (2026-11-20): 관심 지역 제안 3단계(a6e11f679), C-1 결과 줄 → 고객관리 후보 보내기(b6bb2c4ae), Next.js 16.4.6 보안 패치(d3619ba50). 확장 코드 변경 없음(버전·ZIP만 맞춤).
update programs set version = 'v1.47', extension_version = 'v1.47', updated_at = now() where slug = 'realty-listing-alert' and version = 'v1.46';
