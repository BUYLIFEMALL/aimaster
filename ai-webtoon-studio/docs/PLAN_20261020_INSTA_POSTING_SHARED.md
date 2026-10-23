# 개발 플랜 — 인스타 예약 게시 처리 코드 공용 기준 코드화 2단계 (2026-10-20, Claude Code 윈도우)

주인님 지시: 「순서대로 진행해줘」(남은 작업 ③). 1단계(2026-10-20)에서 `memberScheduler.ts`·`cronJobOrg.ts`·`schedule.ts`를 공용으로 만든 데 이어, 게시 처리(`posting.ts`)와 예약 API 4개를 공용 기준 코드로 등록한다.

## 1. 문제
- 인플루언서·웹툰·4컷의 `src/lib/instagram/posting.ts`(158줄)와 `api/instagram/{posts,dispatch,dispatch-member,scheduler}/route.ts`가 손 복사 사본 3벌이다. 오늘만 해도 취소 중복 누름·일시정지 안전 처리를 3곳에 따로 넣어야 했다.

## 2. 비교 결과 (다른 곳)
| 파일 | 다른 줄 | 처리 |
|---|---|---|
| `posting.ts` | 게시 기록 표 이름, slug를 가져오는 이름(`APP_SLUG`·`PROGRAM_SLUG`·`THIS_PROGRAM_SLUG`), 주석 | 각 폴더 `schedulerConfig.ts`의 `SCHEDULER_POSTS_TABLE`·새 `SCHEDULER_PROGRAM_SLUG`를 읽음 |
| `posts/route.ts` | 이미지 확인 함수 가져오는 파일(`slides`·`feedImage`·`feed`) | `schedulerConfig.ts`가 `MAX_INSTA_CAPTION`·`validInstaPaths`를 다시 내보냄 |
| `dispatch`·`dispatch-member` | 주석 1줄 | 주석 통일 |
| `scheduler/route.ts` | `maskApiKey` 직접 정의/가져오기 | 직접 정의로 통일 |

## 3. 범위
- 기준: `ai-webtoon-studio`(1단계와 달리 카드뉴스는 구조가 달라 제외 — `project_id`·`cardnews-images` 버킷, 별도 `posts.ts`/`publish.ts`).
- 사본: `ai-influencer-studio`, `four-cut-comics`.
- 동작 변경 없음(회원 화면·DB·요청/응답 동일). DB 구조 변경 없음.

## 4. 순서와 검수
1. 세 폴더 `schedulerConfig.ts`에 `SCHEDULER_PROGRAM_SLUG`, 이미지 확인 함수 다시 내보내기 추가
2. 웹툰 기준 5개 파일 정리 → `scripts/check-shared-modules.mjs`에 5개 등록 → `--sync`로 사본 반영 → `--check` 일치
3. 세 프로그램 `tsc`·`npm test`·`npm run build`
4. 문서: `docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md`, 각 `AGENTS.md`, `docs/HANDOFF.md`

## 5. 배포·버전·비용
- 배포 등급(공용 기준 코드 규칙): 회원 영향 없는 내부 정리 → **저장소 반영만, 각 프로그램 다음 배포 때 함께**(미배포 목록 `docs/SHARED_MODULES.md`). 그래서 버전도 그 배포 때 올린다.
- 비용: 유료 API 호출 없음, Vercel 빌드 0회(로컬 빌드만).
