# 개발 플랜 — 회원 예약 실행 방식(`memberScheduler.ts`) 15개 프로그램 공용 기준 코드 하나로 (2026-10-20, Claude Code 윈도우)

주인님 지시: 「순서대로 진행해줘」(남은 작업 ⑤). 오늘 오전 「운영 12개 적용」 뒤 새 사본이 빠진 사고(`docs/ERROR_LESSONS.md` 2026-10-20)의 재발 방지.

## 1. 현황
- 인스타 4개(카드뉴스·인플루언서·웹툰·4컷)는 이미 공용 `insta-member-scheduler`(기준 `cardnews-studio/src/lib/instagram/memberScheduler.ts`, 값은 `schedulerConfig.ts`).
- 나머지 운영 11개는 손 복사 사본: 예약형 `threads-content-ops`·`threads`·`insta_auto_poster`·`threads-affiliate-poster`, 정기형 `booking-reminder`·`crm-google-form`·`kakao_auto_poster`·`naver-cafe-poster`·`stepmail`·`trending-product-finder`·`youtube-auto-reply`. (`labs/kit-threads`는 Lab 프로젝트라 제외)
- 비교(줄바꿈 무시): 코드 차이는 전부 값 — 사이트 주소, 실행 방식 표, 토큰 앞글자, 관리자 끄기 환경변수, `cronJobOrg` 위치, 설치 키트 여부(`IS_STANDALONE`: threads-content-ops·insta_auto_poster·threads-affiliate-poster), 「남은 일」 세기(예약 글 수 / 켜진 규칙 수 / stepmail은 이미 보낸 한 번만 캠페인 제외 / 상품소싱은 관심 목록+알림 상품 합). 정기형의 추가 함수로 보였던 것도 같은 `ensureMemberSchedulerRunning`(주석만 다름).

## 2. 방법
- 기준은 이미 값 분리가 된 카드뉴스 `memberScheduler.ts` 하나. 두 값을 설정으로 더 뺀다: `SCHEDULER_IS_STANDALONE`(키트면 기본 cron-job.org·Vercel은 `=on`일 때만·키트 안내 문구), `countRemainingWork(service, userId)`(「남은 일」). 가져오기는 같은 폴더 상대 경로(`./cronJobOrg`·`./schedulerConfig`).
- 11개 프로그램은 `memberScheduler.ts` 옆에 `schedulerConfig.ts`를 새로 만들어 지금 값 그대로 옮기고(`MEMBER_DISPATCH_PATH`는 각 `cronJobOrg.ts`에서 다시 내보냄), `memberScheduler.ts`는 공용 사본으로 바꾼다. 인스타 4개 설정에는 두 값만 추가.
- 등록 id는 `member-scheduler`(구 `insta-member-scheduler`)로 넓힌다.

## 3. 바뀌는 동작
- 없음. 유일한 차이: 운영(키트 아님) 사이트에서 「Vercel 호출이 꺼져 있다」 오류 문구가 threads-content-ops·threads-affiliate-poster는 키트 안내가 빠진 「내 cron-job.org」 문구로 통일(관리자가 Vercel 방식을 끈 경우에만 보임).

## 4. 검수
- 15개 프로그램 `tsc`·테스트·`build`, `check-shared-modules.mjs` 일치, 프로그램별 설정 값이 원래 파일 값과 같은지 표로 대조.
- 설치 키트 DB 대조(`python scripts/make_lecture_kit.py --check-only`)로 키트 3개 프로그램 영향 확인.

## 5. 배포·비용
- 내부 정리 → 저장소 반영만, 각 프로그램 다음 배포 때 함께(버전도 그때). 다음 배포 때 그 프로그램의 「⏰ 예약」 상태 화면과 가짜 토큰 401을 확인.
- 비용 없음(유료 API 0, Vercel 빌드 0).
