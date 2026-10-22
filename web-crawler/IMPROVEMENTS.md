# 개선사항 원장 — 웹 크롤링 자동화 (web-crawler, 웹앱 `webapp/`)

> ※ `web-crawler/.gitignore`가 `docs/`를 제외하므로 이 원장은 폴더 최상위에 둔다.
> 2026-10-17 Claude Code(맥미니)가 `naver-blog-seo-studio` v1.69 작업 중 타 프로그램 탐색(원칙 ⑫)으로 선제 기록. 2026-10-17 디자인 리뉴얼 v1.07(스마트 매트릭스 다크)에서 #1·#2 구현, 현황판 폴더 표기 정정 완료.

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | ② UI·편의성 | 휴대폰 ☰ 메뉴 없음(원칙 19) | `webapp/src/components/layout/Sidebar.tsx` | 높음 | ✅ 구현(v1.07, 배포 대기) |
| 2 | 2026-10-17 | ② UI·편의성 | 📖 매뉴얼·`/guide` 없음(원칙 ⑦), 기본 흰 화면(Next 기본 globals) — 현황판 권장 스마트 매트릭스 다크(차콜) | `webapp/src/app/globals.css` | 중간 | ✅ 구현(v1.07, 배포 대기) |
| 3 | 2026-10-17 | ① 로직·기능 | 크롤링 실행은 별도 파이썬 서비스(`service/`, Docker) — 웹 화면에서 작업 상태(대기·진행·실패)를 더 잘 보여 주는 대시보드 필요 | `service/pipeline.py`, `jobs/` | 중간 | 제안 |
| 4 | 2026-10-17 | ③ 타 프로그램 연계 | 수집 결과를 `website-scraper`·`ghost-scraper`와 같은 스마트 매트릭스 표/카드 부품으로 보여 주고, 결과를 블로그 도구(`naver-blog-seo-studio` 기존 글 최적화)로 넘기는 연결 제안 | 같은 계열 프로그램 | 낮음 | 제안 |
| 5 | 2026-10-17 | ① 로직·기능 | **최상위 규칙(생성 데이터 30일 자동 삭제) 미적용** — `web_crawler_jobs`·결과 파일을 지우는 예약 작업(cron)·정리 코드가 없음(DB `cron.job` 조회 0건). 매뉴얼에는 30일 문구를 넣지 않음 | `webapp/src/lib/actions/jobs.ts`, Supabase `cron.job` | 높음 | ✅ 구현(v1.08, 2026-10-17 주인님 승인) — `webapp/src/app/api/cron/purge-expired/route.ts` + `vercel.json` 매일 03:17(KST). **배포·`CRON_SECRET` 설정 대기** |
| 6 | 2026-10-17 | ② UI·편의성 | 수집 중 작업이 있을 때 대시보드·작업 목록이 자동으로 새로 고쳐지지 않음 — 수십 초마다 상태 다시 읽기 제안 | `webapp/src/app/(dashboard)/jobs/page.tsx` | 중간 | 제안 |
| 7 | 2026-10-17 | ③ 타 프로그램 연계 | 완료된 엑셀을 `website-scraper` 결과 화면처럼 미리보기 표로 보여 주고, 블로그 키워드·SEO 스튜디오로 넘기는 버튼 | 같은 계열 프로그램 | 낮음 | 제안 |
| 8 | 2026-10-17 | ① 로직·기능 | **최상위 규칙 충돌 검토 필요** — `web_crawler_domain_profiles`는 회원 구분 없이 모두가 함께 쓰는 「도메인 구조 캐시」(셀렉터만 저장, 수집 데이터 아님, 현재 0건). 최상위 규칙은 「비용 절감을 이유로 전역 생성 캐시 예외를 만들지 않는다」라서, 회원별로 나누거나(`user_id` 추가) 캐시를 끄는 방향을 주인님이 정해야 함 | `service/domain_cache.py`, `webapp/supabase/migrations/0002_*.sql` | 높음 | 제안(주인님 결정 필요) |
| 9 | 2026-10-17 | ① 로직·기능 | 결과 버킷 `web-crawler-results`가 **공개(public)** — 주소를 알면 로그인 없이 엑셀을 받을 수 있음(경로에 추측 어려운 uuid가 들어가긴 함). 비공개 버킷 + 서명 주소(일정 시간만 유효)로 바꾸는 것 제안 | `service/pipeline.py` 252~263행 | 중간 | ✅ 완료 2026-10-23 v1.10(주인님 승인) — 비공개 버킷 + `/api/jobs/[id]/download` 본인 확인 뒤 10분 임시 주소 |
