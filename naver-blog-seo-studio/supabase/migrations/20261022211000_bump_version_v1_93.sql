-- v1.93 (2026-10-22, BLC-09): 구간별로 쓰기(목차 → 구간마다 저장·중지·이어쓰기·실패 구간만 다시 쓰기 → 원고로 합치기) + 원고 수정 시 다른 창·탭 저장 충돌 확인. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.93', extension_version = 'v1.93', updated_at = now() where slug = 'naver-blog-seo-studio';
