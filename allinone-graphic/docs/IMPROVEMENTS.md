# AI 올인원 그래픽 자동화 (`allinone-graphic`) — 개선사항 관리 대장 (IMPROVEMENTS.md)

> **규칙 준수**: 모든 CLI는 작업 중 발견한 오류·기능·성능·편의성·디자인 개선사항을 이 문서에 즉시 기록합니다.
> 작업 종료·중단·이관 시 `docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`를 남기고 상호 연결합니다.

---

## 1. 개선 항목 총괄 현황

| ID | 구분 | 개선 항목 요약 | 우선순위 | 상태 | 최초 발견일 / CLI | 관련 파일 |
|---|---|---|---|---|---|---|
| IMP-AIG-001 | 디자인/사용성 | 정식 `/guide` 사용 매뉴얼 라우트 부재 및 비주얼 가이드북 신설 | P1 (필수) | **진행 중 (v1.04 반영)** | 2026-10-16 (agy) | `src/app/guide/page.tsx`, `Sidebar.tsx` |
| IMP-AIG-002 | UI/UX | 사이드바 하단 프로필/연동 카드 여백 과다 및 모바일 뷰 최적화 | P2 (높음) | **진행 중 (v1.04 반영)** | 2026-10-16 (agy) | `src/components/layout/Sidebar.tsx` |
| IMP-AIG-003 | 편의성 | 123종 프리셋 검색 및 직군별 즐겨찾기(Pin) 기능 | P2 (높음) | 제안/대기 | 2026-10-16 (agy) | `src/components/controls/` |
| IMP-AIG-004 | 기능 | 생성된 그래픽 다운로드 시 포맷 옵션(PNG/WebP/JPG) 및 해상도 업스케일링 2x/4x 지원 | P2 (높음) | 제안/대기 | 2026-10-16 (agy) | `src/components/preview/ImagePreview.tsx` |
| IMP-AIG-005 | 성능/UX | 인페인팅 브러시 드로잉 시 히스토리(Undo/Redo) 단축키(Ctrl+Z/Ctrl+Y) 연동 | P3 (보통) | 제안/대기 | 2026-10-16 (agy) | `src/components/editor/InpaintingEditor.tsx` |
| IMP-AIG-006 | 안정성 | Gemini Imagen 호출 타임아웃 및 할당량 초과 시 재시도 안내 토스트 UX 강화 | P2 (높음) | 제안/대기 | 2026-10-16 (agy) | `src/lib/gemini/` |

---

## 2. 상세 개선 내역

### IMP-AIG-001: 정식 `/guide` 사용 매뉴얼 라우트 신설 (크리에이티브 아틀리에 스타일)
- **발견 근거**:
  - 기존에는 사이드바 하단의 `💡 사용 가이드` 클릭 시 작은 팝업 모달(`GuideModal.tsx`)만 열려, 123종 프리셋 구성이나 Gemini API 연동법, 인페인팅 편집 기술을 한눈에 파악하기 매우 어려웠음.
  - 최상단 공통 지침 제7항(미구현 매뉴얼 메뉴/가이드 페이지 발견 시 `/guide` 신설 의무) 충족 필요.
- **영향 및 기대효과**:
  - 초보 사용자도 직군별 프리셋 선택부터 인페인팅 수정, 다운로드까지 5단계 파이프라인으로 직관적 습득 가능.
  - SEO 및 외부 공유 가능한 단독 매뉴얼 페이지 구축.
- **구현 계획**:
  - 라우트: `src/app/guide/page.tsx` 신설.
  - 크리에이티브 아틀리에 앰버 골드 테마 적용, 5단계 비주얼 카드, Gemini API 설정 가이드, 프리셋 맵 치트시트, FAQ 아코디언 배치.

