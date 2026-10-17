# 예약 게시 누락 방지 3종 — 개발 플랜 (2026-10-18, Claude Code 윈도우, 주인님 승인)

## 배경
- 2026-10-18 점검에서 INSTA 포스팅은 예약 실행 장치가 아예 없었고(v1.24에서 연결), Threads 포스팅은 하루 1번만 실행(v1.18에서 5분으로)되고 있었다.
- 같은 누락이 다시 생기지 않도록 ① 지연 알림 ② 화면 안내 ③ 설정 점검 스크립트를 둔다. 진행 순서는 ③ → ① → ②.

## 대상 프로그램
| 프로그램 | 예약 글 테이블 | 실행 주기 |
|---|---|---|
| Threads 포스팅 (`threads`) | `posts` | 5분 |
| INSTA 포스팅 (`insta_auto_poster`) | `insta_posts` | 5분 |
| Threads 콘텐츠 운영 (`threads-content-ops`) | `tco_posts` | 1분 |
| Threads 쇼핑제휴 (`threads-affiliate-poster`) | `tap_posts` | 1분 |
| 네이버 카페 (`naver-cafe-poster`) | `ncafe_scheduled_sources`(반복 일정) | 5분 — ①에서 제외, ③만 |

## ③ 예약 실행 설정 점검 스크립트 (배포 없음)
- `scripts/check-scheduled-dispatch.mjs`: 예약·발행 실행 주소(`dispatch`·`generate-and-post` 계열 API)를 자동으로 찾아 각 프로그램 `vercel.json` 등록 여부와 실행 주기를 표로 보여 준다. 예약 게시 주소는 5분 이하여야 통과. `--live`는 Vercel에 실제 등록된 목록과 대조. 문제가 있으면 종료 코드 1.
- `docs/PLATFORM_PATTERNS.md` 새 프로그램 체크리스트에 추가.

## ① 예약 지연 관리자 알림 (메인 사이트, 배포 1회)
- `app/api/email/cron/scheduled-delay-check`: 4개 테이블에서 예약 시각이 10분 넘게 지났는데 `scheduled` 상태인 글 수를 프로그램별로 세고, 있으면 `SUPPORT_ADMIN_EMAIL`로 건수·가장 오래 밀린 시각만 메일(글 내용·회원 정보 제외).
- 루트 `vercel.json`에 10분마다 실행. 인증은 기존 `CRON_SECRET`(구독 만료 알림과 같은 방식), 환경변수 추가 없음.
- 메일 안전장치에 새 종류 `scheduled_delay`(1시간에 1통 — 같은 수신자·종류·제목 기준, 하루 최대 12통).
- 검수: 판정 로직 단위 시험, 빌드, 배포 후 무인증 401·실행 기록 200, 미리보기 옵션으로 메일 내용 확인. 실제 지연 글로 메일 시험은 하지 않음.

## ② 예약 화면 안내 문구 (4개 프로그램)
- 예약 시각 입력 아래: 5분 주기 "예약 시각 후 5분 안에 자동으로 발행됩니다." / 1분 주기 "예약 시각 후 1분 안에 자동으로 발행됩니다."
- 급하지 않은 변경이라 커밋만 하고 각 프로그램 다음 배포 때 함께 내보낸다(비용 규칙). 버전은 배포할 때 +0.01.

## 비용
유료 AI API 없음 · 메일은 기존 운영자 SMTP · Vercel 빌드는 ① 메인 사이트 1회(②는 다음 배포에 포함) · 10분마다 점검 호출 1번.

## 진행 기록
- ③ 완료(2026-10-18): `scripts/check-scheduled-dispatch.mjs` — 저장소 9개 주소 통과, `--live` 9개 Vercel 등록 일치, 시험 폴더로 "하루 1번"·"vercel.json 없음" 실패 감지(종료 코드 1) 확인. `docs/PLATFORM_PATTERNS.md` §34 추가.
- ① 완료(2026-10-18): `lib/scheduledDelay.ts`(4개 테이블 지연 건수, 한 테이블 실패해도 계속) + `app/api/email/cron/scheduled-delay-check`(Bearer/`?secret=` 인증, `?preview=1` 미발송) + 메일 종류 `scheduled_delay`(중복 방지 60분·하루 12통, `duplicateWindowFor`) + 양식 `scheduledDelayEmail`(건수·가장 오래된 예약 시각만) + 루트 `vercel.json` `*/10 * * * *`. 검수: `npm run test:email-guard` 통과(1시간 창·지연 판정·조회 실패 분리), 메인 사이트 빌드·배포, cron 목록 등록, 무인증·잘못된 비밀값 401, 운영 DB 4개 테이블 읽기 전용 조회 정상(지연 0건). **02:50:34 첫 자동 실행 GET 200**.
- (작업하며 아래에 추가)
