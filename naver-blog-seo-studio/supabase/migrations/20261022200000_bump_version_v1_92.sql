-- v1.92 (2026-10-22, BLC-08b 보완): 끝맺음 수정본 채택 조건을 1,500자 이상 + 원래 길이 95% 이상 + 비율 개선으로 완화, 버려진 수정본 길이·비율을 seo_report.styleEnding.candidate에 기록. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.92', extension_version = 'v1.92', updated_at = now() where slug = 'naver-blog-seo-studio';
