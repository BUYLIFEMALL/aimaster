# 개발 플랜 — 예약 발행 실행 방식 2가지 선택 (AIMaster 제공 / 회원 본인 cron-job.org) — 2026-10-19 Claude Code(윈도우)

> 상태: **✅ 승인·적용(v2.07, 2026-10-19)** — 최종 설계는 루트 `docs/SCHEDULER_POLICY.md`(설정은 키만·포스팅 쪽 예약·자동 켜기/끄기)로 바뀜. 아래는 최초 플랜 원본. 2026-10-19 주인님 추가 지시 「예약 기능은 회원 본인 cron-job.org 키 등록 후 사용」 → ①(AIMaster 제공)은 관리자 지정 시에만, 기본은 ②. 전체 프로그램 검토: `docs/MEMBER_CRONJOB_SCHEDULER_REVIEW_20261019.md`

## 1. 배경·문제
- 지금 예약 발행은 운영자(주인님) Vercel Pro의 1분 예약 호출(`vercel.json` `* * * * *`) 하나가 **모든 회원**의 예약 글을 발행한다.
- 최상단 규칙: 회원은 본인 키·본인 계정으로 쓰고, **AIMaster가 구축한 자원은 관리자가 지정한 프로그램만** 쓴다(주인님 2026-10-19 재확인). → 회원이 **본인 cron-job.org(무료) API 키**로 예약 발행을 돌리는 선택지를 준다.
- 강의 키트(`labs/kit-threads`)에 같은 기능(B 방식)을 먼저 구현·배포함 — 그대로 옮기되 **다회원 사이트에 맞게 보안 설계를 바꾼다**(아래 3).

## 2. 회원에게 보이는 것 (API키등록·플랫폼연동 → ⏰ 예약 발행 실행 방식)
| 선택 | 설명 | 조건 |
|---|---|---|
| **① AIMaster 제공 예약 실행** | 지금처럼 예약만 걸면 됨(운영자 Vercel 1분 호출) | 관리자가 이 프로그램을 「AIMaster 제공 자원 사용」으로 지정했을 때만 표시·동작 |
| **② 내 cron-job.org로 실행(무료)** | cron-job.org 가입 → API 키 넣고 「연결하기」 → 프로그램이 회원 cron-job.org 계정에 1분 작업 자동 생성 | 항상 가능 |
- 관리자 지정이 꺼지면 ①은 숨기고 「② 연결이 필요합니다」 안내. ②를 고른 회원의 글은 ①(운영자 호출)이 발행하지 않는다(회원 자원으로만).
- cron-job.org 키는 **공용 연동 저장소 `user_api_keys`(provider `cronjob_org_api_key`)** 에 저장 → 다른 프로그램이 예약 기능을 만들 때 재사용(회원 연동 정보 공용 저장 규칙).

## 3. 보안 설계 (키트와 다른 점)
- 키트는 사이트 비밀값 `CRON_SECRET`을 cron-job.org에 넣었지만, 다회원 사이트에서 그러면 **회원이 사이트 비밀값을 볼 수 있다** → 금지.
- 대신 회원마다 **회원 전용 실행 토큰**(무작위 32바이트)을 만들어 그 회원 cron-job.org 작업에만 넣고, DB에는 **해시만** 저장.
- 새 주소 `/api/threads-content-ops/dispatch-member`(GET, `Authorization: Bearer <회원 토큰>`) → 토큰 해시로 회원을 찾아 **그 회원의 예약 글만** 발행. 다른 회원 글·전체 실행 불가. 토큰은 「다시 연결」 때마다 새로 발급(이전 토큰 무효).
- 중복 발행 없음: 기존 실행기가 글마다 `scheduled → publishing`을 한 번만 성공시키는 구조(확인함).

## 4. 구현 순서 (운영 폴더 `threads-content-ops/`)
1. DB(운영 `esgxyikcnnvmlhygjkth`, 승인 후): ① `user_api_keys_provider_check`에 `cronjob_org_api_key` 추가(현재 목록 읽어 값만 추가) ② 새 표 `tco_member_scheduler`(user_id PK, mode `platform|cronjob`, token_hash, cronjob_job_id, updated_at, RLS 본인만) ③ 관리자 지정값: `programs` 행의 설정(예: `detail_sections` 외 별도 칸 대신 **환경변수 `TCO_PLATFORM_SCHEDULER=on`** 으로 1차 구현, 관리자 화면 토글은 2차) — 마이그레이션 SQL을 `supabase/migrations/`에 남김.
2. `lib/cronJobOrg.ts`(키트 것 재사용), `lib/scheduledDispatch.ts`에 `userId`·`excludeCronjobMembers` 옵션 추가.
3. `app/api/threads-content-ops/dispatch-member/route.ts` 신설, 기존 `dispatch-scheduled`는 ②를 고른 회원 제외.
4. 서버 액션: 연결(키 확인·저장·토큰 발급·작업 생성/갱신)·상태 확인·해제·방식 선택. 모두 `checkProgramAccessApi` 권한 확인 + `force-dynamic`.
5. 화면: 설정 탭 「⏰ 예약 발행 실행 방식」(키트 화면 재사용, `text-[#ffffff]` 버튼), 대시보드 예약 칸 안내, 예약 버튼 옆 「실행 방식 미설정」 경고.
6. 사용 매뉴얼(`UsageGuide`) 예약 FAQ 갱신.

## 5. 검수
- `tsc`·기존 테스트, 로컬 빌드.
- 크롬(회원 테스트 계정 `buylifemall@naver.com`): ② 연결 → cron-job.org 작업 생성 확인 → 3분 뒤 예약 글 1건 자동 발행 확인(실제 Threads 공개 글 — 주인님 확인 후) → 해제 시 작업 삭제 확인.
- 다른 회원 토큰으로 내 글이 발행되지 않는지, 잘못된 토큰 401 확인.

## 6. 비용
| 항목 | 비용 |
|---|---|
| cron-job.org | 무료(회원 본인 계정, API 하루 100회) |
| 운영자 Vercel | **회원이 ②를 써도 호출되는 함수는 운영자 Vercel에서 돈다** → 함수 실행 비용은 운영자 몫 그대로(1분 1회·회원 수만큼 늘어남). ①은 1분 1회로 전 회원 처리라 오히려 더 적다. |
| 개발·시험 | 유료 API 없음(Threads 발행만) |
| 배포 | 운영 1회(+수정 시) |

## 7. 버전·배포·인수인계
- `v2.06 → v2.07`(코드+DB `programs.version`), 운영 배포 1회, `AGENTS.md`·`docs/HANDOFF.md`·`docs/MEMBER_INTEGRATIONS.md`(cron-job.org 키 공용 항목) 기록, ERROR_LESSONS 해당 시.
