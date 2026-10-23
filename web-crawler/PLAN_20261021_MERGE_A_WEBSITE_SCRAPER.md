# 병합 A 플랜 — Website Scraper(`website-scraper`, `ghost-scraper/`) → 웹 크롤링 자동화(`web-crawler-saas`) (2026-10-21 Claude Code 윈도우, 부계정)

> 주인님 승인(2026-10-21): 「플랜대로 진행」. 분석: `docs/analysis-scraping-consolidation-20261021/REPORT.md` 묶음 A, 절차: `docs/PROGRAM_COMPARISON_ANALYSIS_GUIDE.md` §6. 대상 운영 ① AIMaster, DB ref `esgxyikcnnvmlhygjkth`.

1. 웹 크롤링 웹앱에 「🔎 한 페이지 분석」(`/inspect`): 서버 안전 수집(`safeFetch` 이식) + cheerio 7탭(제목·소제목·본문·표·링크·이미지·메타), 격리 프록시 미리보기에서 영역 클릭 추출, 반복 목록 AI 표(서버에서 본인 키, OpenAI·Claude·Gemini·Perplexity, 기본 최저가 모델), CSV·이미지 ZIP.
2. 버릴 단점: 키 원문 브라우저 전달(`/api/user/key` GET)·브라우저 저장·브라우저 직접 AI 호출 → 없앰. 구형 모델·Gemini 하나 → 웹 크롤링 모델 목록.
3. 옛 앱: 주소 유지, 안내 화면(→ `/inspect`), `/api/user/key` 410, 카탈로그 `is_active=false`. 코드 정리는 백업 후 나중에.
4. 권한 합치기: website-scraper 권한 회원 중 web-crawler-saas 권한이 없거나 짧은 회원에게 같은 만료일 부여(전 백업 JSON).
5. 함께 배포: 미배포 v1.08(30일 삭제)·메뉴 아이콘 → web-crawler-saas `CRON_SECRET` 새 등록(승인).
- 범위 밖(별도): 도메인 구조 캐시 회원별(Python 서비스·DB 구조).
- 버전: web-crawler-saas v1.09, website-scraper v1.13. 검수: tsc·build·배포, 크롬 관리자(분석·영역·AI 표·CSV·ZIP), 시험 계정 권한, 옛 주소 안내. 비용: AI 시험 1~3회(최저가 모델).
