# 개선사항 기록 — 경쟁사 키워드분석 자동화 (`competitor-analysis`)

## 2026-10-16 Claude Code(맥미니) — 디자인 리뉴얼 사전 분석 중 발견

| # | 내용 | 근거·영향 | 우선순위 | 상태 | 관련 파일 | 다음 첫 단계·검수 |
|---|---|---|---|---|---|---|
| 1 | 휴대폰 ☰ 전환 없음 | 원칙 19 미적용 | 높음 | **구현(v1.07, 배포 대기)** | `components/layout/Sidebar.tsx` | 375px 검수 |
| 2 | 키워드 등록 후 폼 초기화 오류 | 롱테일 v1.06과 같은 코드(`e.currentTarget` await 후 null) | 높음 | **구현(v1.07)** | `components/keywords/KeywordForm.tsx` | 등록 후 입력창 비워짐 확인 |
| 3 | 분석 이력·키워드 삭제 확인 없음 | 실수로 결과 소실 | 중간 | **구현(v1.07)** | `KeywordActions.tsx`, `JobListSidebar.tsx`, `AnalysisListItem.tsx` | 취소 시 삭제 0회 |
| 4 | 빈 목록에서 `"__none__"` UUID 조회 | 조회 오류가 빈 목록으로 숨음(롱테일 v1.06 발견) | 중간 | **구현(v1.07)** — 빈 목록이면 조회 생략 + `user_id` 한정 | `analyses/page.tsx`, `competitors/page.tsx` | 빈 계정에서 정상 빈 화면 |
| 5 | 시각이 서버 UTC 기준 | 9시간 차이 가능 | 중간 | **구현(v1.07)** — `Asia/Seoul` 고정 | `lib/format.ts` | 결과 시각 확인 |
| 6 | 대시보드·매뉴얼 없음 | 지침 9번 | 중간 | **구현(v1.07)** | `dashboard/`, `guide/` | 화면 |
| 7 | 이전 회차 대비 순위 변동 표시 | AGENTS Phase 2 예정 | 중간 | 미구현(기존 예정) | 결과 상세 | 같은 키워드 직전 회차와 도메인 순위 비교 칩 |
| 8 | 도메인별 노출 빈도(share of voice) 대시보드 | AGENTS Phase 2 예정 | 중간 | 부분 — 「내 경쟁사」에 노출 횟수 표시 | `competitors/page.tsx` | 표시 안 한 도메인까지 포함한 전체 순위 표 |
| 9 | 결과 CSV 내보내기 없음 | 엑셀 분석 불편 | 중간 | 미구현(제안) | 결과 상세 | 롱테일 v1.07 `CsvButton` 방식 재사용 |
| 10 | 정기 모니터링(Cron) | AGENTS Phase 2 예정 | 낮음 | 미구현(유료 호출 반복 → 사전 승인 필요) | — | 주기·호출량 안내 후 결정 |
