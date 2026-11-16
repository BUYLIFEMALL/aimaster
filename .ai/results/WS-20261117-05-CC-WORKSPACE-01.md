# WS-20261117-05 결과 — 주인님 직접 지시 취합: 캘린더 노션식 표기·높이, 업무 현황판 전체 너비 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 취합 지시: Master `msg_0877a1c5c5a3` · 독립 UI 읽기 검토: AGY `DES17-01`(별도)
- 상태: **ready_review · 미배포** · 보고 형식: 공통지침 v1.3 · 빌드 미승인 · 운영 DB 쓰기 0

## 1. 직접 지시 (근거: 이 세션 채팅 원문, 2026-11-17 KST — 분 단위 시각은 정밀 미확인)
1. 「노션처럼 이렇게 기능 확장 추가해줘」 — 노션 데이터베이스 캘린더 화면(캘린더·표·보드·타임라인·리스트·갤러리 탭, 「2026년 11월」 제목) 캡처 첨부
2. 「년월 표기도 이렇게 바꿔줘」 — 캡처의 「2026년 11월」 빨간 상자
3. 「캘린더 표시부분도 길게 뽑아줘 지금은 너무 세로가 짧아」 — 한 주 줄 빨간 상자
4. 「화면에 꽉차게 다시 잡아줘」(2회) — 운영 v1.54 「📊 업무 현황판」 캡처(가운데 좁은 폭), 노션 전체 너비 화면 캡처
- 승인 범위: 코드 수정·커밋·푸시까지. **배포(빌드) 승인 없음** → 미배포 대기, 채팅에서 주인님께 배포 여부만 여쭘.

## 2. 변경

| 커밋 | 파일 | 내용 |
|---|---|---|
| — | (조사) | 지시 1: 보기 종류 캘린더·표·보드·타임라인·리스트·갤러리(+차트·피드·폼·대시보드)는 이미 있음(`src/litpage/shared/database/schema.ts` `VIEW_TYPES`, `views/*`) → **새 보기 추가 없음** |
| `370e05836` | `src/litpage/web/features/database/views/calendar/CalendarView.view.tsx` | 한국어 화면(`getLocale()==='ko-KR'`)에서 월 제목 `November 2026` → `2026년 11월`, 요일 머리 `Sun…` → `일 월 화…`(`weekdayOf` 0=일요일과 순서 일치), 매달 첫날 `Nov 1` → `11월 1일`. 영어 화면은 그대로. `ROW_HEIGHT` 124 → 240(일정이 많으면 기존처럼 더 늘어남, 주 보기 560 하한은 그대로) |
| `12a5ff17d` | `src/server/workDashboard.ts` | 새 현황판 페이지 `format: { page_full_width: true }`. `ensureDashboardFullWidth()` — 기존 현황판은 `page_full_width === undefined`일 때만 `update`로 한 번 켬, 회원이 `···` 메뉴로 끈 `false`는 유지 |
| `12a5ff17d` | `src/server/workInbox.ts` | `workInboxDashboard`의 「이미 있음」 경로에서 위 함수 호출 |
| `12a5ff17d` | `tests/integration/workDashboard.test.ts` | 첫 시험에 `page_full_width === true` 확인, 새 시험 1개(값 없음 → 열면 true / false → 열어도 false) |
| 두 커밋 | `docs/IMPROVEMENTS.md` | 「미배포 대기」 맨 위 한 항목 |

## 3. 검증
- `npx tsc --noEmit` 0(두 번 모두).
- 시험 전 공유 시험 DB `aww-pg-test` 다른 접속 0·vitest 0 확인 → `integration/workDashboard.test.ts` **6/6 통과**.
- 전체 시험은 이번에 돌리지 않음(배포 승인 시 배포 전에 전체 실행 예정).

## 4. 한계 / 미검수
- **화면 미확인**: 미배포라 실제 브라우저에서 새 표기·240px·전체 너비를 보지 않음. 운영 캡처(v1.54)는 바뀌기 전 모습.
- 캘린더 표기는 한국어 화면에서만 바뀜. 타임라인 등 다른 보기의 월 이름(`monthName`, 영어)은 손대지 않음 — 같은 표기 요청이면 별도 범위.
- 240px은 주인님 노션 캡처 비율을 보고 고른 값 — 실제 화면 확인 뒤 조정 여지.
- 「업무 현황판」 외의 일반 페이지 전체 너비는 기존 `···` 메뉴 스위치 그대로(기본값 변경 안 함).

## 5. 다음 배포 묶음 (v1.55 후보, 빌드 1회·주인님 승인 필요)
- `370e05836` 캘린더 표기·높이 + `12a5ff17d` 현황판 전체 너비 (+ 그 사이 쌓인 워크스페이스 미배포 대기분, IMPROVEMENTS 「미배포 대기」 참조).
- 배포 절차: 팀 빌드 0 확인 → 시험 DB 점유 확인 → 전체 시험·tsc → `vercel deploy --prod` → `version.ts`·DB `programs.version` v1.55 → 엣지에서 「📊 업무 현황판」 전체 너비·캘린더 「2026년 11월」·칸 높이 확인.
- AGY `DES17-01` 검토에서 반례가 오면 그 반영 뒤 묶음 확정.

## 비용
없음(빌드 0·AI 0·운영 DB 0·외부 호출 0).
