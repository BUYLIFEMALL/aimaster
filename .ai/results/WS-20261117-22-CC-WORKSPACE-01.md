# WS-20261117-22 결과 — 예약 링크 운영 활성화 v1.57 (CC-WORKSPACE-01)
- 승인: 주인님(Master 채팅) → Master msg_0e57ecf5a5fa. 상태: 운영 활성화 완료·실검증 1건 완료·Mac 배포 후 읽기 검수 대기.
- 코드 `3faafa33a`(9파일): 스위치 3개 ON(`BOOKING_ENABLED`·`BOOKING_UI`·`BOOKING_FORM_UI`), 시험의 OFF 경로는 시험 안에서 명시적으로 끔 + 출시 기본값 확인 3개, `APP_VERSION` v1.57 + `supabase/migrations/20261117180000_bump_version_v1_57.sql`. 포털 스위치는 OFF 그대로.
- 검사: tsc 0 → 관련 8파일 121 → 전체 vitest 49/460(aww_dev 유지) → 로컬 build exit0 50초(`/book/[...path]` 포함).
- 배포: 이 세션의 `vercel deploy`는 Claude Code 권한 검사에서 거부(우회 0) → **Master가 직접 1회** `dpl_HrBf8mQHD7hqTw62Mgs2WuowS7Px`(`ai-work-workspace-hgzm0d922`) READY·별칭 연결·소스 `3faafa33a`. 내 푸시로 생긴 aimaster 자동 빌드 `dpl_7A1mkLVFqW4YuATCbRr5jDN3rQR5`는 CANCELED(건너뛰기).
- 운영 DB 쓰기: `programs` ai-work-workspace 1행 version v1.57(07:03:00 UTC). 그 밖의 직접 SQL 쓰기 0.
- 운영 표: 회원 카드 첫 사용으로 `aww.aww_booking_pages`·`aww.aww_bookings` 생성(직접 DDL 0, 앱의 `CREATE TABLE IF NOT EXISTS`). 정의 확인: pages(user_id PK·token_hash UNIQUE·enabled·settings·created/updated), bookings(id PK·user_id·start/end·status·gcal_id·guest 3칸·final_unknown·fail_reason·notified·created/updated·before_min/after_min CHECK 0~120). 정수 칸은 이 저장소 변환 규칙으로 bigint. 권한은 `aww_app`만(다른 aww 표와 같은 서버 전용), RLS 꺼짐(서버 전용 표 공통).

