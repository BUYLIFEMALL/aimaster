# 개선사항 원장 — 웹 크롤링 자동화 (web-crawler, 웹앱 `webapp/`)

> ※ `web-crawler/.gitignore`가 `docs/`를 제외하므로 이 원장은 폴더 최상위에 둔다.
> 2026-10-17 Claude Code(맥미니)가 `naver-blog-seo-studio` v1.69 작업 중 타 프로그램 탐색(원칙 ⑫)으로 선제 기록. 아직 디자인 리뉴얼 전(DESIGN.md 42번 ⚪). **현황판 폴더 표기 `web-crawler-saas`는 실제 폴더 `web-crawler/webapp`과 다름 — 리뉴얼 때 정정 필요.**

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | ② UI·편의성 | 휴대폰 ☰ 메뉴 없음(원칙 19) | `webapp/src/components/layout/Sidebar.tsx` | 높음 | 제안 |
| 2 | 2026-10-17 | ② UI·편의성 | 📖 매뉴얼·`/guide` 없음(원칙 ⑦), 기본 흰 화면(Next 기본 globals) — 현황판 권장 스마트 매트릭스 다크(차콜) | `webapp/src/app/globals.css` | 중간 | 제안 |
| 3 | 2026-10-17 | ① 로직·기능 | 크롤링 실행은 별도 파이썬 서비스(`service/`, Docker) — 웹 화면에서 작업 상태(대기·진행·실패)를 더 잘 보여 주는 대시보드 필요 | `service/pipeline.py`, `jobs/` | 중간 | 제안 |
| 4 | 2026-10-17 | ③ 타 프로그램 연계 | 수집 결과를 `website-scraper`·`ghost-scraper`와 같은 스마트 매트릭스 표/카드 부품으로 보여 주고, 결과를 블로그 도구(`naver-blog-seo-studio` 기존 글 최적화)로 넘기는 연결 제안 | 같은 계열 프로그램 | 낮음 | 제안 |
