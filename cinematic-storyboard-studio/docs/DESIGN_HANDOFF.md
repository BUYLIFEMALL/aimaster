# 시네마틱 스토리보드 자동화 (cinematic-storyboard-studio) — 디자인 & 로그인 2탭 개편 인수인계서

> **작업 일시**: 2026-10-17
> **담당 CLI**: Antigravity (`agy`)
> **버전**: `v1.06` ➔ **`v1.07`**
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 (Creative Atelier Style · 시네마틱 아틀리에)**
> **공식 서비스 URL**: `https://cinematic-storyboard-studio.buylife.xyz`
> **로그인 URL**: `https://cinematic-storyboard-studio.buylife.xyz/login`

---

## 1. 개요 및 목적
주인님의 전체 서브프로그램 로그인/회원가입 표준 2탭 레이아웃(`threads-comment-reply` 표준 규격) 통일 지침에 따라, `cinematic-storyboard-studio`의 로그인 라우트를 2탭 세그먼트 표준 레이아웃으로 전면 개편하고 기존 구형 라이트 박스로 인한 테마 불일치를 완벽히 해소했습니다.

---

## 2. 디자인 명세 및 컬러 토큰
- **배경 테마**: `#0b0f17` (다크 차콜) + 24px 간격 앰버 골드 모눈 격자 (`radial-gradient(rgba(245, 158, 11, 0.12) 1px, transparent 1px)`)
- **카드 서피스**: `#0e1422`/90 다크 글래스모피즘, `border-amber-500/20`, `shadow-2xl shadow-black/80`
- **시그니처 포인트**:
  - 상단 시네마틱 앰버 `Clapperboard` 슬레이트 심볼 (`from-amber-500 to-orange-500`, `ring-1 ring-amber-400/30`)
  - `AIMaster 통합 계정` 알약 뱃지 (`bg-amber-500/10 border-amber-500/30 text-amber-300`)
  - 2탭 세그먼트 컨트롤: `bg-[#0f172a]/80`, 활성 탭 `from-amber-500 to-orange-500` 그라디언트
  - 인풋 필드: 좌측 아이콘(Mail, Lock), `pl-[42px]` 인셋 패딩, 포커스 시 `border-amber-500` 및 `ring-amber-500/20`
  - 액션 버튼: `from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600` 풀위드
  - 회원가입 탭: 단일 계정(SSO) 안내 박스, 시네마틱 스토리보드 혜택 체크리스트 3종, `AIMaster에서 무료 회원가입하기` 링크 버튼
  - 푸터: 이용약관 · 개인정보처리방침 · 고객지원 통합 링크

---

## 3. 변경 파일 목록
- `cinematic-storyboard-studio/src/lib/version.ts`: `v1.07` 갱신 및 `MAIN_SITE` export
- `cinematic-storyboard-studio/package.json`: version `1.07.0`
- `cinematic-storyboard-studio/src/app/(auth)/login/page.tsx`: 표준 2탭 세그먼트 레이아웃 전면 구현
- `cinematic-storyboard-studio/docs/PLAN_20261017_LOGIN_RENEWAL.md`: 작업 기획 플랜 문서
- `cinematic-storyboard-studio/docs/IMPROVEMENT_HANDOFF_20261017.md`: 개선사항 및 인수인계 문서
- `cinematic-storyboard-studio/docs/DESIGN_HANDOFF.md`: 본 디자인 완료 인수인계서
- `scripts/verify_edge_cinematic_login_v107.cjs`: Microsoft Edge 실세션 검수 스크립트

---

## 4. 빌드 및 배포 검증
- **로컬 빌드**: `npm run build` (Turbopack) 성공 (`Compiled successfully in 5.6s`, `Finished TypeScript in 3.2s`)
- **Vercel 프로덕션 배포**: `dpl_8nu2zeo6scLrYuhk4pgXFeq6PtG9` 성공 (`READY`, `Aliased https://cinematic-storyboard-studio.buylife.xyz`)
- **DB 버전 동기화**: `programs.version = 'v1.07'`, `app_url = 'https://cinematic-storyboard-studio.buylife.xyz'` 확인 완료
- **Microsoft Edge 실세션 검수 캡처 확인**:
  1. `edge_cinematic_login_desktop_v107.png` (데스크톱 1280x900 로그인 탭)
  2. `edge_cinematic_signup_desktop_v107.png` (데스크톱 1280x900 회원가입 탭)
  3. `edge_cinematic_login_mobile_v107.png` (모바일 390x844 로그인 탭)