## 실검증(시험 계정 `buylifemall@naver.com`, 엣지, 연결된 구글 = 이 계정에 연결된 buylifemall@gmail.com 기본 캘린더)
1. 회원 카드: v1.57 화면, 「예약 받기 켜기」 → 「✅ 예약 받는 중」, 주소 43자 형식 한 번만 표시(다시 열면 미표시). 주소 원문은 보고·기록에 남기지 않음(브라우저 도구의 탭 목록 표시는 도구 출력이라 막지 못함).
2. 공개 페이지 `/book/<토큰>`: title 「예약하기」, `robots noindex,nofollow,nocache`, `referrer no-referrer`, 11/17~ 빈 칸 160개(실제 구글 바쁨 읽기 포함).
3. 손님 제출 1회: 11/25(수) 15:00, 이름 「QA 예약 시험」, 연락처 `000-0000-0000` → 화면 「✅ 예약이 완료됐습니다」(구글 POST 200). DB: status confirmed·notified confirmed·final_unknown 0·before/after 0/0·gcal_id = `bk`+예약 UUID 32자(고정 id 일치)·30분. 전체 1줄·페이지 1·회원 1.
4. 회원 목록 「11월 25일 (수) 15:00 / 확정」, 「앞으로 30일 구글 일정 보기」(실제 읽기)에 「2026-11-25 15:00 예약: QA 예약 시험」.
5. 다시 연 공개 페이지에서 11/25 15:00 칸 사라짐(14:30·15:30 유지) — 실제 구글 일정이 바쁨으로 반영.
6. 고정 id GET(구글 캘린더 커넥터 `get_event`, 같은 계정 기본 캘린더): id `bk9ab4f3…ea95` 일치·시작/끝 15:00~15:30 일치·status confirmed·summary 이름만(연락처·메모 없음). 커넥터가 `extendedProperties`를 돌려주지 않아 `awwBookingId` 일치는 **미확인**.
7. 정리: 그 id 1개만 `delete_event`(알림 NONE) → cancelled. 앱 DB의 QA 예약 줄(시험 계정, confirmed)은 운영 데이터 삭제 승인 범위가 아니라 남김 — 받은 날 30일 뒤 자동 삭제, 그동안 시험 계정 11/25 15:00 칸 점유.
8. 375 폭: 창이 최대화라 창 줄이기 미적용 → **375px iframe**으로 확인(실기기 아님): 공개 페이지 가로 넘침 0·버튼 4열, 회원 카드 문서 넘침 0(받은 예약 표만 스크롤 틀 안에서 넓음, 의도). 요일 체크칸이 체크·글자가 양 끝으로 벌어져 보이는 모양(기존 `cs-steps` 스타일) — 다음 묶음 화면 보완 후보.
- 미검수: 실제 409(같은 id 재전송) — 앱은 같은 id를 다시 보내지 않고 시험용 재전송 경로를 만들지 않음(모의 시험만) · `awwBookingId` 숨은 속성 · 실제 휴대폰 · cron-job.org 자동 확인(새 등록 0, A안) · 손님 통지(기능 없음).

## P2 결함(열림, 수정 아님): 첫 표 생성 경합
- 관찰: 회원 카드 첫 열기에서 `bookingGet`·`bookingList`를 동시에 보내고(`Promise.all`), 두 요청이 다른 서버 인스턴스에서 `ensureTables()`의 `CREATE TABLE IF NOT EXISTS`를 동시에 실행 → `bookingList` 1건 `duplicate key value violates unique constraint "pg_type_typname_nsp_index"`(Vercel 로그 `/api/rpc/bookingList`). 표는 생성됐고 새로고침 뒤 정상 — 표가 이미 있으니 운영에서 재발 관찰 없음. **구조는 미해결**.
- 원인·정확 경로: `src/server/booking.ts` `ensureTables()`(인스턴스마다 `tablesReady` 메모리 표시뿐, DB 수준 직렬화 없음). 같은 패턴: `src/server/portal.ts` `ensureTables()`, `src/server/receipts.ts` `ensureReceiptTables()` 등 첫 사용 DDL 전반.
- 회원 노출: 화면에는 일반 문구 「요청을 처리하는 중 문제가 생겼습니다」만(기존 `koErrorBody`), DB 원문 오류는 서버 로그에만 — 화면 노출 없음 관찰.
- 격리 재현 조건: 빈 시험 DB에서 연결 두 개가 같은 `CREATE TABLE IF NOT EXISTS aww_bookings (...)`를 동시에 실행(예: `postgres` 연결 2개 `Promise.all`) → 한쪽 `pg_type_typname_nsp_index` 중복. 운영 표 삭제·재생성 재현 0.
- 최소 보완안(다음 묶음 후보, 미구현): `ensureTables` 안 DDL을 `pg_advisory_xact_lock(<고정 키>)` 트랜잭션으로 직렬화하거나, 23505/42P07을 잡아 `to_regclass`로 존재 확인 뒤 준비 완료 처리(재시도 1회). 회원 카드는 첫 실패 뒤 자동 재시도 없이 일반 문구 — 화면 재시도는 선택.

## 비용
Vercel 빌드 1회(Master 실행, 승인 범위). 로컬 build 1회·tsc·시험 무료. 실제 구글 API: POST 1·목록 GET 수 회·삭제 1(회원 본인 앱 무료 범위). AI 호출 0.
