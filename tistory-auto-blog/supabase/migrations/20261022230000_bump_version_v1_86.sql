-- v1.86 (2026-10-22): BLC-12 글감 URL 수집을 공용 safe-fetch로(내부 주소 차단·15초·3MB), 생성 결과 연도 보정(공용 year-policy). (openai-request-params 사본은 v1.83에서 이미 배포됨) 확장 코드 변경 없음(버전만).
update public.programs set version = 'v1.86', extension_version = 'v1.86', updated_at = now() where slug = 'tistory-auto-blog';
