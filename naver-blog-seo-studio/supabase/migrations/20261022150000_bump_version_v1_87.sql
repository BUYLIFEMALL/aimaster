-- v1.87 (2026-10-22, BLC-08b 보완): 문체 표본의 문장 끝맺음(~요/~니다)을 AI 없이 세어 구체적인 해요체/합니다체 규칙을 생성 프롬프트에 추가. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.87', extension_version = 'v1.87', updated_at = now() where slug = 'naver-blog-seo-studio';
