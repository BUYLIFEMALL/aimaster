# WS-20261117-21 결과 — E2 예약 링크 서버 1단계 (CC-WORKSPACE-01)
- 상태: ready_review · 코드 SHA `5ed9bc2ec` (5파일) · Master 배정 msg_b19431213421 · 계획 PLAN §7-6·7-7(`94a9ed852`)
- 범위: 새 `src/server/booking.ts`·`tests/integration/booking.test.ts`, 수정 `src/server/googleCalendar.ts`(+`validToken` force 옵션, `listBusy`·`getEventById`·`insertEventWithId`)·`src/server/memberJobs.ts`(`booking.reconcile`·ownerId)·`src/app/api/cron/jobs/route.ts`(정리 한 줄). 화면·RPC 연결·스위치 켜기·운영 DDL·배포·설치·서버 재시작·build 0.

## 스위치 OFF 보장
`BOOKING_ENABLED=false`면 `bookingSlots`/`bookingSubmit` null, 회원 처리기 404, `reconcileBooking` 즉시 반환, `runBookingRetention` `{skipped:"off"}` — 모두 `ensureTables`·예약 표 질의·구글·토큰·받은 업무 호출 전. 시험 1: 표 2개 없음·fetch 0·토큰 0·받은 업무 0·예약 작업 0. (db.ts·scheduler.ts 모듈 자체는 기존 경로가 이미 불러오는 것.)

## 상태 전환
- 제출: 회원 설정 행 `FOR UPDATE` 잠금 안에서 우리 예약끼리 범위 겹침(앞뒤 준비 시간, 맞닿음 허용)·하루 최대 → `pending`.
- 잠금 밖: 토큰 실패 → `failed`(구글 0회) / `listBusy` 재확인 겹침·실패 → `failed`(POST 0) / POST(고정 id `bk`+UUID 32자):
  200 → `confirmed` · 409 → GET 4조건 일치만 `confirmed`, 다른 일정·취소·시각 다름 → `needs_check`+최종 미확인(재생성 0) · 401 → 토큰 force 1회 후 같은 id 재시도, 또 401/갱신 실패 → `failed`(auth) · 429·403 rate/userRate → 같은 id 지수 대기 최대 3회, 끝까지 거절 → `failed` · 400·403 quota/기타·404 → `failed`(재시도 0) · 0(연결 끊김·10초)·408·5xx → `needs_check`(칸 유지) + `booking.reconcile` 작업.
- 확인 작업(GET만, 다시 POST 0): 받은 시각 +1·5·30분. 일치 → `confirmed`, 404·모름 → 다음 단계, 30분 단계까지 미확정 또는 불일치 → `final_unknown=1`+회원 알림 → 회원이 「있음」(`confirmed`)/「없음」(`released`). 예약 시각 지나면 `expired`. 처리 중에 끊긴 예약(2분) → `needs_check`.
- 손님 응답: `confirmed`면 「confirmed」, `needs_check`면 「received」, 나머지 오류 문구.
- 받은 업무 알림(공용 `sendToWorkInbox` 재사용, 새 저장 경로 0): 확정·확인 필요·실패를 각 한 번(`notified` 선점). 받은 업무 보관이 1년이라 손님 이름·연락처·메모는 넣지 않고 날짜·시각만. 구글 일정에는 이름만.
- 보관: 받은 날 30일 삭제(보관 예외 회원 제외), 예약은 21일 앞까지.

## 모의 시험 증거 (`booking.test.ts` 26개)
- 순수: 한국 시간 변환, 뉴욕 02:30(없음)·01:30(두 번) 칸 없음, 준비 시간 양쪽·맞닿음, 종일, 하루 최대, 21일 제한, 응답 분류 표, 고정 id 형식.
- 켠 뒤: 토큰 한 번만·해시만 저장·rotate·끄기·다시 켜기 / 이용 기간 끝·구글 끊김 → 닫힘 / 목록 실패 → `unavailable`(빈 칸 단정 안 함) / 확정 본문(id·속성·이름만) / **두 연결 동시**: 별도 연결이 설정 행 잠금+1.5초+같은 칸 삽입 → 이쪽이 잠금을 기다린 뒤 거절, 그 칸 1건·POST 0 (**`FOR UPDATE`를 빼면 이 시험 실패 확인 후 원복**) / 하루 최대·설정 밖 시각·지난·21일 초과·입력 길이 / 재확인 겹침 POST 0 / 400·quota·403·404 / 401 재시도·force 실패 / 429 3회 / 409 일치·다른 id·시각 다름·취소 / 503·연결 끊김·408 → 확인 필요·작업 주인=회원·회원 필터만·운영 필터 제외 / GET 404 세 번에도 해제·재POST 0, 마지막 회원 알림, 「없음」 → 칸 다시 열림 / 확인 중 일정 발견 → 확정, 시각 지남 → 만료 / 두 worker 같은 작업 → GET 1번 / 회원 목록 본인 것만·끊긴 처리 중 → 확인 필요·남의 예약 고르기 404 / IP 한도 30/분·5/시간 / 30일 정리·예외 회원.
- 전체: tsc exit 0, vitest 46파일/396 통과(95초), 시험 DB만(aww_dev oid 2204849 유지). 실제 구글·메일·카톡·운영 DB 0.

## 미검수·한계
- 실제 구글 캘린더(운영 회원 앱) 응답은 모의뿐 — 공식 문서 기준 분류.
- 회원이 구글에 직접 넣는 일정과의 겹침은 제출 직전 재확인으로 창을 줄였을 뿐 원자적이지 않음(계획 7-6 4).
- 같은 프로세스 안 두 worker는 작업기 claim, 다른 프로세스는 행 잠금으로 확인(Postgres 실제 잠금 시험).

## 다음 단계(2단계, 배정 필요)
1. 회원 처리기 RPC 등록(`bookingGet/Save/Off/List/Resolve`, 기대 계정 헤더 방식).
2. `/api/cron/member`가 `@/server/booking`을 불러 `booking.reconcile` 처리기를 등록(지금은 운영 정리 경로만 불러옴 — 회원 cron에서는 처리기가 없어 작업이 그대로 남음).
3. 공개 제출로 확인 작업이 생기면 그 회원 cron-job.org를 켜는 연결(`trackMemberJobs`는 회원 요청 안에서만 추적).
4. 공개 화면 `src/app/book/[...path]/page.tsx`(noindex·X-Robots-Tag), `calendar-sync` 설정 한 칸.
5. 켜기: 주인님·Master 「운영 워크스페이스 저장소 표 2개 추가」 승인 → Mac 독립 검수 → 스위치 배포 1회.