### IMP-AIG-002: 사이드바 레이아웃 표준화 및 계정 블록 8~16px 간격 밀착
- **발견 근거**:
  - 데스크톱/모바일 환경에서 사이드바 하단 프로필 영역과 네비게이션 메뉴 사이의 마진 처리가 일관되지 않아 화면 하단 스크롤이 불필요하게 발생하는 현상 예방.
- **구현 계획**:
  - `src/components/layout/Sidebar.tsx` 내 네비게이션 목록 상단/하단에 `📖 연동 & 사용 매뉴얼` (`/guide`) 추가 및 계정 블록 간격 12px 밀착 정렬.

### IMP-AIG-003: 123종 프리셋 검색 및 직군별 즐겨찾기(Pin) 기능
- **발견 근거**:
  - 19개 직군 123종의 방대한 프리셋 중 자주 사용하는 템플릿을 빠르게 찾기 위한 인풋 필터 또는 Pin 기능 필요.
- **향후 계획**:
  - 로컬 스토리지 기반 최근 선택 템플릿 및 즐겨찾기 탭 추가 제안.

### IMP-AIG-004: 다운로드 시 WebP/PNG/JPG 포맷 선택 및 해상도 업스케일
- **발견 근거**:
  - 인쇄용(고해상도 300DPI) 또는 웹 최적화용(WebP) 등 사용자의 활용 목적에 따른 포맷 저장 옵션 확장 필요.

---

## 3. 이관 및 인수인계 연결
- 2026-10-16 인수인계서: [`docs/IMPROVEMENT_HANDOFF_20261016.md`](IMPROVEMENT_HANDOFF_20261016.md)
- 개발 플랜: [`docs/PLAN_20261016_DESIGN_RENEWAL.md`](PLAN_20261016_DESIGN_RENEWAL.md)

## 2026-10-19 Claude Code(윈도우)
- **처리(v1.08)**: 깨진 사진이 AI 자동 입력 첨부에 그대로 붙던 문제 → 공용 `image-file-check`로 빼고 안내.
- **제안**: AI 자동 입력의 오류도 팝업 `alert` 대신 화면 안 안내로.
- **미배포 대기(2026-10-23, 커밋 `22c6cda35`)**: 좌측 메뉴 계정·로그아웃이 화면 맨 아래로 밀리던 것을 마지막 메뉴 바로 아래(8~16px)로 — `docs/SIDEBAR_LAYOUT_STANDARD.md` 「계정 이메일·로그아웃 위치」(메뉴 `flex-1`/틀 `justify-between`/계정 `mt-auto` 제거). 클래스만 바꿈, tsc 통과. **다음 배포 때 함께 내보내고(버전 +0.01) 데스크톱·휴대폰 폭에서 계정 위치 확인 후 이 줄과 `docs/PENDING_DEPLOYS.md` 줄 지우기.** (Claude Code 윈도우, YOUTUBE Shots v1.38과 같은 수정)

## 2026-10-23 ✅ 배포됨(Next.js 보안 업데이트 배포에 함께 나감, 17:4x `check-app-urls --live` 반영 확인) — 메인 사이트 링크 주소 정정 (Claude Code 윈도우, 세션 `claude-win-20261023-mainsite-url`)
- 메인 사이트 주소 상수가 연결 안 되는 `https://aimaster.buylife.xyz`였다(권한 없음·정지·핸드폰 안내 이동, 회원가입·비밀번호 찾기·약관 링크가 접속 오류). → `https://www.buylife.xyz`, `/signup`→`/register`, `/legal/privacy`·`/legal/terms`→`/privacy`·`/terms`. 커밋 `486fd5fd3`(prompt-template-studio는 `9c170faf5`). tsc 0.
- 운영 임시 조치: 메인 Vercel 프로젝트에 `aimaster.buylife.xyz`를 추가해 `www.buylife.xyz`로 308 이동(경로 유지) — 회원가입 `/signup`만 다음 배포 전까지 404.
- 다음 배포 때: 버전 +0.01, 로그인 화면의 회원가입·비밀번호 찾기 링크와 권한 없는 계정 이동 확인.
