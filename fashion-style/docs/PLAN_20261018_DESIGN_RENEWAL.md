# AI 패션스타일 자동화 (`fashion-style`) — 디자인 리뉴얼 개발 플랜 (2026-10-18, Antigravity 윈도우)

> **담당 에이전트**: Antigravity (윈도우)  
> **기준 버전**: `v1.09` ➔ `v1.10` 판올림  
> **공식 디자인 템플릿 명칭**: **크리에이티브 아틀리에 스타일 — 패션 매거진 미드나잇 변형 (Creative Atelier Style — Fashion Magazine Midnight Edition)**  
> **공식 서비스 URL**: https://fashion-style.buylife.xyz  
> **검수 브라우저**: Microsoft Edge (포그라운드 실세션 검수, 일반 회원 테스트 계정 `buylifemall@naver.com`)

---

## 1. 개요 및 목적
- **목적**: 기존 화이트/남색 기본 뼈대 UI를 탈피하고, 같은 뼈대의 이미지 프로그램(`portrait-photo` v1.22, `banana-canvas` v1.08, `four-cut-comics` v1.12)에서 성공적으로 검증된 **「맨 위 색 토큰 + 맨 끝 덮어쓰기 CSS」** 방식을 적용하여, 패션 매거진의 고급스러운 감성이 살아 숨쉬는 **크리에이티브 아틀리에 스타일 — 패션 매거진 미드나잇 변형**으로 전면 리뉴얼함.
- **주요 해결 과제**:
  1. 페이지 배경을 딥 미드나잇 네이비(`#0b0e17`)와 딥 네이비 카드(`#131824`), 로즈 골드/핑크(`#f472b6`) 및 일렉트릭 시안(`#38bdf8`) 포인트로 일체화하여 하이엔드 패션 매거진 룩북 감성 연출.
  2. 스튜디오 대시보드 3열 레이아웃(좌측 추천/옷장 패널, 중앙 캔버스/전후 비교기, 우측 뷰티/피팅 룸)의 다크 테마 시각 완성도 극대화.
  3. 좌측 사이드바 👗 브랜드 아이콘 테마화 및 **`📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴명 표준화** (`DESIGN.md` 9번 원칙 충족).
  4. 비주얼 가이드북(`/guide`) 히어로 배너, 3단계 워크플로우 카드, 상황별 코디 추천 칩, FAQ 7종 아코디언 탑재.
  5. 375px 모바일 뷰포트에서 상단 56px 슬림 헤더, 가로 넘침(0px 방어) 및 터치 편의성 확보.

---

## 2. 디자인 시스템 및 컬러 토큰

| 역할 | 토큰 변수명 | 색상 값 (HEX) | 설명 |
| :--- | :--- | :--- | :--- |
| **Main Background** | `--background` | `#0b0e17` | 딥 미드나잇 네이비 (패션 매거진의 깊이감 있는 바탕) |
| **Card Surface** | `--card` | `#131824` | 딥 네이비 카드 서피스 |
| **Nested Card / Panel** | `--card2` | `#1a2030` | 카드 내부 중첩 패널 / 아이템 슬롯 / 입력창 |
| **Stage & Canvas** | `--stage` | `#0f1420` | 피팅 캔버스 및 Before/After 비교기 배경 |
| **Border Line** | `--line` | `#263045` | 소프트 슬레이트 네이비 경계선 |
| **Strong Border** | `--line-strong` | `#3b4760` | 포커스 및 호버 테두리 |
| **Text Primary** | `--foreground` | `#f1f5f9` | 맑고 선명한 오프 화이트 |
| **Text Muted** | `--muted` | `#94a3b8` | 보조 캡션 및 라벨 |
| **Primary Brand** | `--brand` | `#f472b6` | **로즈 골드 & 핑크** (메인 액션 버튼, 피팅 강조, 잉크 `#1e0814`) |
| **Secondary Brand** | `--cyan` | `#38bdf8` | **일렉트릭 시안** (가상 뷰티, 핏 분석, 잉크 `#041c2c`) |
| **Accent Gold** | `--warn` | `#fbbf24` | 앰버 골드 (VIP 추천, 팁, 주의) |
| **Danger / Error** | `--danger` | `#f87171` | 오류 피드백 (대비 4.5:1 이상) |

---

## 3. 구현 세부 계획

1. **`globals.css` 테마 토큰 및 덮어쓰기 CSS 구축**:
   - 상단 `:root` 변수를 패션 매거진 미드나잇 토큰으로 교체.
   - 하단에 덮어쓰기 CSS 블록을 추가하여 사이드바, 버튼, 인풋, 패션 스튜디오 대시보드(`.ls-grid`, `.ls-panel`, `.ls-canvas`, `.ls-compare`, `.ls-card`), 모달, 매뉴얼 컴포넌트까지 완벽 테마화.
2. **사이드바 (`src/components/layout/Sidebar.tsx`) 정돈**:
   - 브랜드 배지를 👗 패션 아이콘 배지로 정돈.
   - 메뉴명을 표준 규격인 `📖 연동 & 사용 매뉴얼`로 통일.
   - 모바일 헤더에 👗 로고 + `v1.10` 배지 + ☰ 햄버거 버튼 탑재.
3. **비주얼 연동 & 사용 매뉴얼 (`/guide`) 고도화**:
   - 패션 매거진 히어로 배너 및 친근한 말풍선 탑재.
   - 3단계 핵심 파이프라인 비주얼 카드 (1. 사진 업로드 ➔ 2. AI 추천 & 가상 피팅 ➔ 3. 뷰티 리터칭 & 룩북 저장).
   - 6대 상황별 추천 코디 프리셋 칩 수록.
   - Gemini API 키 연동 보안 및 FAQ 7종 아코디언 제공.
4. **전체 화면 테마 통일**:
   - 스튜디오 대시보드(`/studio`), 설정(`/settings`), 로그인(`/login`) 배경 및 카드 일체화.
5. **버전 판올림 (`v1.10`)**:
   - `src/lib/version.ts`: `v1.10`
   - `package.json`: `1.10.0`
   - Supabase DB `programs` 테이블 (`slug: fashion-style`) `version: v1.10` 업데이트.

---

## 4. 검수 계획 및 완료 기준

1. **로컬 무결성 검증**:
   - `npm test` ➔ 기존 테스트 100% 통과.
   - `npx tsc --noEmit` ➔ 0 에러 통과.
   - `npm run build` ➔ Next.js Turbopack 프로덕션 빌드 성공.
2. **Vercel 프로덕션 배포**:
   - `vercel --prod --scope buylife` 1회 실행 (오늘 10-18 배포 이력 없음 확인 완료).
3. **Microsoft Edge 포그라운드 실세션 검수 (`headless: false`)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`)으로 실세션 로그인 및 Edge 실제 창 화면 유지.
   - 데스크톱 1440px 및 모바일 375px 반응형 뷰 캡처 7종 수집 및 저장.
4. **인수인계 문서 6종 완비 및 루트 마스터 현황판 동기화**:
   - `AGENTS.md`, `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`, `PLAN_20261018_DESIGN_RENEWAL.md`.
   - `DESIGN.md` 82번 완료 갱신, `docs/ACTIVE_WORK.md` 행 삭제, `docs/HANDOFF.md` 상단 보고서 등록, Git 커밋/푸시.
