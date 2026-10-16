# 마크다운 문서 자동화 (markdown-studio) 로그인·회원가입 표준 2탭 레이아웃 리뉴얼 개발플랜

> **작성일자**: 2026-10-17  
> **작업 에이전트**: Antigravity CLI (Windows)  
> **적용 버전**: `v1.10` ➔ `v1.11`  
> **적용 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 소프트 크림 `#faf8f5` 격자 배경 & 딥 인디고 `#4f46e5` 포인트)**  
> **공식 서비스 URL**: [https://markdown-studio.buylife.xyz](https://markdown-studio.buylife.xyz)

---

## 1. 개요 및 배경
- 2026-10-17 주인님 지시: 모든 서브프로그램의 로그인 및 회원가입 화면을 `threads-comment-reply` 기준의 표준 2탭 토글 레이아웃으로 일괄 통일.
- `markdown-studio`의 기존 로그인 화면(`src/app/login/page.tsx`)은 단순 welcome card 형태로 탭 전환 기능이 없고, 회원가입 시 필수 문구("이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다") 및 이용약관/개인정보 처리방침 푸터 링크가 누락되어 있었음.

---

## 2. 작업 목표 및 상세 스펙
1. **은은한 24px 모눈 격자 배경 & 헤더 정비 (`src/app/login/layout.tsx` 또는 `page.tsx`)**:
   - 포커스 스튜디오 소프트 크림(`linear-gradient(...)` 24px x 24px 모눈선) 배경.
   - 중앙 `max-w-[440px]` 뷰포트 컨테이너.
   - 상단 헤더: `마크다운 문서 자동화` 타이틀 (`text-2xl font-extrabold text-[#4f46e5]`) + 서브타이틀("AIMaster 계정(이메일·비밀번호)으로 로그인하세요.").
2. **상단 2버튼 알약형 탭 토글 바**:
   - `[로그인]` / `[회원가입]` 전환 탭.
   - 활성 탭: 포커스 스튜디오 딥 인디고(`bg-[#4f46e5] text-white shadow-sm`), 비활성: `text-zinc-600`.
3. **[로그인 탭]**:
   - 이메일 주소: 좌측 메일 아이콘(`Mail`), 플레이스홀더 `developer@example.com`.
   - 비밀번호: 라벨 우측 "비밀번호 찾기?" 링크, 좌측 자물쇠 아이콘(`Lock`), 플레이스홀더 `••••••••`.
   - 기존 검증된 `createClient().auth.signInWithPassword` 인증 로직 유지 후 성공 시 `/dashboard` 이동.
   - 풀 위드 딥 인디고 액션 버튼 `로그인 ->`.
4. **[회원가입 탭]**:
   - 필수 안내 문구: "이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다. AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다."
   - 풀 위드 액션 버튼: `AIMaster 회원가입 하러가기` (`https://www.buylife.xyz/register`).
5. **[하단 푸터]**:
   - "계속 진행함으로써 귀하는 당사의 이용약관 및 개인정보 처리방침에 동의하게 됩니다." 안내 링크.
6. **버전 판올림**:
   - `src/lib/version.ts`: `APP_VERSION = "v1.11"`
   - `package.json`: `"version": "1.11.0"`
   - Supabase DB `programs.version = 'v1.11'` 동기화.

---

## 3. 검증 및 배포 절차
1. 로컬 Turbopack 빌드 검증 (`npm run build`, exit code 0).
2. Vercel 프로덕션 배포 (`https://markdown-studio.buylife.xyz`).
3. Microsoft Edge 실세션 화면 검수:
   - 데스크톱(1440px): 로그인 탭 & 회원가입 탭 렌더링 확인.
   - 모바일(390px): 반응형 카드 및 가로 스크롤 넘침 없음 확인.
4. 인수인계 문서 작성 및 Git 커밋/푸시.
