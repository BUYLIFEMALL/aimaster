# 데이터수집 프로그램 통합·기능 확장 작업표

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 진행 상태는 `git log`와 각 프로그램 `AGENTS.md`로 확인했고, 운영 DB는 이번 작성에서 조회하지 않았다. 담당 역할이 정해지면 그 세션이 이어서 관리한다.

대상은 **AIMaster 운영**(공통 DB ref `esgxyikcnnvmlhygjkth`). 이 문서 작성에서는 코드·DB·권한·버전·배포를 바꾸지 않았다.

## 현재 위치와 읽는 순서

1. [데이터수집 자동화 완성 기준](SCRAPING_COMPLETION_POLICY.md) — 끝났다고 말할 조건·하지 않을 것.
2. [데이터수집 기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md) — 지금 있는 기능·기준 코드 위치·확장 후보.
3. 이 작업표 — 묶음 번호와 진행 상태.
4. 1차 근거: [스크래핑 통합 분석 보고서](analysis-scraping-consolidation-20261021/REPORT.md)(2026-10-21, 12개 → 8개 결정, 비교 분석 매뉴얼의 기준 사례).

**2026-10-24 현재:** 「데이터수집」 카테고리에 남은 공개 프로그램은 웹 크롤링 자동화(`web-crawler-saas`) 하나다. Website Scraper(`website-scraper`)는 병합 A로 숨김(`is_active=false`)이다. 보고서가 다룬 나머지 10개는 병합되거나 다른 카테고리로 옮겨졌다.

## 1. 병합 묶음 (보고서 §2·§6 결정)

