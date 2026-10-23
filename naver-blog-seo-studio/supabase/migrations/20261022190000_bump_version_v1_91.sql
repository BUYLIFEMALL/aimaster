-- v1.91 (2026-10-22, BLC-08b 보완): 첫 생성에서는 해요체/합니다체 필수 규칙을 빼고(v1.86과 같은 첫 생성), 끝맺음은 v1.90의 보강 뒤 안전 수정에만 맡김. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.91', extension_version = 'v1.91', updated_at = now() where slug = 'naver-blog-seo-studio';
