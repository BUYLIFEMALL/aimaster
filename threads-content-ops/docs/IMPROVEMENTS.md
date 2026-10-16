# Threads 콘텐츠 운영 자동화 — 개선사항 백로그 및 제안 (IMPROVEMENTS.md)

> **관리 지침**: [`docs/IMPROVEMENT_HANDOFF_POLICY.md`](../../docs/IMPROVEMENT_HANDOFF_POLICY.md) 준수  
> **최초 작성일**: 2026-10-16  
> **작성 에이전트**: Antigravity CLI (`agy`)  
> **프로그램**: `threads-content-ops` (v1.95 ➔ v1.96 리뉴얼 대기)  
> **목적**: 작업 중 발견된 오류, UX 불편점, 기능/성능 개선사항을 체계적으로 누적 관리하여 모든 CLI(Antigravity, Codex, Claude Code)가 단절 없이 이어받아 개발할 수 있도록 함.

---

## 1. 개선 과제 총괄 요약표

| ID | 과제명 | 구분 | 우선순위 | 상태 | 관련 핵심 파일 |
|:---:|---|:---:|:---:|:---:|---|
| **IMP-01** | 연동 & 사용 매뉴얼(`/guide`) 메뉴 및 페이지 부재 | UX/기능 | **P0 (긴급)** | ✅ **완료 (v1.96)** | `ContentOpsSidebar.tsx`, `page.tsx`, `UsageGuide.tsx` |
| **IMP-02** | 모바일(375~390px) 뷰포트에서 사이드바 소멸 및 햄버거 메뉴 부재 | UI/반응형 | **P0 (긴급)** | ✅ **완료 (v1.96)** | `ContentOpsSidebar.tsx`, `page.tsx`, `MobileNav.tsx` |
| **IMP-03** | 라이트 테마 내 잔여 다크 텍스트(`text-white`) 및 CSS 덮어쓰기 충돌 | UI/버그 | **P0 (긴급)** | ✅ **완료 (v1.96)** | `page.tsx`, `UsageGuide.tsx`, `ContentOpsSidebar.tsx` |
| **IMP-04** | 5단계 파이프라인(수집➔생성➔보관➔계정➔제휴) 프로세스 맵 위젯 부재 | UX/기능 | **P1 (높음)** | ⚪ 대기 (차기 과제) | `OperationsDashboard.tsx`, `ContentOpsSidebar.tsx` |
| **IMP-05** | 글 생성 시 실시간 500자 프로그레스 바 및 훅/본문/CTA 가이드 강화 | 기능/편의성 | **P1 (높음)** | ⚪ 대기 (차기 과제) | `AttentionComposer.tsx` |
| **IMP-06** | 콘텐츠 보관함 내 드래그앤드롭 다중 이미지 업로더 및 카드 미리보기 | 기능/UX | **P1 (높음)** | ⚪ 대기 (차기 과제) | `DraftComposer.tsx`, `lib/media.ts` |
| **IMP-07** | 예약 발행 캘린더 뷰(월간/주간 타임테이블) 기능 신설 | 기능확장 | **P2 (보통)** | ⚪ 대기 (차기 과제) | `DraftComposer.tsx`, `lib/scheduledDispatch.ts` |
| **IMP-08** | 계정 토큰 만료일 실시간 알림 뱃지 및 원클릭 갱신 가이드 | 편의성/안정성 | **P2 (보통)** | ⚪ 대기 (차기 과제) | `OperationsDashboard.tsx`, `AccountOperations.tsx` |

---

## 2. 세부 과제별 상세 명세

### [IMP-01] 연동 & 사용 매뉴얼(`/guide`) 메뉴 및 페이지 신설
- **발견 근거**:
  - `DESIGN.md` 및 `docs/PROGRAM_DESIGN_STANDARD.md` 불변 지침상 모든 웹 서브프로그램은 좌측 메뉴바에 `📖 연동 & 사용 매뉴얼`을 필수 배치해야 함.
  - 현재 사이드바(`ContentOpsSidebar.tsx`)에는 API키 등록 메뉴만 있고 사용 매뉴얼이 전혀 없었음.