| 묶음 | 내용 | 진행 | 근거 커밋·버전 | 남은 일 |
|---|---|---|---|---|
| **A 웹 데이터 수집** | Website Scraper → 웹 크롤링 자동화 「🔎 한 페이지 분석」 | ✅ 완료 2026-10-21 | `29f9a3a5c`(기능) · `cbcd8a701`(인수인계) · web-crawler-saas v1.09 · website-scraper v1.13(안내·API 410·숨김) · DB 기록 `web-crawler/supabase/migrations/20261021_merge_a_v1_09.sql` | 옛 `ghost-scraper/` 코드 정리(T-08) |
| B 글쓰기 | 페르소나 문체 → AI 글쓰기 에디터 「🎚️ 문체 바꾸기」 | ✅ 완료 2026-10-21 | `85020e791` · ai-writing-editor v1.11 · persona-style-studio v1.09 | 이 카테고리 밖(업무자동화로 이동) |
| C 프롬프트 | 프롬프트 템플릿 → AI Prompt 「📁 내 템플릿 보관함」 | ✅ 완료 2026-10-21 | `f0a3f529e`·`4f85bbae6` · ai-prompt-studio v1.07 · prompt-template-studio v1.06 | 이 카테고리 밖(AI 프롬프트로 이동) |
| D 웹 UI | AI 웹 UI → UI Canvas 갤러리 + React·Tailwind 코드 내보내기 | ✅ 완료 2026-10-21 | `809264a72`·`160f148fb` · ui-canvas v1.11 · ai-web-ui(`react-ui-showcase`) v1.06 | 이 카테고리 밖(디자인으로 이동) |
| 연결 | 랜딩페이지 기획 → 「UI Canvas로 보내 다듬기」 | ✅ 완료 2026-10-21 | `48fb4c627` · landing-architect v1.11 | — |
| 카테고리 이동 1 | 시네마틱 스토리보드 → 「이미지」 | ✅ 완료 2026-10-21 | DB만(보고서 §6, 백업 `D:\Antigravity\AIMaster_backup\category-move-20261021`) | — |
| 카테고리 이동 2 | `ai-prompt-studio` → 🆕 AI 프롬프트, `ai-writing-editor`·`markdown-studio`·`ai-slide-builder` → 업무자동화, `ui-canvas` → 디자인 | ✅ 완료 2026-10-24 | `2772a096f` · `supabase/migrations/0042_categories_ai_prompt_personality.sql`([카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 21~26행) | — |
| 이름 변경 | 「데이터수집\|기획」 → 「데이터수집」(slug `scraping&plan` 유지) | ✅ 반영됨 | `supabase/migrations/0045_category_rename_scraping.sql` — 2026-10-24 주인님 승인, 운영 DB 반영 확인(크롬 SQL 편집기 결과 `데이터수집 / scraping&plan`) |

독립으로 남긴 프로그램(보고서 §3): AI 랜딩페이지 기획·AI 슬라이드·마크다운 문서·시네마틱 스토리보드 — 모두 지금은 다른 카테고리라 이 작업표의 대상이 아니다.

## 2. 데이터수집 후속 작업 (번호·진행 상태)

번호 `T-nn`은 이 문서에서 새로 붙였다. 「대기」는 시작 전, 「결정 대기」는 주인님 결정이 먼저 필요한 것이다. 근거와 자세한 이유는 [기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md) §6과 `web-crawler/IMPROVEMENTS.md` 번호를 함께 적었다.

| 번호 | 작업 | 상태 | 근거 | 비용·위험 | 다음 첫 단계 |
|---|---|---|---|---|---|
| T-01 | 결과 버킷 비공개 + 10분 임시 주소 | ✅ 완료 2026-10-23 | `8515b3bdf` · v1.10 · `IMPROVEMENTS.md` #9 | — | 첫 실제 완료 작업이 나오면 내려받기 확인(인수인계에 「미확인」으로 남아 있음) |
| T-02 | 생성 데이터 30일 자동 삭제 | ✅ 완료(코드 v1.08 `9204a3069`, 첫 배포 v1.09) | `IMPROVEMENTS.md` #5 | — | 정리 경로 실행 기록(삭제 건수) 확인 — **확인 필요** |
| T-03 | 도메인 구조 캐시 회원별 전환 또는 끄기 | **결정 대기** | `IMPROVEMENTS.md` #8, 비교표 R4 | 표 구조 변경 + 크롤링 서버(Render) 재배포 | 주인님께 「회원별로 나누기 / 끄기」 중 선택 여쭘 |
| T-04 | 웹앱 Next.js 16.2.11 → 16.4.2 보안 업데이트 | 대기 | `docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md` 묶음 E(미커밋 `web-crawler/AGENTS.md` 때문에 제외됨 — 그 변경은 빈 줄 1개 삭제뿐) | Vercel 빌드 1회(사전 승인) | 미커밋 변경 주인 확인 → `npm install next@16.4.2` → tsc·build → 배포 |
| T-05 | 한 페이지 분석에 robots.txt 확인 | 대기 | 완성 기준 §2 조건 4, 비교표 R1 | 웹앱 배포(모아서 배포 가능) | `/api/inspect`에 robots 판정 추가 플랜 |
| T-06 | `Crawl-delay` 반영 + 다음 페이지 robots 확인 | 대기 | 비교표 R2·R3 | 크롤링 서버 재배포 | `pipeline.py` `RateLimiter` 지연값 계산 플랜 |
| T-07 | 대시보드 자동 새로고침·완료 엑셀 미리보기 | 대기 | `IMPROVEMENTS.md` #6·#7, 비교표 R6·R7 | 웹앱 배포 | 작업 목록의 5초 새로고침을 대시보드에 재사용 |
| T-08 | 옛 `ghost-scraper/` 코드 정리 | 대기 | `ghost-scraper/AGENTS.md` v1.13 「정리는 백업 폴더 + git 태그 뒤」 · 2026-10-24 `D:\Antigravity\AIMaster_backup\retired-programs\`에 없음 · 관련 git 태그 없음 | 주소 유지 필요(옛 주소 안내), 삭제는 사전 승인 | 백업 폴더 복사 + 태그 → 안내 화면·410만 남기고 정리 플랜 |
| T-09 | 옛 Website Scraper `/login` 404 점검 | 대기(다른 묶음 담당) | 보안 분담표 묶음 C | 고치면 빌드 1회 | 묶음 C 담당 세션 결과 확인 |
| T-10 | 수집 결과 → 블로그·SEO 도구로 넘기기 | 대기(아이디어) | `IMPROVEMENTS.md` #4·#7, 비교표 R8 | 완성 기준 §4-2(본문 복제 금지)와 함께 설계 | [공통 아이디어 표](PROGRAM_IDEA_BACKLOG.md)에 등록 여부 확인 |
| T-11 | 프로그램 비교표·카테고리 지도 값 맞추기 | 대기(문서) | 비교표가 웹 크롤링 v1.08·Website Scraper v1.12/「배포 대기」로 적혀 있음(코드 v1.10·v1.14 배포됨) | 없음 | 담당 세션이 안전 커밋 도우미로 [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 38·43·391·450행 갱신 |
| T-12 | 카테고리 담당 역할 지정 | **결정 대기** | [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 120행 | 없음 | 주인님께 담당 역할 여쭘 |

## 3. 진행 규칙

- 한 번에 하나씩 끝낸다(플랜 → 구현 → 로컬 검사 → 커밋 → 배포 규칙에 따라 배포 또는 「미배포 대기」 → 화면 검수 → 문서). 작은 수정은 모았다가 배포한다.
- 웹앱(Vercel)과 크롤링 서버(Render)는 따로 배포된다. 둘 다 바뀌는 작업은 플랜에 두 배포를 모두 적는다.
- 작업이 끝나면 이 표의 상태·근거 커밋, [기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md) 해당 칸, `web-crawler/IMPROVEMENTS.md` 해당 번호를 같은 커밋에서 고친다.

## 4. 변경 이력

- 2026-10-24 초안 작성(claude-win-dotori [역할: analysis-planning]). 코드·DB·배포 변경 없음.
