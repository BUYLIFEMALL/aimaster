-- v1.22: 긴 PNG·섹션 ZIP 내려받기 이름이 한글 대신 「%EC%8B%9C…」로 저장되던 문제 수정(lib/exportDownload.ts) — DB 구조 변경 없음, 버전만.
-- 적용 대상: 운영 ① AIMaster, ref esgxyikcnnvmlhygjkth.
update public.programs set version = 'v1.22', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
