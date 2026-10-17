# AI Prompt 자동화 (ai-prompt-studio) v1.06 로그인·회원가입 표준 2탭 레이아웃 리뉴얼 개발 플랜

## 1. 개요 및 목적
- **대상 프로그램**: `ai-prompt-studio` (AI Prompt 자동화, 11번)
- **현재 버전**: `v1.05` ➔ **목표 버전**: `v1.06`
- **공식 라이브 도메인**: `https://ai-prompt.buylife.xyz`
- **목적**:
  - `DESIGN.md` 14번 규격 및 사용자 제공 표준 레퍼런스(`threads-comment-reply`) 기반 `[로그인]` / `[회원가입]` 2탭 세그먼트 토글 컨트롤 전면 개편.
  - 단일 폼에서 벗어나, 로그인과 회원가입 탭을 1클릭으로 전환 가능하도록 개선.
  - 포커스 스튜디오 테마(클린 슬레이트 `#f8fafc` 24px 모눈 격자, 카드 화이트 `#ffffff`, 바이올렛-인디고 테마)와 완벽한 시각적 일체감 확보.
  - 구형 도메인(`www.buylife.xyz`)을 최신 통합 계정 URL(`https://aimaster.buylife.xyz`)로 전면 교체.

## 2. 상세 작업 범위
1. **버전 및 설정 동기화**:
   - `src/lib/version.ts`: `APP_VERSION = 'v1.06'`, `MAIN_SITE_URL = "https://aimaster.buylife.xyz"` export 추가
   - `package.json`: `"version": "1.06.0"`
   - Supabase DB: `node scripts/update_program_version.cjs ai-prompt-studio v1.06`
2. **로그인 / 회원가입 2탭 표준 컴포넌트 구현 (`src/app/(auth)/login/page.tsx`)**:
   - 상단 심볼: 바이올렛-인디고 그라디언트 `Sparkles` 아이콘 + "AIMaster 통합 계정" 알약 뱃지 + `v1.06` 버전 뱃지
   - 세그먼트 토글: `[로그인]` / `[회원가입]` 2탭 (액티브 시 화이트 알약 카드 & `shadow-xs text-slate-900`)
   - **로그인 모드**:
     - 이메일: 좌측 `Mail` 아이콘, 42px 패딩
     - 비밀번호: 좌측 `Lock` 아이콘 + 우측 "비밀번호를 잊으셨나요?" 링크
     - 풀 위드 그라디언트 액션 버튼 (`로그인하고 프롬프트 스튜디오 시작 ➔`)
   - **회원가입 모드**:
     - AIMaster 단일 계정(SSO) 안내 바이올렛 틴트 박스
     - AI Prompt 자동화 혜택 3종 체크리스트
     - 풀 위드 링크 버튼 (`AIMaster에서 무료 회원가입하기 ➔`)
   - **하단 푸터**:
     - 이용약관 · 개인정보처리방침 · 고객지원 가이드 링크
3. **빌드, 배포 및 Edge 검수**:
   - Turbopack 로컬 빌드: `npm run build`
   - Vercel 프로덕션 배포: `vercel --scope buylife --prod --yes`
   - Microsoft Edge 실세션 검수 스크립트 작성 및 캡처 3종 확인:
     - `edge_ai_prompt_login_desktop_v106.png` (1280x900 데스크톱 로그인)
     - `edge_ai_prompt_signup_desktop_v106.png` (1280x900 데스크톱 회원가입 탭)
     - `edge_ai_prompt_login_mobile_v106.png` (390x844 모바일 반응형)
4. **인수인계 및 문서 동기화**:
   - `ai-prompt-studio/docs/DESIGN_HANDOFF.md`
   - `ai-prompt-studio/docs/IMPROVEMENT_HANDOFF_20261017_LOGIN.md`
   - 루트 `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md`

## 3. 검증 기준
- [ ] 2탭 세그먼트 클릭 전환이 부드럽고 정상적으로 동작하는가
- [ ] 데스크톱 및 모바일(390px) 뷰에서 찌그러짐이나 가로 스크롤이 없는가
- [ ] Next.js 16 빌드가 정상 통과되는가
- [ ] Vercel 배포 후 프로덕션 도메인에서 정상 서빙되는가