- **영향**: 신규 사용자가 Meta Threads API 앱 연동 방법, 콜백 URL 등록, 6종 페르소나 활용 팁을 전혀 알 수 없어 서비스 이탈 유발.
- **우선순위**: **P0 (즉시 구현)**
- **처리 상태**: ✅ **완료 (v1.96 배포 및 Edge 검수 완료)**
- **관련 파일**:
  - `threads-content-ops/app/threads-content-ops/ContentOpsSidebar.tsx`
  - `threads-content-ops/app/threads-content-ops/page.tsx`
  - `threads-content-ops/app/threads-content-ops/UsageGuide.tsx` (신규 구축)
- **완료 내용**:
  1. `UsageGuide.tsx` 신설: 5대 인터랙티브 탭(파이프라인 흐름, Meta 앱 연동 매뉴얼, 페르소나 공략법, 제휴수익화 팁, FAQ).
  2. `page.tsx`에 `searchParams.tab === "guide"` 라우팅 분기 추가.
  3. `ContentOpsSidebar.tsx`에 `📖 연동 & 사용 매뉴얼` 메뉴 추가 및 계정 밀착 배치.
- **검수 결과**: Edge 브라우저로 `https://threads-content-ops.buylife.xyz/?tab=guide` 접속하여 5개 탭 정상 작동 확인 (`edge_threads_ops_guide_v196.png`).

---

### [IMP-02] 모바일(375~390px) 뷰포트에서 사이드바 소멸 및 햄버거 메뉴 부재
- **발견 근거**:
  - `ContentOpsSidebar.tsx`가 `hidden md:flex`로만 선언되어 있어 768px 이하 모바일 화면에서 사이드바가 완전히 숨겨짐.
  - 상단 햄버거 버튼(`☰`)이나 서랍식 네비게이션 드로어가 없어 스마트폰 접속 시 메뉴 간 이동이 불가함.
- **영향**: 모바일 반응형 검수 기준(iPhone 14/15 375~390px) 미달 및 모바일 이용자 조작 불가.
- **우선순위**: **P0 (즉시 구현)**
- **처리 상태**: 대기
- **관련 파일**:
  - `threads-content-ops/app/threads-content-ops/page.tsx`
  - `threads-content-ops/app/threads-content-ops/ContentOpsSidebar.tsx`
- **남은 작업**:
  1. `page.tsx` 최상단에 모바일 전용 헤더 바(`md:hidden`) 추가 (앱 로고 + 햄버거 버튼).
  2. 모바일용 슬라이드 오버레이 네비게이션 드로어 구현.
- **검수 방법**: Edge 브라우저 F12 디바이스 툴바(375px~390px)에서 햄버거 버튼 터치 시 메뉴 오픈 및 탭 이동 정상 동작 확인.

---

### [IMP-03] 라이트 테마 내 잔여 다크 텍스트(`text-white`) 및 CSS 덮어쓰기 충돌
- **발견 근거**:
  - 과거 다크 테마에서 라이트 테마로 전환되는 과정에서 `text-white`가 남아 흰색 배경 위에서 글자가 안 보이는 현상이 발생했음.
  - `globals.css`의 `.threads-content-ops-light`로 강제 오버라이드했으나 여전히 `page.tsx` 라인 82에 `text-white`, `text-subtext`, `text-gold` 등이 남아 시각적 일관성을 저해함.
- **영향**: 브라우저에 따라 텍스트가 사라지거나 대비가 무너져 가독성이 저하됨.
- **우선순위**: **P0 (즉시 수정)**
- **처리 상태**: 대기
- **관련 파일**:
  - `threads-content-ops/app/threads-content-ops/page.tsx`
  - `threads-content-ops/app/globals.css`
