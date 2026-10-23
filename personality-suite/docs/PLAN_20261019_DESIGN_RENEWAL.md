# 🎨 AI 종합 성격 진단 자동화 (`personality-suite`) v1.20 리뉴얼 플랜

## 1. 개요 및 배경
- **프로그램명**: AI 종합 성격 진단 자동화 (`personality-suite`)
- **서비스 URL**: `https://personality-suite.buylife.xyz`
- **배정 스타일**: **크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 종합 진단 에디션 (Creative Atelier Pastel Personality Suite Edition)** (`DESIGN.md` 지정 권장 스타일)
- **현재 버전**: v1.06 ➔ **목표 버전: v1.20**
- **작업 목적**:
  - `DESIGN.md` 9번 필수 원칙에 따라 독립 비주얼 가이드북(`📖 연동 & 사용 매뉴얼`, `/guide`)을 4단계 다이어그램, 검사군 매트릭스, 7대 황금 수칙, FAQ 5종 아코디언으로 전면 고도화.
  - 감각적인 소프트 파스텔 크림 베이스 테마 적용 (소프트 크림 `#fefcf9`, 코랄 로즈 `#f43f5e`, 라벤더 바이올렛 `#8b5cf6`, 파스텔 에메랄드 `#10b981`, 차콜 잉크 `#1f2937`).
  - 대시보드 메인에 3대 핵심 KPI 통계 카드 (총 검사군 종수, 누적 완료 검사수, AI 융합 분석 리포트) 및 4단계 파이프라인 가이드 바 탑재.
  - 사이드바 내비게이션에 `v1.20` 배지 및 모바일 56px 반응형 최적화.
  - Next.js 16.4.0 (Turbopack) 로컬 빌드 검증, Vercel 프로덕션 배포, Microsoft Edge 포그라운드 7종 캡처 및 10분 화면 유지 실세션 검수, 인수인계 문서 완비 및 Git 푸시.

---

## 2. 디자인 시스템 및 테마 스펙

| 토큰명 | 색상 코드 | 용도 |
|---|---|---|
| **Base Canvas** | `#fefcf9` / `#faf8f5` | 아틀리에 소프트 파스텔 크림 배경 |
| **Card Surface** | `#ffffff` / `#fffdfa` | 부드러운 카드 서피스 (미세 파스텔 보더 `#f1ebe1`) |
| **Primary Rose** | `#f43f5e` / `#fb7185` | 활력 넘치는 코랄 로즈 프라이머리 액센트 |
| **Secondary Violet** | `#8b5cf6` / `#a78bfa` | 창의적이고 지적인 라벤더 바이올렛 서브 액센트 |
| **Accent Emerald** | `#10b981` / `#34d399` | 차분하고 안정감을 주는 파스텔 에메랄드 포인트 |
| **Text Charcoal** | `#1f2937` / `#374151` | 고가독성 차콜 잉크 본문 및 헤드라인 텍스트 |

---

## 3. 핵심 구현 계획

### ① 대시보드 메인 화면 (`src/app/(workspace)/dashboard/page.tsx`) 고도화
- **아틀리에 프리미엄 히어로 배너**:
  - `🎭 나를 깊이 이해하는 AI 종합 성격 진단 아틀리에` 헤드라인 배너.
  - 파스텔 소프트 그라데이션 및 마이크로 배지 (`v1.20`, `상황별 16유형`, `AI 심층 융합 프로필`).
- **3대 핵심 KPI 통계 카드**:
  1. **지원 검사 스위트**: 상황별 16유형, 대인관계, 마음 건강 등 정밀 검사 종수 표시.
  2. **나의 검사 이력**: 현재 로그인한 회원의 완료 검사 누적 건수 실시간 연동.
  3. **AI 심층 분석 & 융합 프로필**: Gemini 기반 다중 검사 교차 융합 리포트 생성 지원.
- **4단계 인터랙티브 파이프라인 가이드 바**:
  - `STEP 01 검사 선택` ➔ `STEP 02 직관적 문항 응답` ➔ `STEP 03 즉시 결과 & 해석` ➔ `STEP 04 AI 심층 융합 프로필`.
- **검사 그룹별 카드 그리드 UI 정돈**:
  - 검사 문항 수, 소요 시간, 완료 회수 뱃지 시각화 강화.

