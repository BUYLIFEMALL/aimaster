# 플레이리스트 채널 제작 자동화 (playlist-channel-studio) — 로그인 2탭 표준화 개발 플랜

> **작성 일자**: 2026-10-17
> **담당 CLI**: Antigravity (`agy`)
> **대상 프로그램**: `playlist-channel-studio` (프로그램 번호 6번)
> **공식 서비스 URL**: `https://playlist.buylife.xyz` (로그인: `https://playlist.buylife.xyz/login`)
> **버전 계획**: `v1.09` ➔ **`v1.10`**
> **적용 디자인 템플릿**: **사이버 네온 다크 콘솔 스타일 (Cyber Neon Dark Console Style · 딥블랙 `#060911` 24px 사이안 모눈 격자, 카드 다크 글래스모피즘, 네온 사이안-인디고 `#06b6d4` ➔ `#6366f1` 그라디언트 탭 & 버튼)**

---

## 1. 배경 및 목적
1. **표준 2탭 레이아웃 통일 지침**: 사용자 레퍼런스(`threads-comment-reply` 스타일)에 맞춘 `[로그인]` / `[회원가입]` 2탭 세그먼트 전환 구조 구축.
2. **테마 불일치 전면 해소**: 현재 구형 화이트 박스(`bg-white border-gray-200`)로 되어 있어 프로그램 메인 테마(사이버 네온 다크 콘솔)와 어긋남. 이를 딥블랙 `#060911` + 24px 사이안 모눈 격자 + 다크 글래스모피즘 카드로 일관되게 개편.
3. **잘못된 복사 텍스트 및 오래된 URL 수정**:
   - 서브 문구에 타 프로그램("이미지를 변환·편집하세요") 잔여 텍스트 수정.
   - 구형 링크 `https://www.buylife.xyz/register`를 `https://aimaster.buylife.xyz/signup`으로 표준화.

---

## 2. 세부 구현 계획
1. **상단 브랜딩 영역**:
   - 네온 사이안-인디고 스퀘어 로고 (`ListMusic` 아이콘)
   - `AIMaster 통합 계정` 알약 뱃지 (`bg-cyan-500/10 border-cyan-500/30 text-cyan-300`)
   - H1 타이틀 `플레이리스트 채널 제작 자동화` + `v1.10` 뱃지
   - 서브 문구: "하나의 계정으로 유튜브 플레이리스트 기획부터 비주얼·선곡까지 한 번에 자동화하세요"
2. **2탭 세그먼트 토글 바**:
   - 컨테이너: `bg-[#0b101b]/80 border-slate-800/80 p-1.5 rounded-xl grid grid-cols-2 gap-1`
   - 활성 탭: `bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md shadow-cyan-500/20`
3. **로그인 탭**:
   - 이메일: 좌측 Mail 아이콘 + 42px 인셋 패딩
   - 비밀번호: 좌측 Lock 아이콘 + 우측 "비밀번호를 잊으셨나요?" 링크
   - 풀위드 액션 버튼: `from-cyan-500 to-indigo-500` 그라디언트
4. **회원가입 탭**:
   - AIMaster 단일 계정(SSO) 안내 박스
   - 플레이리스트 채널 제작 혜택 3종 체크리스트
   - `AIMaster에서 무료 회원가입하기 ➔` CTA 버튼
5. **하단 푸터**:
   - 이용약관 · 개인정보처리방침 · 고객지원 통합 안내

---

## 3. 검증 및 배포 계획
1. 로컬 Turbopack 빌드 (`npm run build`) 무결점 확인.
2. Vercel 프로덕션 배포 (`vercel --prod`).
3. Microsoft Edge 실세션 검수 스크립트 작성 및 캡처 3종(데스크톱 로그인/회원가입, 모바일 390px) 확인.
4. 인수인계 문서 작성 및 Git 커밋/푸시.
