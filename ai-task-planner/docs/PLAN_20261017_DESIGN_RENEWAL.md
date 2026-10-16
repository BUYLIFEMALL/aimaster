# AI 할 일·성과 관리 (ai-task-planner) 디자인 리뉴얼 개발 플랜

- **작성일**: 2026-10-17
- **작성자**: Antigravity (agy)
- **대상 프로그램**: `ai-task-planner/` (slug: `ai-task-planner`, 공식 URL: `https://ai-task-planner.buylife.xyz/`)
- **현재 버전**: `v1.06` ➔ **목표 버전**: `v1.07`
- **적용 디자인 템플릿**: **스마트 매트릭스 스타일 (Smart Matrix Style — 클린 슬레이트 `#f8fafc` 단일 배경, 순백색 카드 서피스 `#ffffff`, 인디고/블루 포인트 `#4f46e5`/`#2563eb`, 앰버/에메랄드/로즈 KPI 칩 & 파이프라인 매트릭스)**

---

## 1. 개요 및 목적
1. **최상단 공통 지침 11번(단일 배경색 및 일관된 테마 스타일)**: 대시보드, 할 일 계획, 집중 실행, 성과·AI 분석, 기록·백업, 설정, 사용 매뉴얼 전체 화면을 통일된 `#f8fafc` 클린 슬레이트 배경과 `#ffffff` 카드 서피스로 일체화.
2. **최상단 공통 지침 7번(단계별 비주얼 사용 매뉴얼 구축)**: 현재 텍스트 4줄 목록으로만 구성된 사용 안내 화면을 5단계 파이프라인 인포그래픽, 4대 골든 팁, FAQ 4종 아코디언, 회원 본인 Gemini API 키 보안 배너를 갖춘 전면 비주얼 가이드북(`TaskPlannerGuideView.tsx`)으로 구축.
3. **사이드바 메뉴 직관화**: 좌측 사이드바에 표준 메뉴명 `📖 연동 & 사용 매뉴얼`을 배치하고 상단 브랜드 로고 및 뱃지 스타일을 스마트 매트릭스 테마로 정돈.
4. **버전 동기화 및 Edge 실세션 검수**: `v1.06`에서 `v1.07`로 판올림하고 Supabase 공유 DB `programs` 테이블과 동기화, Microsoft Edge 전용 브라우저로 1440px 데스크톱 및 390px 모바일 화면 무결점 검수.

---

## 2. 작업 범위 및 구현 순서

### Step 1. 사전 분석 및 문서화 (완료)
- `docs/PLAN_20261017_DESIGN_RENEWAL.md` (본 문서)
- `docs/IMPROVEMENTS.md` (개선점 원장)
- `docs/IMPROVEMENT_HANDOFF_20261017.md` (인수인계서)

### Step 2. 버전 판올림 (`v1.06` ➔ `v1.07`)
- `src/lib/version.ts`: `APP_VERSION = "v1.07"`
- `package.json`: `"version": "1.7.0"`
- Supabase 공유 DB `programs` 테이블: `version = 'v1.07'` 동기화

### Step 3. 테마 및 단일 배경색 정비 (`globals.css` / `overview.css`)
- `:root` 배경색을 단일 클린 슬레이트 `#f8fafc`로 통일하고 카드 서피스를 순백색 `#ffffff` + 슬레이트 보더 `#e2e8f0`로 정돈
- 폰트 및 가독성, 태그/뱃지(높음: `#ef4444`, 보통: `#f59e0b`, 낮음: `#64748b`, 카테고리: `#3b82f6`, 완료: `#10b981`) 정비

### Step 4. 사이드바 및 네비게이션 표준화 (`Sidebar.tsx`)
- 사이드바 메뉴에 `📖 연동 & 사용 매뉴얼` 및 `🔑 API키등록·플랫폼연동` 표준 명칭 적용
- 브랜드 뱃지 및 액센트 컬러를 스마트 매트릭스 인디고(`#4f46e5`)로 정돈
- 모바일 ☰ 햄버거 메뉴 인터랙션 보존 및 세로 여백 최적화

### Step 5. `TaskPlannerGuideView.tsx` 비주얼 가이드북 전면 신설
- 5단계 파이프라인 비주얼 카드:
  1. **1단계 할 일 기획**: 날짜별 카테고리 분류, 우선순위 매트릭스(High/Normal/Low), 예상 소요시간 설정
  2. **2단계 뽀모도로 포커스 타이머**: 집중(25분) · 짧은 휴식(5분) · 긴 휴식(15분) 타이머 자동 세션 추적
  3. **3단계 성과 지표 매트릭스**: 계획 완료율, 총 집중시간, 시간대별 활동 바 차트, 계획-실행 정확도 정밀 분석
  4. **4단계 Gemini AI 생산성 분석**: 본인 Gemini API 키 기반 업무 집중도 피드백 및 다음 하루 개선 인사이트 도출
  5. **5단계 안전한 백업 & 복원**: 원클릭 JSON 전체 백업 및 복원, 필터 범위 일치 CSV 엑셀 다운로드
- 생산성 극대화 4대 골든 팁 카드
- 자주 묻는 질문(FAQ) 4종 아코디언 컴포넌트
- 회원 본인 Gemini API 키 직접 연동 보안 원칙 배너

### Step 6. 로컬 빌드 및 Vercel 프로덕션 배포
- `npm run build` 검증 (Next.js Turbopack 0 에러)
- `vercel deploy --prod --yes --scope buylife` 배포

### Step 7. Microsoft Edge 브라우저 실세션 검수 (지침 준수)
- 일반 회원 테스트 계정(`buylifemall@naver.com`)으로 실세션 로그인 검수
- 1440px 데스크톱: 대시보드, 할 일 계획, 타이머, 성과 분석, 비주얼 가이드북
- 390px 모바일: 모바일 상단 바, 햄버거 메뉴, 반응형 카드 흐름 검수

### Step 8. 인수인계 문서 갱신 및 Git 커밋/푸시
- `ai-task-planner/docs/DESIGN_HANDOFF.md` 작성
- `ai-task-planner/AGENTS.md` 갱신
- 루트 `DESIGN.md` 상태 「✅ 1차 작업완료 (`v1.07`, 스마트 매트릭스 스타일)」 갱신
- 루트 `docs/ACTIVE_WORK.md` 내 작업 행 삭제
- 루트 `docs/HANDOFF.md` 최상단 인수인계 등록
- Git commit & push

---

## 3. 검증 기준 및 주의사항
- **비용**: 0원 (모의 또는 기존 UI 렌더링 검수, 유료 API 호출 없음)
- **기존 데이터 및 세션**: 회원별 JSONB workspace 및 revision 동시성 락 로직 100% 보존
- **Edge 전용 검수**: 모든 검수는 Microsoft Edge 브라우저로만 진행
