# B2BBackend 인수인계 — 메인 PC 세션 → Sub PC 세션 (2026-11-19)

- 넘기는 쪽: Claude(B2BBackend) `CC-B2B-BACK-01`, 메인 윈도우 PC 세션 `claude-win-20261025-workspace`
- 받는 쪽: Sub PC 세션(주인님 지정). 지휘: Codex(Master) `run_6e348395e1fe`(Master 터미널 `term_d8c5d7ed-7c8e-4a20-a22f-8f3919ad3a5a`)
- 역할 파일: [docs/roles/mall-builder.md](../../docs/roles/mall-builder.md) · 프로그램 지침: [mall-builder/AGENTS.md](../AGENTS.md)
- 이 문서만 읽으면 이어서 할 수 있게 썼다. 상세 근거는 각 줄의 링크·커밋.

## 0. 먼저 지킬 것 (받는 세션 필독)
1. **Sub PC 작업 수준 확인**: 루트 `CLAUDE.md`의 「Admin(마스터) PC = 맥미니 수준」 규칙이 Sub PC에도 해당하는지 Master에 먼저 확인한다. 해당하면 Sub PC는 코드·문서 편집·내 파일 커밋까지만 하고, `npm`/`next dev`/빌드/배포/운영 DB 쓰기/Docker 시험은 메인 PC 세션에 요청한다.
2. **Docker 합성 시험은 메인 PC에만 있다**: 시험 DB 컨테이너 `aww-pg-test`는 메인 PC의 `127.0.0.1:55432`이고, 시험 스크립트는 127.0.0.1만 허용한다. Sub PC에서 같은 시험을 돌리려면 Sub PC에 같은 컨테이너가 있어야 한다(없으면 메인 PC 세션에 실행 요청).
3. 공통: 키·비밀번호 출력 금지, `.env*` 쓰기 금지, 남의 미커밋 파일 비침범, `git reset/checkout/stash`·`--no-verify`·force·push 금지(푸시는 Master 순번), 운영·Lab DB 쓰기/Storage/빌드/배포/패키지 설치/키 등록/방화벽은 승인 뒤만. 커밋은 `node scripts/commit-paths.mjs "<msg>" <경로> --as <세션>`(메시지 끝 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), 공용 문서는 `scripts/safe-commit.mjs`.
4. 보고는 한국어 존댓말, 동그라미 숫자 금지, 끝에 「비용: 없습니다/…」. Master 회신은 `orca orchestration reply --id <msg> --body "..." --json`(본문에 큰따옴표 쓰지 않음). 새 메시지는 `orca orchestration check --terminal <내 터미널> --full --json`.
5. **세션이 바뀌었음을 Master에 먼저 알린다**(새 터미널 핸들 전달) — Master 지시는 지금 메인 PC 터미널 `term_46946865-f9aa-4e38-a14f-daa1f320dd41`로 오고 있다.

## 1. 오늘(11-19) 끝낸 일

| 작업 | 결과 | 커밋 | 상태 |
|---|---|---|---|
| M3 사진 적용 데이터 계층(0107) | Mac 독립 최종 소스 검수 통과(`msg_691fa1940926`), 같은 판 재시험 불필요 | `f0eaf784c` | 후속 6건 각각 승인 대기 |
| B2B-20261119-MALL-STORAGE 설계 | 쇼핑몰 4버킷이 메인 용량 집계에 안 잡히거나(사진) 손님에게 잘못 잡히는(서류) 문제 분석, 결정 4건 주인님 확정(공급사 사진·손님 서류 = 몰 대표, 초과 시 안내만, 제안 버킷 포함) | `34a5df474`·`705316994` | 완료 |
| 0077 측정 함수 로컬 소스 | 쇼핑몰 4버킷 → 몰 대표 귀속, 집합 방식(전체 4.9→4.5초, 몰 대표 한 명 12→28ms), 더 새 측정 덮어쓰기 방지, 전체 측정 끝 0 처리 「이번 실행 전 행만」, 위젯 버킷 이름 4개 | `d96833385`(점유)·`214fc6514`·`592b7484a` | **Master 로컬 검수 수락**, 운영 미적용 |
| 0077 운영 인수인계 | 트랜잭션 경계·양도 절차·적용 전 확인·되돌리기 순서 | `055b38a7c` | 완료(Master `9a38b7455`로 마감·릴리스 조건 기록) |

- 설계·인수인계 원문: [DESIGN_20261119_MALL_STORAGE_CENTRAL_USAGE.md](DESIGN_20261119_MALL_STORAGE_CENTRAL_USAGE.md) (7절이 운영 적용 인수인계)
- 0077 파일: `supabase/migrations/0077_storage_measure_mall_owner.sql`, 시험 `supabase/tests/storage_measure_mall_owner.check.mjs`(실행: `STORAGE_FX_PG_PASSWORD=<컨테이너 비밀번호> node supabase/tests/storage_measure_mall_owner.check.mjs run` — 비밀번호는 출력하지 않음), 위젯 이름 `lib/storage/memberStorage.ts`
- 0076(정리 후보에서 `mall-builder-private` 제외)은 Workspace 세션 몫(`cc25a7cc1`), 손대지 않는다.