- **남은 작업**:
  - `page.tsx` 헤더 및 공용 UI에서 하드코딩된 다크 클래스를 표준 명암비 토큰(`text-neutral-900`, `text-neutral-600`)으로 일괄 리팩터링.
- **검수 방법**: Edge 브라우저에서 화면 전체 텍스트 콘트라스트 검수.

---

### [IMP-04] 5단계 파이프라인 프로세스 맵 위젯 부재
- **발견 근거**:
  - 대시보드(`OperationsDashboard.tsx`)에 단순히 통계 숫자 4개만 나열되어 있어, 1단계(수집) ➔ 2단계(생성) ➔ 3단계(보관함) ➔ 4단계(계정설정) ➔ 5단계(제휴상품)의 연결된 오퍼레이션 흐름이 직관적으로 느껴지지 않음.
- **영향**: 사용자가 다음 행동으로 무엇을 해야 할지 인지하기 어려움.
- **우선순위**: **P1 (높음)**
- **처리 상태**: 대기
- **관련 파일**:
  - `threads-content-ops/app/threads-content-ops/OperationsDashboard.tsx`
- **남은 작업**:
  - 대시보드 중앙에 5단계 가로형 프로세스 파이프라인 카드 맵 구축 (각 단계별 실시간 데이터 건수 및 원클릭 이동 버튼 제공).

---

### [IMP-05] 글 생성 시 실시간 500자 프로그레스 바 및 훅/본문/CTA 가이드 강화
- **발견 근거**:
  - Threads는 500자 초과 시 포스팅이 차단되므로 매우 민감한 제약 조건임.
  - 현재 단순 텍스트 숫자로만 글자 수가 표시되어 있어 긴박한 시각적 피드백이 부족함.
- **영향**: 글 작성 중 500자 초과로 인한 발행 실패 발생 가능.
- **우선순위**: **P1 (높음)**
- **처리 상태**: 대기
- **관련 파일**:
  - `threads-content-ops/app/threads-content-ops/AttentionComposer.tsx`
- **남은 작업**:
  - 450자 도달 시 노란색 경고 바, 500자 도달 시 붉은색 맥스 경고 바 애니메이션 적용.
  - 훅(Hook, 1~2줄) / 가치 전달(3~5줄) / CTA(마지막 1줄) 템플릿 가이드라인 블록 추가.

---

### [IMP-06] 콘텐츠 보관함 내 드래그앤드롭 다중 이미지 업로더 및 카드 미리보기
- **발견 근거**:
  - 이미지 첨부 시 파일 선택 대화상자 위주로 되어 있어 여러 장의 카드뉴스나 상품 사진을 신속하게 올리기 불편함.
- **영향**: 비주얼 미디어 중심의 스레드 포스팅 작성 속도 저하.
- **우선순위**: **P1 (높음)**
- **처리 상태**: 대기
- **관련 파일**:
  - `threads-content-ops/app/threads-content-ops/DraftComposer.tsx`
  - `threads-content-ops/lib/media.ts`
- **남은 작업**:
  - 점선 드래그앤드롭 파일 업로드 영역 추가.
  - 업로드된 이미지 순서 변경 및 캐러셀 미리보기 UI 개선.

---

## 3. 작업 이관 및 다음 CLI 첫 착수 단계 (First Step)
1. `threads-content-ops/docs/PLAN_20261016_DESIGN_RENEWAL.md`를 필독한다.
2. **첫 착수 작업**: `IMP-01` 및 `IMP-02` 해결:
   - `threads-content-ops/app/threads-content-ops/UsageGuide.tsx` 신설.
   - `ContentOpsSidebar.tsx`에 `📖 연동 & 사용 매뉴얼` 메뉴 추가.
   - `page.tsx`에 `tab === "guide"` 라우팅 및 모바일 햄버거 토글 추가.
3. 로컬 빌드 및 Edge 브라우저로 화면 검수 후 Vercel 프로덕션 배포.