### ② 사이드바 & 모바일 레이아웃 (`src/components/layout/Sidebar.tsx`)
- `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 링크 및 아이콘 시각적 강조.
- `v1.20` 파스텔 배지 적용.
- 모바일(768px 미만) 56px 상단 고정 헤더 및 햄버거 토글 슬라이드 메뉴 UX 정돈.

### ③ 독립 비주얼 가이드북 (`src/app/(workspace)/guide/page.tsx`) 전면 고도화
- **4단계 종합 진단 & 융합 파이프라인 다이어그램**:
  - 검사 선택 ➔ 5단계 척도 응답 ➔ 즉시 해석 확인 ➔ AI 심층 다중 융합 분석.
- **검사군별 지원 포맷 매트릭스 표**:
  - 검사 카테고리 (상황별 16유형, 대인관계 소통, 마음건강 스트레스)
  - 검사명 및 문항수
  - 측정 핵심 지표
  - 결과 제공 방식 (즉시 결과 + AI 심층 분석 지원 여부)
- **정확한 자기 이해와 진단 신뢰도 극대화 7대 황금 수칙**:
  1. 솔직하고 즉각적인 직관 응답
  2. 이상적인 바람보다 일상적 편안한 나 선택
  3. 질문 전후 맥락에 지나치게 얽매이지 않기
  4. 경계선(50% 내외) 점수 시 양방향 특성 종합 성찰
  5. 2종 이상 검사 완료로 AI 융합 프로필 해금
  6. Gemini API 키 연동을 통한 심층 맞춤 피드백 수신
  7. 주기적 분기별 재검사를 통한 성장 및 상태 변화 추적
- **실무 FAQ 5종 아코디언 고도화**:
  1. 여러 검사를 하면 종합 프로필에서 어떻게 융합되나요?
  2. AI 심층 분석에는 어떤 API 키가 필요한가요? (회원 본인 키 원칙)
  3. 마음 건강 검사 결과는 왜 자동 저장되지 않나요? (민감 정보 보호 원칙)
  4. 과거에 진행한 검사 결과와 비교할 수 있나요?
  5. 검사 결과를 외부로 공유하거나 인쇄할 수 있나요?

### ④ 글로벌 스타일 보강 (`src/app/globals.css`)
- 아틀리에 파스텔 테마 전용 컴포넌트 클래스 (.atelier-hero, .stat-card-pastel, .pipeline-bar-pastel, .atelier-matrix-table, .rule-card-atelier, .faq-atelier) 탑재.

---

## 4. 버전 3중 동기화 계획 (`v1.20`)
1. `personality-suite/package.json`: `"1.20.0"`
2. `personality-suite/src/lib/version.ts`: `"v1.20"`
3. Supabase DB `programs` 테이블 (`id: d08d46b6-6960-47b6-936b-fbe56ee58538`): `version = 'v1.20'`

---

## 5. 검증 및 배포 프로세스
1. **로컬 빌드 검증**: `npm run build` (Next.js 16.4.0 Turbopack 무오류 검증).
2. **Vercel 프로덕션 배포**: `vercel --prod --scope buylife --yes` ➔ `https://personality-suite.buylife.xyz`.
3. **Microsoft Edge 포그라운드(headless: false) 실세션 검수**:
   - `scripts/verify_edge_personality_suite_v120.cjs` 작성 및 실행.
   - 7종 캡처 수집 (데스크톱 대시보드, 3대 KPI 카드, 파이프라인 바, 가이드북 상단, 검사군 매트릭스 표, 모바일 대시보드, 모바일 가이드북).
   - 아티팩트(`.md`) 7종 등록.
   - 사용자 실시간 육안 확인을 위한 **10분간(600초) 포그라운드 화면 유지**.
4. **인수인계 서브문서 6종 작성**:
   - `personality-suite/docs/PLAN_20261019_DESIGN_RENEWAL.md`
   - `personality-suite/docs/DESIGN_HANDOFF.md`
   - `personality-suite/docs/IMPROVEMENTS.md`
   - `personality-suite/docs/IMPROVEMENT_HANDOFF_20261019.md`
   - `personality-suite/AGENTS.md`
   - `personality-suite/README.md`
5. **루트 현황판 동기화**: `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/DESIGN_TEMPLATE_CATALOG.md`, `docs/HANDOFF.md`.
6. **Git 커밋 및 푸시**: 선별 커밋 및 원격 `origin/master` 푸시.