## 2. 지금 돌고 있는 것 (메인 PC)
- **3210 검수 서버** `next dev -p 3210 -H 100.124.125.70`(Tailscale 전용), PID **43784**, 기준 `mall-builder/src` `ad046c1eb`, 주소 http://100.124.125.70:3210 — B2B-20261119-ADMINUI 맥미니 CX-QA-01 실화면 검수용.
  - 맥미니 검수 끝 신호가 오면 **메인 PC에서** 이 PID만 끈다(Sub PC에서는 끌 수 없음). 소유 확인: `Get-CimInstance Win32_Process -Filter "ProcessId=43784"` 명령줄에 `mall-builder` + `start-server.js` → `Stop-Process -Id 43784`.
  - PC 메모리가 빠듯해(남은 약 2.7GB) Claude Code가 백그라운드 작업을 회수할 수 있다. 서버가 꺼지면 임의로 다시 띄우지 말고 먼저 보고.

## 3. 남은 일 (우선순위·기다리는 것)

| 순서 | 작업 | 기다리는 것 | 다음 첫 단계 |
|---|---|---|---|
| 1 | 0077 운영 적용 | Master 운영 적용 승인·실행(0076과 별도), 맥미니 독립 검수 결과 | 승인 오면 DESIGN 7-3 확인 → Master 실행 지원, 승인 시 운영 읽기 1회(UUID 2개 비몰 파일 수·몰 4버킷 합) |
| 2 | B2B-20261119-ADMINUI 맥미니 화면 검수 | CX-QA-01 결과 | 끝나면 2절대로 서버 종료(메인 PC) |
| 3 | 0104 교환비 카드 결제 | 맥미니 QA037(Lab 고객·직원 로그인 읽기 전용, 결제 0) — Master가 순차 안내 중 | 통과 뒤 토스 시험 키 흐름 지시 대기 |
| 4 | 운영 다음 묶음 0101~0104 | QA037 통과 뒤 운영 DB 적용·배포 1회 주인님 승인 | [handoff-0104-lab/RELEASE_PREREQ.md](handoff-0104-lab/RELEASE_PREREQ.md) |
| 5 | S70 0105 Lab 적용 | Lab DB 쓰기 승인(격리 환경 없이는 재시험 안 함) | 승인 오면 적용·verify |
| 6 | M3 후속 6건 | 각각 승인: 서버 적용 라우트, sharp 직접 의존성·S1 측정, 열쇠 `MALL_APPLY_SIGNING_KEY` 등록(주인님 직접 입력), 화면 버튼, 실패 파일 주 1회 점검 목록, Lab 실측 1회 | Master 순서 지시 대기 |
| 7 | CRM 웹훅·1회 전송기 묶음(`crm-google-form`) | 미배포, Master 승인 취합 | — |
| 8 | 메인에 넘길 쇼핑몰 용량 집계·구매 안내 | Master가 중앙 설계 범위로 등록함 | — |
| 9 | 옛 30일 후보 함수 `mall_builder_expired_photos`(mall-builder 0066) 정리 | 별도 승인(지금 어디에도 연결 금지) | — |

**하지 않기로 한 것**: 쇼핑몰 사진 30일 실제 삭제(11-14 취소, 11-19 상품 사진 최소 1년), 독립몰 H3(프로셀 회원 이전), 토스·볼타 라이브 키 전환(최종 완성 단계까지 시험 키만).

## 4. 주인님 답을 기다리는 것
1. CRM v1.18 실검수 「했어」 — 연결 설정 문자 켜기 → 새 Apps Script 붙이기 → 본인 번호로 응답 1건 → 같은 응답 재전송. 「했어」가 오면 운영 DB에서 1번만 접수됐는지 확인(읽기).
2. 샘플몰 시험 데이터(S5) 지울지/둘지.
3. 퀵계좌이체·볼타 테스트 키 항목 정리할지/둘지.

## 5. 알아 둘 특이사항
- 쇼핑몰 운영 DB는 메인 공유 DB `esgxyikcnnvmlhygjkth`, Lab은 `rjjtjakljjxsgjelqgek`. 메인의 중앙 집계·정리 함수가 운영 쇼핑몰 버킷에도 그대로 돈다.
- 0077 운영 적용 시 **같은 트랜잭션에서 전체 측정 2번·양도와 측정을 한 트랜잭션에 넣는 절차는 지원 안 함**. 양도는 커밋 뒤 양쪽 한 명 측정(DESIGN 7-2).
- 되돌리기는 0066 파일 전체 실행 금지(끝의 전체 측정 = 운영 쓰기): 정의·ACL → helper drop → 별도 재측정(DESIGN 7-4).
- postgres.js 시험 작성 시 주의: 쿼리는 `await` 전엔 안 보낸다 — 동시 실행이 필요하면 `.execute()`.
- Vercel MCP는 이 팀 배포 목록 조회에서 403/404, Vercel CLI 미설치(메인 PC).
- `docs/ACTIVE_WORK.md`의 M2·M3 점유 줄(이 세션 명의)은 Sub PC가 이어받으면 에이전트 칸을 새 세션으로 바꾸거나 Master에 정리 요청.
