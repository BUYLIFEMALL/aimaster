-- 2026-10-21 병합 A(주인님 승인): Website Scraper → 웹 크롤링 「한 페이지 분석」. 서비스 키 REST로 적용, 기록용.
-- 1) 권한 합치기: website-scraper 권한 회원 중 web-crawler-saas 권한이 더 짧은 6명의 expires_at을 website-scraper 값으로(새로 줄 회원 0명). 백업: 저장소 밖 AIMaster_backup/merge-a-20261021
update public.user_program_access w set expires_at = s.expires_at
from public.user_program_access s
where s.program_id = (select id from public.programs where slug='website-scraper')
  and w.program_id = (select id from public.programs where slug='web-crawler-saas')
  and w.user_id = s.user_id and w.expires_at is not null and (s.expires_at is null or s.expires_at > w.expires_at);
-- 2) 버전·카탈로그
update public.programs set version='v1.09', updated_at=now() where slug='web-crawler-saas';
update public.programs set version='v1.13', is_active=false, updated_at=now() where slug='website-scraper';
-- 3) 상세 소개(🔎 한 페이지 분석 단락·특징 2번)는 관리자 화면과 같은 값으로 REST 갱신 — 이전 값은 docs/analysis-scraping-consolidation-20261021/backup-programs-before-merge-a.json
