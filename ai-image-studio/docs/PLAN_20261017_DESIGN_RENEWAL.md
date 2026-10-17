# AI 이미지 스튜디오 (ai-image-studio) 디자인 리뉴얼 및 가이드 구축 개발플랜

> **작성일자**: 2026-10-17  
> **작업자**: Antigravity (agy, Windows)  
> **프로그램**: AI 이미지 스튜디오 (`ai-image-studio`)  
> **공식 서비스 링크**: [https://ai-image-studio.buylife.xyz](https://ai-image-studio.buylife.xyz)  
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 미드나잇 앰버/골드 변형 (Creative Atelier Style)**  
> **버전 변경**: `v1.11` → **`v1.12`**  
> **원칙 준수**: 루트 `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `DESIGN.md`, `docs/PROGRAM_DESIGN_STANDARD.md`, `docs/IMAGE_PROMPT_RULES.md`, `docs/IMAGE_MODEL_AUDIT_20261017.md`

---

## 1. 개요 및 배경

AI 이미지 스튜디오(`ai-image-studio`)는 AIMaster 플랫폼 전체에서 **이미지 생성·편집 및 AI 모델 연동의 공식 레퍼런스(기준) 프로그램**입니다.
Google Gemini(Nano Banana 2.1, 3 Pro Image, Flash Lite Image), OpenAI GPT Image, FLUX 2.0, Z-Image, Recraft, Ideogram 등 최첨단 이미지 모델을 폭넓게 연동하고 있습니다.

그러나 현재 다음과 같은 디자인 및 사용자 경험상의 미비점이 존재합니다:
1. **화면별 배경색 및 테마 불일치**:
   - `globals.css`는 `#09090b`이나 `layout.tsx`는 `bg-zinc-950`, 로그인 화면은 흰색 카드(`bg-white`)로 구성되어 통일된 시각적 정체성이 결여됨.
2. **비주얼 사용 매뉴얼 부재**:
   - 좌측 사이드바에 사용 매뉴얼 메뉴가 없고 전용 가이드 라우트(`/guide`)가 없어, 초보자 회원이 API 키 발급부터 모델 선택, 프롬프트 작성의 파이프라인을 한눈에 파악하기 어려움.
3. **공식 표준 로그인/회원가입 레이아웃 미적용**:
   - 2026-10-17 확정된 표준 2버튼 탭 토글 레이아웃(`[로그인]` / `[회원가입]`) 및 은은한 24px 격자 모눈 배경 미적용.
4. **프로그램 루트 문서(`AGENTS.md`, `README.md`) 7대 필수 규격 미비**:
   - 타 CLI가 언제든 이어받을 수 있는 사용목적, 기술스택, 기능/로직/장단점, 버전 히스토리, 백로그, 타 프로그램 연계 및 UI 개선 제안의 체계화 필요.

---

## 2. 작업 목표 및 구현 범위

### 2-1. 단일 배경색 및 일관된 테마 100% 일체화
- **메인 테마**: **크리에이티브 아틀리에 스타일 — 미드나잇 앰버/골드 변형**
- **기본 배경색**: 퓨어 옵시디언 블랙 (`#09090b` / `bg-zinc-950`)
- **포인트 액센트**: 크리에이티브 앰버/골드 (`#f59e0b` ~ `#d97706`) 및 사이언/바이올렛 보조 광채
- **카드 서피스**: `bg-zinc-900/70 border-zinc-800/80` 다크 글래스모피즘
- 모든 화면(대시보드 작업실, 갤러리, 프롬프트 관리, API 키 설정, 가이드북, 로그인) 동일 테마 적용.

### 2-2. 비주얼 사용 매뉴얼 (`/guide`) 신설 및 사이드바 연동
- 좌측 사이드바 상단에 `📖 연동 & 사용 매뉴얼` 전용 탭 메뉴 추가.
- `/guide` 페이지 신설:
  - **5단계 표준 파이프라인**: 1단계 API 키 연동 → 2단계 한글 아이디어 입력 → 3단계 AI 프롬프트 강화 → 4단계 AI 엔진 & 옵션 선택 → 5단계 갤러리 보관 & 다운로드.
  - **4대 실전 골든 팁**: 실사 포토리얼 묘사법, 한국인 인물 기본 묘사, 화면비(16:9, 1:1, 9:16) 최적화, 프롬프트 글자 배제 원칙.
  - **4종 FAQ 아코디언**: 비용 계산법(무료 모델 없음, 개인 키 직결), 상업적 이용 저작권, 생성 속도 및 실패 시 대응.
  - **개인 API 키 보안 안내**: 타인/운영자 키 공유 금지, 개인 브라우저 세션 보관.
  - **비로그인 공개 열람 허용**: 누구나 가이드를 미리 둘러보고 가입을 결정할 수 있도록 공개 라우팅.

### 2-3. 공식 표준 로그인/회원가입 2버튼 탭 토글 레이아웃 적용
- `app/(auth)/layout.tsx` 신설: 24px 앰버/골드 격자 모눈 배경, 딥 옵시디언 다크 테마.
- `app/(auth)/login/page.tsx` 리뉴얼:
  - 상단 알약형 `[로그인]` / `[회원가입]` 2버튼 탭 토글 바.
  - 로그인 폼: 이메일, 비밀번호, 비밀번호 찾기, 풀 위드 로그인 버튼.
  - 회원가입 탭: AIMaster 통합 회원 및 권한 안내 + 메인 사이트 회원가입 링크 버튼.
  - 하단 이용약관 및 개인정보 처리방침 안내 푸터.

### 2-4. 루트 문서 7대 필수 규격 완비 & 백로그 인수인계서 신설
- `ai-image-studio/AGENTS.md` 및 `ai-image-studio/README.md`에 7대 규격 반영:
  1. 사용목적 및 대상
  2. 사용된 기술/도구/플러그인/스킬
  3. 기능, 로직/아키텍처, 장점, 단점
  4. 현재 버전(`v1.12`) 및 버전별 변경 히스토리 (v1.00 ~ v1.12)
  5. 추가 대기 과제 (백로그)
  6. 타 프로그램 연계 및 혁신 아이디어 제안
  7. UI/UX 개선안 및 스타일 변경 제안
- `ai-image-studio/docs/IMPROVEMENT_BACKLOG.md` 신설.
- `ai-image-studio/docs/IMPROVEMENTS.md` 신설.

---

## 3. 구현 단계별 로드맵

1. **사전 준비 및 상태 등록** (완료):
   - `docs/ACTIVE_WORK.md` 및 `DESIGN.md` 상태 등록.
2. **개발플랜 및 개선 대장 작성**:
   - `PLAN_20261017_DESIGN_RENEWAL.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md` 생성.
3. **스타일 토큰 및 레이아웃 통일**:
   - `app/globals.css`, `app/(dashboard)/layout.tsx` 배경색 `#09090b` 일체화.
4. **비주얼 가이드북 (`/guide`) 구현**:
   - `components/ImageGuideView.tsx` 컴포넌트 개발.
   - `app/(dashboard)/guide/page.tsx` 라우트 신설.
   - `middleware.ts`에서 `/guide` 비로그인 접근 허용 처리.
   - `components/layout/Sidebar.tsx`에 `📖 연동 & 사용 매뉴얼` 메뉴 추가.
5. **로그인 표준 탭 토글 레이아웃 적용**:
   - `app/login/page.tsx`를 표준 다크 모눈 2버튼 탭 토글 레이아웃으로 전면 개편.
6. **버전 업그레이드 (`v1.12`)**:
   - `lib/version.ts`, `package.json`, Supabase DB `programs.version` 동기화.
7. **로컬 빌드 및 오류 검증**:
   - `npm run build` 성공 검증.
8. **Vercel 프로덕션 배포 & 도메인 Alias 검증**:
   - `vercel deploy --prod --yes` 실행 및 `https://ai-image-studio.buylife.xyz` 배포 확인.
9. **Microsoft Edge 브라우저 실세션 검수**:
   - 데스크톱(1440px) 및 모바일(375px~390px) 화면 캡처 및 검증.
10. **인수인계 문서 완비 및 Git 푸시**:
    - `DESIGN_HANDOFF.md`, `IMPROVEMENT_HANDOFF_20261017.md` 작성.
    - `AGENTS.md` / `README.md` 최신화.
    - `docs/ACTIVE_WORK.md` 내 줄 삭제 및 `DESIGN.md` 상태를 `✅ 1차 작업완료`로 변경.
    - `git commit` & `git push origin master`.
