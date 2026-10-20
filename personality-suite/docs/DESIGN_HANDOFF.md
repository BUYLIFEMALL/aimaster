# AI 종합 성격 진단 자동화 (`personality-suite`) v1.21 디자인 인수인계 — 미스틱 미드나잇 퍼플 (2026-10-20, Claude Code)

- **적용 템플릿**: **크리에이티브 아틀리에 스타일 — 미스틱 미드나잇 퍼플 랩 에디션** (원본: 37번 AIMaster 타로점 `tarot-reading` v1.20)
- **서비스 주소**: https://personality-suite.buylife.xyz
- **색 토큰** (`src/app/globals.css` `:root`): `--background #090614` · `--surface #120d24` · `--surface-2 #170f2e` · `--surface-hover #1c1536` · `--line #2a1f4e` · `--foreground #f1f5f9` · `--muted #94a3b8` · `--brand #a855f7` · `--brand-purple #c084fc` · `--brand-gold #f59e0b` · `--brand-cyan #38bdf8` · `--brand-emerald #34d399`
- **화면 부품**: `ps-hero`(보라→금 그라데이션 히어로) · `ps-kpis/ps-kpi` · `ps-panel` · `ps-steps/ps-step`(STEP 번호 색: 보라·시안·금·에메랄드) · `ps-table` · `ps-rules/ps-rule`(금색 번호 배지) · `ps-faq`(오른쪽 동그란 금색 화살표, 펼치면 회전) · `ps-btn-primary/ps-btn-ghost`
- **전 화면 같은 배경**: 로그인·설정·검사·결과·내 결과·종합 프로필·매뉴얼 모두 같은 토큰을 씀(DESIGN.md ⑪).
- **인쇄**: `@media print`에서 토큰을 밝은 색으로 되돌려 PDF 저장이 종이에 맞게 나옴.
- **모바일(767px 이하)**: 위쪽 접는 메뉴 유지, 숫자 카드·수칙 1열, 4단계 2열(900px 이하).
- **주의**: Tailwind 미설치 프로젝트 — Tailwind 클래스를 넣으면 무시됨(v1.20에서 실제로 배치가 깨졌던 원인).

---

# AI 종합 성격 진단 자동화 (`personality-suite`) v1.20 디자인 인수인계서

## 1. 개요 및 버전 정보
- **프로그램명**: AI 종합 성격 진단 자동화 (`personality-suite`)
- **서비스 URL**: `https://personality-suite.buylife.xyz`
- **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 종합 진단 에디션 (Creative Atelier Pastel Personality Suite Edition)**
- **버전**: `v1.20` (이전 v1.06)
- **작업 일시**: 2026-10-19

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

## 3. 핵심 화면 개편 내역

### ① 대시보드 메인 화면 (`src/app/(workspace)/dashboard/page.tsx`)
- `🎭 나를 깊이 이해하는 AI 종합 성격 진단 아틀리에` 프리미엄 히어로 배너 탑재.
- 3대 핵심 KPI 통계 카드:
  1. 지원 검사 스위트 (상황별 16유형, 대인관계, 마음건강 등 총 검사 종수)
  2. 나의 검사 이력 (로그인한 회원의 완료 검사 누적 건수 실시간 연동)
  3. AI 심층 분석 & 융합 프로필 (Gemini 기반 다중 검사 교차 융합 리포트)
- 4단계 인터랙티브 파이프라인 가이드 바 (`STEP 01 검사 선택` ➔ `STEP 02 직관적 응답` ➔ `STEP 03 즉시 결과 확인` ➔ `STEP 04 AI 융합 프로필`).
- 검사 그룹별 카드 그리드 UI 정돈 및 완료 회수 뱃지 시각화.

### ② 사이드바 & 모바일 레이아웃 (`src/components/layout/Sidebar.tsx`)
- `DESIGN.md` 9번 필수 원칙에 따라 `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 링크 및 아이콘 강조.
- `v1.20` 파스텔 배지 적용.
- 56px 모바일 반응형 헤더 및 모바일 전용 매뉴얼 버튼 완비.

### ③ 독립 비주얼 가이드북 (`src/app/(workspace)/guide/page.tsx`)
- 4단계 종합 진단 & 융합 워크플로우 다이어그램.
- **지원 검사군 매트릭스 도감 표** (카테고리, 검사명, 문항수, 측정 목적, AI 분석 지원 뱃지).
- 정확한 자기 이해와 진단 신뢰도 극대화 7대 황금 수칙 카드.
- 실무 FAQ 5종 아코디언 고도화.

---

## 4. 검증 결과
- **로컬 빌드**: Next.js 16.4.0 (Turbopack) 무오류 3.3초 컴파일 완료.
- **Vercel 프로덕션 배포**: `https://personality-suite.buylife.xyz` (READY).
- **Microsoft Edge 포그라운드(headless: false) 실세션 검수**: 7종 캡처 수집 및 10분 화면 유지 세션 완료.
