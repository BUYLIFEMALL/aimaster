# 개발 플랜 — 관리자·시험 계정 30일 자동 삭제 예외 (2026-10-31)

작성: Claude Code(윈도우) `claude-win-20261029-statusbar` [역할: 미지정]. 상태: **2026-11-01 주인님 승인 — 추가 배포 없는 방식으로 변경. 1단계 DB 적용 완료(`supabase/migrations/0052_retention_exempt_accounts.sql`). §4의 2단계·3단계 B안은 하지 않음. 프로그램별 코드는 각 프로그램 다음 배포 때 함께. 조회 숨김 RLS는 미변경.** 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`).
근거: 주인님 「관리자인 buylifemall@gmail.com 계정과 테스트 계정인 buylifemall@naver.com 2개정은 30일 자동 삭제 규칙에서 예외되는 것으로 기능구현해줘」.

## 1. 현황 (저장소 코드 조사, 운영 `cron.job`·Vercel 등록 상태는 미확인)
서버 30일 삭제를 실행하는 프로그램은 43개이고, 공용 기준 코드가 없어 프로그램마다 따로 돈다.

| 구분 | 수 |
|---|---|
| Vercel 정리 라우트 | 31 |
| 인스타 실행 라우트 안에서만 정리 | 3 |
| 화면 진입 때만 정리 | 3 |
| pg_cron만 사용 | 6 |

삭제를 막는 코드 수정은 36개, 조회 숨김까지 풀려면 배포 42개가 필요하다. 삭제 제외만 보면 DB 수정으로 되는 곳은 7개다(`ai-doc-chatbot`, `blog-keyword`, `competitor-analysis`, `document-translator`, `lyric-video-studio`, `youtube-viral-studio`, `blog-neighbor-care`는 추정).

## 2. 설계
- 기준은 DB 한 곳: `profiles.retention_exempt boolean default false`. 두 계정만 true. 코드에 이메일을 적지 않는다.
- 일반 회원이 바꾸지 못하게 한다(프로필 수정 경로 점검, 필요하면 트리거로 차단).
- 정리 라우트: 삭제 전에 예외 회원 id를 읽어 제외. 표 행은 `user_id`, 파일은 경로 첫 폴더 기준.
- pg_cron: 예외 회원 제외 조건 추가.
- 조회 숨김·RLS의 30일 조건도 예외 회원은 통과. 안 그러면 자료가 남아도 화면에 안 보인다.
- 회원 격리·소유자 RLS는 그대로. 이 계정의 자료를 다른 회원에게 보이지 않는다.
- `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8 보관 기간 지정 목록에 기록(계정 단위 지정, 기간 무기한).

## 3. 위험
- 공유 버킷: `post-images`(`ai-auto-blog`, `threads`, `threads-affiliate-poster`, `tistory-auto-blog`는 추정), `insta-post-images`(`ai-influencer-studio`, `ai-webtoon-studio`, `four-cut-comics`). 함께 고쳐야 파일이 지켜진다.
- `threads-easy-planner`: 어떤 회원이 목록을 열어도 모든 회원 행을 지운다.
- 이중 경로: `portrait-photo`, `naver-blog-seo-studio`, `threads-content-ops`, `youtube-viral-studio`, `ai-influencer-studio`는 예약·진입 시 삭제를 둘 다 막는다.
- 판별 확인 필요: `smartstore-register`·`coupang-ops`·`music` 일부 표의 `user_id`, `ai-work-workspace`의 공간 단위 휴지통.
- 첫 삭제 시작 추정(함수 본문 미확인): `ai-auto-blog`·`tistory-auto-blog` 2026-10-31, `naver-blog-agent`·`threads-content-ops` 2026-11-07, `shop-detail-page` 2026-11-21. 이미 지워진 자료는 복구하지 않는다.

## 4. 순서
1. 1단계(빌드 없음): 운영 `cron.job` 대조, 플래그 추가, pg_cron·DB 함수 수정, §8 기록, 자동 롤백 시험.
2. 2단계(빌드 약 7~8회, 순차): 삭제가 임박하거나 공유 버킷을 쓰는 `ai-auto-blog`, `tistory-auto-blog`, `threads`, `threads-affiliate-poster`, `naver-blog-agent`, `threads-content-ops`, `shop-detail-page`, 필요하면 `threads-easy-planner`.
3. 3단계: 나머지 프로그램.
   - A안(추천): 코드만 커밋하고 미배포 대기로 두었다가 각 프로그램의 다음 배포 때 함께 낸다. 그 전까지 해당 프로그램의 두 계정 자료는 계속 지워질 수 있다.
   - B안: 전부 바로 순차 배포(빌드 약 34회 추가).

