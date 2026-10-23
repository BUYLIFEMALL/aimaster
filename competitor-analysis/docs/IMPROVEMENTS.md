# 개선사항 기록 — 경쟁사 키워드분석 자동화 (`competitor-analysis`)

## 2026-10-16 Claude Code(맥미니) — 디자인 리뉴얼 사전 분석 중 발견

| # | 내용 | 근거·영향 | 우선순위 | 상태 | 관련 파일 | 다음 첫 단계·검수 |
|---|---|---|---|---|---|---|
| 1 | 휴대폰 ☰ 전환 없음 | 원칙 19 미적용 | 높음 | **운영 검수 완료(v1.07)** | `components/layout/Sidebar.tsx` | 375px 검수 |
| 2 | 키워드 등록 후 폼 초기화 오류 | 롱테일 v1.06과 같은 코드(`e.currentTarget` await 후 null) | 높음 | **합성 검수 완료(v1.07), 실제 저장 미검수** | `components/keywords/KeywordForm.tsx` | 등록 후 입력창 비워짐 확인 |
| 3 | 분석 이력·키워드 삭제 확인 없음 | 실수로 결과 소실 | 중간 | **합성 삭제 취소 검수 완료(v1.07)** | `KeywordActions.tsx`, `JobListSidebar.tsx`, `AnalysisListItem.tsx` | 취소 시 삭제 0회 |
| 4 | 빈 목록에서 `"__none__"` UUID 조회 | 조회 오류가 빈 목록으로 숨음(롱테일 v1.06 발견) | 중간 | **운영 빈 목록·합성 조회 생략 검수 완료(v1.07)** — 빈 목록이면 조회 생략 + `user_id` 한정 | `analyses/page.tsx`, `competitors/page.tsx` | 빈 계정에서 정상 빈 화면 |
| 5 | 시각이 서버 UTC 기준 | 9시간 차이 가능 | 중간 | **합성 시각 검수 완료(v1.07)** — `Asia/Seoul` 고정 | `lib/format.ts` | 결과 시각 확인 |
| 6 | 대시보드·매뉴얼 없음 | 지침 9번 | 중간 | **운영 화면/FAQ 검수 완료(v1.07)** | `dashboard/`, `guide/` | 화면 |
| 7 | 이전 회차 대비 순위 변동 표시 | AGENTS Phase 2 예정 | 중간 | 미구현(기존 예정) | 결과 상세 | 같은 키워드 직전 회차와 도메인 순위 비교 칩 |
| 8 | 도메인별 노출 빈도(share of voice) 대시보드 | AGENTS Phase 2 예정 | 중간 | 부분 — 「내 경쟁사」에 노출 횟수 표시 | `competitors/page.tsx` | 표시 안 한 도메인까지 포함한 전체 순위 표 |
| 9 | 결과 CSV 내보내기 없음 | 엑셀 분석 불편 | 중간 | 미구현(제안) | 결과 상세 | 롱테일 v1.07 `CsvButton` 방식 재사용 |
| 10 | 정기 모니터링(Cron) | AGENTS Phase 2 예정 | 낮음 | 미구현(유료 호출 반복 → 사전 승인 필요) | — | 주기·호출량 안내 후 결정 |


## 2026-10-16 Codex(Windows) — 인수 검수 중 발견

- **#11 기존 의존성 보안 점검 (높음·미구현)**: npm audit가 15건(critical 1/high 12/moderate 2)을 보고했습니다. 직접 의존성 Next 14.2.35 및 eslint-config-next·Tailwind 전이 의존성을 별도 업그레이드 플랜에서 확인해야 합니다. critical 범위는 Windows 서버 및 AVIF 이미지 최적화 RCE 공지입니다. 이번 서비스는 Vercel이며 이미지 업로드/next/image 기능은 없지만 영향 범위를 축소 단정하지 않습니다. 로컬 검수 서버는 127.0.0.1에만 바인딩합니다. 이번 인수 마무리에서 major 자동 업그레이드나 audit fix --force를 하지 않습니다. 다음 첫 단계: 공식 보안 공지·배포 런타임·지원 버전 확인 후 async API/라우트 호환 플랜과 전체 회귀 검사.
- **#12 회원 생성 데이터 공유 금지·30일 보관 (높음·수정안 검수 완료/운영 승인 대기)**: 주인님이 전역 회사정보 캐시 자체를 금지했습니다. 관리자 승인 공용 캐시도 대안이 아닙니다. 회원 소유 조사 저장소·소유자/기한 조회·RLS·30일 Cron SQL과 롤백 검사를 준비했습니다. 실제 운영은 v1.07·옛 정책이므로 해결 완료로 표시하지 않습니다. 다음 첫 단계는 MEMBER_RETENTION_HANDOFF_20261016.md의 승인 상태 확인 후 DB→배포→라이브 검수입니다.

  - #11 공식 근거: [Windows RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF 이미지 최적화 RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4). 현재 설치 버전은 영향 범위에 포함됩니다. 실제 악용 검사는 하지 않았습니다.

- **#13 매뉴얼 SPA 전환 검수의 오판 가능성 (중간·검사 보완)**: 실제 /guide 클릭 후 일반적인 첫 heading만 기다리면 직전 /settings 제목이 조건을 만족해 설정 화면을 매뉴얼 캡처로 저장할 수 있었습니다. 제품 라우트 버그가 아니라 검사 대기 조건 문제입니다. tests/runtime.mjs에서 /guide URL·고유 제목을 확인하고 FAQ 열기/닫기도 검사하도록 보완했습니다. 로컬·운영 재검수 통과, 캡처 교체 완료(evidence/guide-captures.json). 다음 CLI도 메뉴 클릭 후 목표 경로/제목을 함께 기다립니다.
- **#14 375px 긴 제목 글자 일부 잘림(낮음·화면 개선 제안)**: 후보 검수 캡처 retention-v108-local-dashboard-mobile.png에서 PageHero 제목의 줄바꿈 경계 글자가 일부 잘려 보입니다. 문서 전체 가로 넘침 검사는 통과하지만 overflow-hidden 안쪽 글자까지 보장하지 않습니다. 다음 UI 작업에서 h1 줄바꿈·글자 폭과 실제 캡처를 함께 확인합니다. 이번 데이터 격리 작업의 범위에는 포함하지 않았습니다.
