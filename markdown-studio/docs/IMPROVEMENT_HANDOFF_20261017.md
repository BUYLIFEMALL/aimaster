# 마크다운 문서 자동화 (markdown-studio) 개선사항 인수인계서 (2026-10-17)

> **프로그램**: 마크다운 문서 자동화 (`markdown-studio`, slug: `markdown-studio`, 프로그램 No. 1)  
> **공식 라이브 URL**: [https://markdown-studio.buylife.xyz](https://markdown-studio.buylife.xyz)  
> **배포 버전**: `v1.11` (이전 버전: `v1.10`)  
> **인수인계 작성자**: Antigravity CLI (Windows)

---

## 1. 개선 작업 내역 (로그인·회원가입 표준 2탭 레이아웃 적용)
- **배경**: 2026-10-17 주인님 지시로 전 프로그램 로그인/회원가입 레이아웃을 `threads-comment-reply` 표준 규격으로 일체화.
- **주요 변경 사항**:
  1. `src/app/login/page.tsx`: 포커스 스튜디오 소프트 크림 격자 모눈 배경(`linear-gradient(...)` 24px x 24px), 상단 타이틀/안내 문구, 둥근 모서리 카드(`rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm`), 상단 2버튼 알약 탭 토글 바(`[로그인]` / `[회원가입]`) 전면 구현.
  2. **로그인 모드**: 이메일(메일 아이콘), 비밀번호(자물쇠 아이콘 + "비밀번호 찾기?"), 풀 위드 딥 인디고 `로그인 ->` 버튼 탑재.
  3. **회원가입 모드**: "이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다..." 안내 문구 및 풀 위드 `AIMaster 회원가입 하러가기` 버튼 탑재.
  4. **하단 푸터**: 이용약관 및 개인정보 처리방침 링크 탑재.
  5. 버전 판올림: `v1.10` ➔ `v1.11` (패키지 `1.11.0`, Supabase DB `programs` 동기화).

---

## 2. 향후 추가 개선 과제 (IMPROVEMENTS)
1. **Google Drive 양방향 자동 동기화 고도화**: 마크다운 문서를 실시간으로 구글 드라이브 지정 폴더에 자동 백업하는 옵션 강화.
2. **소셜 로그인(OAuth) 버튼 옵션**: 향후 AIMaster 메인 OAuth 인프라와 연계하여 원클릭 로그인 버튼 추가 고려.
