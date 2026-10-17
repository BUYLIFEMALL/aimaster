# AI 12단 상세페이지 자동화 (detail-page-12p) — 디자인 & 로그인 2탭 개편 인수인계서

> **작업 일시**: 2026-10-17
> **담당 CLI**: Antigravity (`agy`)
> **버전**: `v1.04` ➔ **`v1.05`**
> **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 이커머스 상세페이지)**
> **공식 서비스 URL**: `https://detail-12p.buylife.xyz`
> **로그인 URL**: `https://detail-12p.buylife.xyz/login`

---

## 1. 개요 및 목적
주인님의 전체 서브프로그램 로그인/회원가입 표준 2탭 레이아웃(`threads-comment-reply` 표준 규격) 통일 지침에 따라, `detail-page-12p`의 로그인 라우트를 2탭 세그먼트 표준 레이아웃으로 전면 개편하고 포커스 스튜디오 라이트 에디션 테마와의 일관성을 완성했습니다.

---

## 2. 디자인 명세 및 컬러 토큰
- **배경 테마**: `#f8fafc` (클린 슬레이트) + 24px 간격 모눈 격자 (`radial-gradient(rgba(100, 116, 139, 0.15) 1px, transparent 1px)`)
- **카드 서피스**: `bg-white/95`, `border-slate-200`, `shadow-xl shadow-slate-200/50`
- **시그니처 포인트**:
  - 상단 블루-인디고 `LayoutTemplate` 심볼 (`from-blue-600 to-indigo-600`, `ring-1 ring-blue-400/30`)
  - `AIMaster 통합 계정` 알약 뱃지 (`bg-blue-50 border-blue-200 text-blue-700`)
  - 2탭 세그먼트 컨트롤: `bg-slate-100/90 border-slate-200`, 활성 탭 `bg-white text-slate-900 shadow-sm border border-slate-200/80`
  - 인풋 필드: 좌측 아이콘(Mail, Lock), `pl-[42px]` 인셋 패딩, 포커스 시 `border-blue-600` 및 `ring-blue-500/20`
  - 액션 버튼: `from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700` 풀위드
  - 회원가입 탭: 단일 계정(SSO) 안내 박스, 상세페이지 혜택 체크리스트 3종, `AIMaster에서 무료 회원가입하기` 링크 버튼
  - 푸터: 이용약관 · 개인정보처리방침 · 고객지원 통합 링크

---

## 3. 변경 파일 목록
- `detail-page-12p/src/lib/version.ts`: `v1.05` 갱신 및 `MAIN_SITE` export
- `detail-page-12p/package.json`: version `1.05.0`
- `detail-page-12p/src/app/(auth)/login/page.tsx`: 표준 2탭 세그먼트 레이아웃 전면 구현
- `detail-page-12p/docs/PLAN_20261017_LOGIN_RENEWAL.md`: 작업 기획 플랜 문서
- `detail-page-12p/docs/IMPROVEMENT_HANDOFF_20261017.md`: 개선사항 및 인수인계 문서
- `detail-page-12p/docs/DESIGN_HANDOFF.md`: 본 디자인 완료 인수인계서
- `scripts/verify_edge_detail12p_login_v105.cjs`: Microsoft Edge 실세션 검수 스크립트

---

## 4. 빌드 및 배포 검증
- **로컬 빌드**: `npm run build` (Turbopack) 성공 (`Compiled successfully in 6.1s`, `Finished TypeScript in 4.4s`)
- **Vercel 프로덕션 배포**: `dpl_3oHAGFX5mEoHhUCEtQrfjM4qxbek` 성공 (`READY`, `Aliased https://detail-12p.buylife.xyz`)
- **DB 버전 동기화**: `programs.version = 'v1.05'`, `app_url = 'https://detail-12p.buylife.xyz'` 확인 완료
- **Microsoft Edge 실세션 검수 캡처 확인**:
  1. `edge_detail12p_login_desktop_v105.png` (데스크톱 1280x900 로그인 탭)
  2. `edge_detail12p_signup_desktop_v105.png` (데스크톱 1280x900 회원가입 탭)
  3. `edge_detail12p_login_mobile_v105.png` (모바일 390x844 로그인 탭)
