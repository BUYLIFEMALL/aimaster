# 개발 플랜 — 관리자 「수정 요청함」에 「작업 결과」·「내가 해 줘야 할 일」 추가 (2026-10-24)

- 작성: Claude Code(윈도우) `claude-win-sdp` → **구현: `claude-win-sdp`(이 세션)** — 주인님 지시 「아냐 그냥 니가 처리해」. 화면 폴더는 `claude-win-dotori`가 마무리 검수 중이라 그 세션이 작업 중 줄을 지운 뒤 시작
- 대상: AIMaster 운영 메인 사이트 · DB ref `esgxyikcnnvmlhygjkth` · https://www.buylife.xyz/admin/dev-docs/requests
- 상태: **주인님 승인 완료(플랜·담당)** — 범위·비용은 아래 표 그대로. 범위를 넘으면 다시 여쭌다.
- 앞선 플랜: [`PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md`](PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md)(1~3단계, 표 `admin_dev_requests` 마이그레이션 `0043`)

## 1. 주인님 지시 (원문)

1. 「https://www.buylife.xyz/admin/dev-docs/requests 여기엔 내가 작업요청한 내용에 대한 결과를 받아 볼수 있도록 해놔 지침에 추가하고」
2. 「또 내가 해줘야할 요청사항도 따로 카테고리별로 여기 모아서 볼수 있게 해줘」 — 보충: 「agent가 요청한 내용」

## 2. 지금 상태 (2026-10-24 확인)

- 요청함은 **주인님 → 에이전트** 한 방향뿐: 종류 `doc_edit`·`doc_comment`·`role_note`, 상태 「반영 대기·반영됨(커밋)·반려·취소」(화면 3칸 모두 0건).
- **에이전트 → 주인님** 방향(작업 결과 보고, 주인님 조치 요청)을 담을 칸이 없음. 지금은 채팅·HANDOFF에만 흩어져 있다.

## 3. 단계

| 단계 | 내용 |
|---|---|
| ① DB | 마이그레이션 `0044`: `admin_dev_requests.kind`에 **`work_result`**(작업 결과)·**`owner_action`**(주인님이 해 줄 일) 추가. 칸 `category text`·`title text`·`from_session text`·`parent_id uuid`(결과가 어느 요청에 대한 것인지)·`link text`·`cost text` 추가. `owner_action` 상태는 기존 `open`/`applied`(=완료)/`rejected` 재사용. RLS는 기존 관리자 전용 그대로. **주인님이 크롬 SQL 편집기에서 직접 실행**(0043과 같은 방식). |
| ② 도구 | `scripts/dev-requests.mjs`에 `report [--request <id>] --title … --summary … [--link …] [--commit …] [--cost …] --as <세션>`(결과 기록), `ask --category <분류> --title … [--note …] [--link …] --as <세션>`(주인님께 요청) 추가. `list`에 두 종류 표시. |
| ③ 화면 | 「수정 요청함」을 세 칸으로: **🙋 내가 해 줘야 할 일**(카테고리별 접기, 각 줄 요청 세션·날짜·링크·「완료」 버튼) → **📬 내가 요청한 일 → 결과**(요청마다 결과 카드: 요약·커밋·비용·프로그램 링크, 요청 없이 올린 결과도 표시) → **🗂 수정안 반영 기록**(기존). 「한눈에 보기」에 「해 줘야 할 일 N건」 배지, 사이드바 「수정 요청함」 옆 숫자(선택). |
| ④ 지침 | 루트 `CLAUDE.md`·`AGENTS.md` 상단 + `docs/MULTI_AGENT_SESSION_RULES.md`: 「모든 세션은 작업이 끝나면 `dev-requests.mjs report`로 결과를 남기고, 주인님 승인·조치가 필요하면 채팅으로 여쭙는 것과 함께 `ask`로 올린다. 주인님이 처리하면 「완료」로 바뀐다」. 공용 문서는 `safe-commit.mjs`. |

### 「내가 해 줘야 할 일」 카테고리 (`category` 값)

| 값 | 화면 이름 | 예 |
|---|---|---|
| `approval` | 승인·결정 | 플랜 범위·순서 승인, 방향 선택 |
| `cost` | 비용 승인 | Vercel 빌드, 유료 AI 호출 |
| `account` | 로그인·계정 | 사이트 로그인, 비밀번호 입력 |
| `db` | DB SQL 실행 | 마이그레이션 실행 |
| `install` | PC 설치·확장 | 렌더러 설치, 확장 ZIP 다시 받기 |
| `check` | 화면 확인·검수 | 실제 화면에서 결과 보기 |
| `external` | 외부 서비스 설정 | Meta·Vercel·도메인·OAuth |
| `etc` | 기타 | — |

## 4. 검수

- 관리자 계정 크롬: `ask` 1건 → 화면 카테고리에 표시 → 「완료」 → 상태 바뀜. `report` 1건(요청 연결) → 결과 카드 표시. 「한눈에 보기」 배지. 좁은 폭.
- 일반 회원 `buylifemall@naver.com` 차단 확인(기존과 같음).
- 시험 줄은 확인 뒤 정리(반려 처리 또는 삭제는 주인님께 여쭘).

## 5. 비용

| 항목 | 횟수 | 계정 | 대략 |
|---|---|---|---|
| AI 호출 | 0 | — | 없음 |
| 메인 사이트 Vercel 빌드(푸시 자동) | 1회(수정 필요 시 최대 2회) | 팀 `buylife` | 배포 회차분 |
| DB 표 변경 | 1회(주인님 직접 실행) | — | 없음 |

## 6. 첫 사용 예 (구현 뒤 바로 올릴 것)

- `owner_action`·`approval`: 바나나 캔버스 「무료 지우기」 C-0~C-5 승인 대기(`claude-win-sdp`, `banana-canvas/docs/IMPROVEMENT_HANDOFF_20261024_CLEARPIC.md` §6).
