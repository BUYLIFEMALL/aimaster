# 고객관리 후보 배포 사전 준비표 — SQL → 고객관리 v1.12 → 매물 알림 v1.47 (RE-CANDIDATE-RELEASE-PREFLIGHT A1)

- 담당: CC-REALTY-01 Claude(RealEstate), 2026-11-20. 배정 Master `msg_b2af97627801`. **기존 자료만 읽음** — 새 설치·빌드·SQL·배포 0.
- 근거 정본: 설계 `realty-client-desk/docs/PLAN_20261120_C1_LISTING_HANDOFF.md` §6(6-1 순서·6-2 롤백·6-3 실화면), 가드 격리 증거 `.ai/results/RE-CRM-C1-GUARD-FIXTURE-CC-REALTY-01.md`, Next 조사 `.ai/results/RE-NEXT-UPGRADE-READBACK-CC-REALTY-01.md`, 호환판 `realty-client-desk/docs/rollback/README.md`.
- 실행 승인(별도): SQL 1회·빌드 2회는 Master 일괄 목록·주인님 승인 뒤. 단계마다 앞 단계 합격 뒤에만 다음 단계.

## 한 표

| 단계 | 고정 SHA(실을 소스) | 실리는 커밋 | 사전 확인 | 합격 기준 | 롤백 대상 | 중단 조건 |
|---|---|---|---|---|---|---|
| 0. 공통 사전 | 두 폴더 HEAD: 고객관리 `3655b0fc4`, 매물 알림 `d3619ba50`(2026-11-20 13:53, 미커밋 0) | — | 팀 빌드 BUILDING/QUEUED/INITIALIZING 0, 두 폴더 `git status` 비어 있음, 이 SHA 이후 새 커밋 있으면 표 다시 대조 | 위 셋 모두 | — | 남의 미커밋·새 커밋·대기 빌드 |
| 1. 운영 SQL | `realty-client-desk/supabase/migrations/20261120010000_listing_candidate_status.sql`(커밋 `7cc7d5a3c`) | — | PLAN 6-1 0번 읽기: 제약 이름 `realty_desk_listings_status_check`·허용 값 3개, `status` 분포(「후보」 0) | 적용 뒤 같은 읽기로 허용 값 4개(광고 중·계약·내림·후보), 기존 행 수·분포 변화 0 | 제약 그대로 둠(넓힌 제약은 옛 코드와 호환, 후보 0건) — 좁히기는 PLAN §6-2 가드 절차·별도 승인만 | 제약 이름·정의 다름, 이미 「후보」 행 존재, SQL 오류·권한 오류, 적용 뒤 값 4개 아님 |
| 2. 고객관리 v1.12 | `3655b0fc4` + 배포 때 만드는 버전 커밋(`src/lib/version.ts` v1.12 + 버전 SQL 파일) | `fdd7a6c2d`·`a6982d151`(L-3 고객별 맞는 매물), `7cc7d5a3c`(C-1 받기·후보 전용 저장), `11d6b69ff`·`b2ea91b68`·`8d6a92593`(상태 변경 결과 표시·동기화), `3655b0fc4`(Next 16.4.6) | 1단계 합격, `npx tsc --noEmit`·`npm test`(62)·`npm run build`, `pending-check`·저작권 고지 확인 | Ready·별칭 `realty-client-desk.buylife.xyz`, `/login` 200, PLAN 6-3 **R1~R3**(수동 등록 「광고 중」·상태 4개·정리), 상태 변경 문구 표시, H1(COOP 없음), DB `programs.version` v1.12 | 직전 운영 `realty-client-desk-lqbf3nlx0`(v1.11, 버전 커밋 `86955ace6`) — **단 PLAN §6-2 판단 표대로**: v1.12에서는 상태 선택으로 「후보」를 만들 수 있으므로 「후보」 행이 생긴 뒤에는 원본 v1.11 대신 **호환판**(`docs/rollback/v1.11-candidate-compat.patch`, 커밋 `0feb07bc8`, SHA-256 앞16 `c18dd683e60e1046`) 빌드 승인 뒤 배포 | 빌드 실패, 500·로그인 튕김, R1 수동 등록 회귀, 후보 저장 제약 오류(=1단계 미적용), 후보 행에 발송 가능 |
| 3. 매물 알림 v1.47 | `d3619ba50` + 배포 때 만드는 버전 커밋(`lib/version.ts` v1.47, `extension/manifest.json` 1.47.0/v1.47, `scripts/build-extension-archive.mjs`로 ZIP, 버전 SQL: `version`·`extension_version`·`extension_download_url`) | `a6e11f679`(관심 지역 제안 3단계), `b6bb2c4ae`(C-1 보내기), `d3619ba50`(Next 16.4.6) | 2단계 합격, `npx tsc --noEmit`·`npm test`(131)·`npm run build` | Ready·별칭, `node scripts/check-extension-release.mjs realty-listing-alert` OK, PLAN 6-3 **E1~E11**(같은 계정 채움·주소/기록에 값 없음·opener 끊김·로그아웃 복귀·다른 계정·팝업 차단·확인란 우회 거부·후보 광고/발송 0·응답 불명·중복 경고·비우기), 점검표 **C1~C3**·X1 | 직전 운영 `realty-listing-alert-6kxzrn0il`(v1.46, 11-17 — 운영 목록 날짜로 대조, 배포 ID 기록은 없음) + ZIP·DB `extension_version`을 v1.46으로 되돌리기(데이터 영향 0) | E5(다른 계정으로 채움)·E7(확인란 없이 저장)·E8(후보 발송 가능) 실패 → 즉시 매물 알림부터 되돌리고 고객관리는 §6-2대로, 확장 버전 불일치 |

## 순서·공통 규칙
- 순서 고정: 1 → 2 → 3. 앞 단계가 합격 기준을 모두 통과하고 팀 빌드 0을 다시 확인한 뒤 다음 단계. 2만 나간 상태에서는 매물 알림 버튼이 없어 후보 유입 0(상태 선택 「후보」는 회원 조작으로 가능 — 광고·발송 0).
- 자동 재시도 없음. SQL 커밋 불명은 다시 실행하지 않고 먼저 읽기로 확인(PLAN G6과 같은 원칙).
- 버전은 실제 배포 때 한 번만 올림(v1.12·v1.47). 매물 알림은 확장 코드 변경이 없어도 manifest·ZIP·DB를 맞춤(원칙 10).

## 근거 상태(링크만)
- 상태 폼 `8d6a92593`: Mac 62/62·상태 큐 독립 재검수 수락(Master `msg_b2af97627801`).
- Next 16.4.6 `3655b0fc4`·`d3619ba50`: Mac 잠금·버전 정적 수락 — **독립 빌드·감사는 미실행**(이 회차 로컬 결과만: audit 0, 빌드 2회 경고 없음).
- 호환판 `0feb07bc8`: Mac 격리 적용·44/44·일반→후보 차단 수락, 실제 빌드·UI·DB 미검증.
- 가드: 격리 5/5(`2473c1747`), 운영 미검증 — 옛 코드 롤백 차단 상태는 PLAN §6-2 「선행 차단 기록」 그대로.

## 08:00 후속
- 실거래 v1.62 배포가 2026-11-20 11:22이라 오늘 08:00 회차와 무관. 첫 확인 대상은 **2026-11-21 08:00** 뉴스 회차 기록 — 기록이 생긴 뒤 읽기로 사설 뒤로·요약 지역당 상한 반영을 확인(지금은 기록 없음, 확인 0).
