# AI 올인원 그래픽 자동화 (allinone-graphic) — 디자인 & 로그인 2탭 개편 인수인계서

> **작업 일시**: 2026-10-17
> **담당 CLI**: Antigravity (`agy`)
> **버전**: `v1.04` ➔ **`v1.05`**
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 (Creative Atelier Style)**
> **공식 서비스 URL**: `https://graphic.buylife.xyz`
> **로그인 URL**: `https://graphic.buylife.xyz/login`

---

## 1. 개요 및 목적
주인님의 전체 서브프로그램 로그인/회원가입 표준 2탭 레이아웃(`threads-comment-reply` 표준 규격) 통일 지침에 따라, `allinone-graphic`의 로그인 라우트를 2탭 세그먼트 표준 레이아웃으로 전면 개편했습니다.

---

## 2. 디자인 명세 및 컬러 토큰
- **배경 테마**: `#090d16` (딥 미드나잇) + 24px 간격 앰버 모눈 격자 (`radial-gradient(rgba(245, 158, 11, 0.12) 1px, transparent 1px)`)
- **카드 서피스**: `#0d1424`/90 다크 글래스모피즘, `border-amber-500/20`, `shadow-2xl shadow-black/60`
- **시그니처 포인트**:
  - 상단 앰버 스파클 아이콘 뱃지 (`from-amber-500 to-orange-500`, `ring-1 ring-amber-400/30`)
  - `AIMaster 통합 계정` 알약 뱃지 (`bg-amber-500/10 border-amber-500/30 text-amber-300`)
  - 2탭 세그먼트 컨트롤: `bg-[#0f172a]/80`, 활성 탭 `from-amber-500 to-orange-500` 그라디언트
  - 인풋 필드: 좌측 아이콘(Mail, Lock), `pl-[42px]` 인셋 패딩, 포커스 시 `border-amber-500` 및 `ring-amber-500/20`
  - 액션 버튼: `from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600` 풀위드
  - 회원가입 탭: 단일 계정(SSO) 안내 박스, 혜택 체크리스트 3종, `AIMaster에서 무료 회원가입하기` 링크 버튼
  - 푸터: 이용약관 · 개인정보처리방침 · 고객지원 통합 링크

---

## 3. 변경 파일 목록
- `allinone-graphic/src/lib/version.ts`: `v1.05` 갱신 및 `MAIN_SITE` export
- `allinone-graphic/package.json`: version `1.0.5`
- `allinone-graphic/src/app/(auth)/login/page.tsx`: 표준 2탭 세그먼트 레이아웃 전면 구현
- `allinone-graphic/docs/PLAN_20261017_LOGIN_RENEWAL.md`: 작업 기획 플랜 문서
- `allinone-graphic/docs/IMPROVEMENT_HANDOFF_20261017.md`: 개선사항 및 인수인계 문서
- `allinone-graphic/docs/DESIGN_HANDOFF.md`: 본 디자인 완료 인수인계서
- `scripts/verify_edge_allinone_login_v105.cjs`: Microsoft Edge 실세션 검수 스크립트

---

## 4. 빌드 및 배포 검증
- **로컬 빌드**: `npm run build` (Turbopack) 성공 (`Compiled successfully in 5.7s`, `Finished TypeScript in 3.8s`)
- **Vercel 프로덕션 배포**: `dpl_8N833bv8PBxcbu1NnBP7q6Cok4rY` 성공 (`READY`, `Aliased https://graphic.buylife.xyz`)
- **DB 버전 동기화**: `programs.version = 'v1.05'` 완료
- **Microsoft Edge 실세션 검수 캡처 확인**:
  1. `edge_allinone_login_desktop_v105.png` (데스크톱 1280x900 로그인 탭)
  2. `edge_allinone_signup_desktop_v105.png` (데스크톱 1280x900 회원가입 탭)
  3. `edge_allinone_login_mobile_v105.png` (모바일 390x844 로그인 탭)