## 5. 검수·비용
- 검수: 프로그램별 시험·`tsc`. 삭제 대상 계산에서 두 계정 제외, 일반 회원은 그대로 삭제되는지 확인(유료 호출 없음).
- 비용: Vercel 빌드 외 없음. 저장 용량은 두 계정 자료만큼 계속 늘어난다.
- 버전: 배포하는 프로그램마다 +0.01(코드와 DB). 확장이 있는 프로그램은 manifest·ZIP·DB 버전을 함께 맞춘다.
- 제외: 회원 설치 키트(`KIT/`), `labs/`, 회원 브라우저 저장소, 보관 기간이 다른 프로그램(365일)은 이번 범위 밖.

## 6. 프로그램별 코드 반영 기록
| 날짜 | 프로그램 | 커밋 | 배포 | 내용 |
|---|---|---|---|---|
| 2026-11-02 | `naver-blog-agent` | `6c8e0eb63` | 미배포 대기 | 크론 정리에서 예외 회원의 원고·글감·이미지·비공개 사진 제외, 예외 목록을 못 읽으면 503으로 멈춤(`src/lib/retentionExempt.ts`). 시험 3개 추가. **첫 삭제 추정 2026-11-07 — 그 전에 배포가 없으면 단독 배포 검토** |
| 2026-11-02 | `naver-blog-seo-studio` | `3fa97c0f4` | 미배포 대기 | `lib/draftRetention.ts` 정리 함수 5개 — 크론은 예외 회원 제외, 회원 본인 정리는 예외 회원이면 건너뜀, 확인 실패 시 지우지 않음. 시험 3개 |
| 2026-11-02 | `ai-auto-blog`·`tistory-auto-blog` | `204080c43` | 미배포 대기 | 크론 정리에서 예외 회원의 글·이미지·글감 제외(BLOG 독립 운영 키트는 확인 생략). 시험 각 2개. 공유 버킷 `post-images`는 쓰레드 계열도 고쳐야 파일이 완전히 지켜짐(다른 세션 몫) |
| 2026-11-03 | `music` | `f4ac53ba3` | v1.49 배포(2026-11-03) | 매일 정리 라우트 네 단계(곡·기획·리믹스·리믹스 원곡) 예외 회원 제외, 못 읽으면 멈춤. 시험 3개. **10-29 첫 삭제에서 두 계정 곡 23개 이미 삭제(복구 불가). 남은 두 계정 곡 첫 삭제 예정 2026-11-20** |
| 2026-11-02 | `blog-keyword` | — | 코드 수정 불필요 | 삭제는 DB 함수(`cleanup_blog_keyword_reports`, 0052에서 예외 반영). 목록 화면의 30일 숨김 조건은 그대로라 남은 기록이 화면에 안 보임(§2 조회 숨김, 이번 범위 밖) |
| 2026-11-03 | `blog-workroom` | `f1d9e7dcc` | 미배포 대기 | 매일 정리에서 예외 회원 글·이미지 폴더 제외(못 읽으면 503), 목록·단건 조회의 30일 숨김도 예외 회원은 풂. [역할: mac-mini] |
| 2026-11-03 | `blog-content-maker` | `9198c0da8` | 미배포 대기 | 화면 진입 정리 건너뜀 + 목록·단건·확장 목록의 만료 숨김 풂(`expiryCutoff`) |
| 2026-11-03 | `naver-blog-allinone` | `0e46894fb` | 미배포 대기 | 매일 정리 제외 + 보관함 목록·단건 30일 숨김 풂 |
| 2026-11-03 | `blog-keyword` | `6c9f6d8a1` | 미배포 대기 | 위 줄의 남은 일 — 기록 목록·열기의 30일 숨김 풂 |
| 2026-11-03 | `tistory-auto-blog` | `00481371a`·시험 `8ce1156a9` | 미배포 대기 | 조회·확장 9곳의 30일 숨김 풂(`utils/retentionExempt.ts`). 확장 API 시험 44·예외 시험 2 통과 |
| 2026-11-03 | `naver-blog-seo-studio` | `4e1eab489` | 미배포 대기 | 확장 전달·보관함·자동 포스팅·입력 결과 6곳의 30일 숨김 풂(`lib/retentionExempt.ts`). 시험 158 통과 |
| 2026-11-03 | `naver-blog-agent` | `27795e295` | 미배포 대기 | 글감 목록·글감 불러오기의 만료 확인 풂. **남은 일: 비공개 사진 30일 기한**(서버 `privatePhotos.ts` + 화면 `privatePhotoInput.ts`가 「정확히 30일」을 검사 — 함께 바꿔야 함) |
| 2026-11-03 | `ai-auto-blog`·`naver-blog-auto-poster_web`·`_app` | — | 수정 불필요 | 조회 숨김 없음 / 서버 30일 정리 없음. `blog-neighbor-care`는 윈도우 blog 세션 몫(미확인) |
