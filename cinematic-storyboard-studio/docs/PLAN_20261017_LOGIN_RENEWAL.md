# 시네마틱 스토리보드 자동화 (cinematic-storyboard-studio) — 로그인 2탭 표준화 개발 플랜

> **작성 일자**: 2026-10-17
> **담당 CLI**: Antigravity (`agy`)
> **대상 프로그램**: `cinematic-storyboard-studio` (프로그램 번호 7번)
> **공식 서비스 URL**: `https://cinematic-storyboard-studio.buylife.xyz` (로그인: `https://cinematic-storyboard-studio.buylife.xyz/login`)
> **버전 계획**: `v1.06` ➔ **`v1.07`**
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 (시네마틱 아틀리에 · 차콜 `#0b0f17` 24px 앰버 골드 모눈 격자, 카드 다크 글래스모피즘, 시네마틱 앰버 `#f59e0b` ➔ `#ea580c` 그라디언트 탭 & 버튼)**

---

## 1. 배경 및 목적
1. **표준 2탭 레이아웃 통일 지침**: 사용자 레퍼런스(`threads-comment-reply` 스타일)에 맞춘 `[로그인]` / `[회원가입]` 2탭 세그먼트 전환 구조 구축.
2. **테마 불일치 전면 해소**: 현재 구형 화이트 박스(`bg-white border-gray-200`)로 되어 있어 프로그램 본체(시네마틱 아틀리에 다크 차콜 `#0b0f17`)와 화면이 불일치함. 단일 배경색 및 일관된 테마 스타일 준수 지침에 따라 딥 차콜 `#0b0f17` + 24px 앰버 모눈 격자 + 다크 글래스모피즘 카드로 전면 개편.
3. **잘못된 복사 텍스트 및 오래된 URL 수정**:
   - 서브 문구에 타 프로그램("이미지를 변환·편집하세요") 잔여 텍스트 수정.
   - 구형 링크 `https://www.buylife.xyz/register`를 `https://aimaster.buylife.xyz/signup`으로 최신화.

---

## 2. 세부 구현 계획
1. **상단 브랜딩 영역**:
   - 시네마틱 앰버 슬레이트 로고 (`Clapperboard` 아이콘)
   - `AIMaster 통합 계정` 알약 뱃지 (`bg-amber-500/10 border-amber-500/30 text-amber-300`)
   - H1 타이틀 `시네마틱 스토리보드 자동화` + `v1.07` 뱃지
   - 서브 문구: "하나의 계정으로 시네마틱 영상 기획부터 씬별 스토리보드·영상 프롬프트까지 한 번에 자동화하세요"
2. **2탭 세그먼트 토글 바**:
   - 컨테이너: `bg-[#0f172a]/80 border-slate-700/60 p-1.5 rounded-xl grid grid-cols-2 gap-1`
   - 활성 탭: `bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20`
3. **로그인 탭**:
   - 이메일: 좌측 Mail 아이콘 + 42px 인셋 패딩
   - 비밀번호: 좌측 Lock 아이콘 + 우측 "비밀번호를 잊으셨나요?" 링크
   - 풀위드 액션 버튼: `from-amber-500 to-orange-500` 그라디언트
4. **회원가입 탭**:
   - AIMaster 단일 계정(SSO) 안내 박스
   - 시네마틱 스토리보드 혜택 3종 체크리스트
   - `AIMaster에서 무료 회원가입하기 ➔` CTA 버튼
5. **하단 푸터**:
   - 이용약관 · 개인정보처리방침 · 고객지원 통합 안내

---

## 3. 검증 및 배포 계획
1. 로컬 Turbopack 빌드 (`npm run build`) 무결점 확인.
2. Vercel 프로덕션 배포 (`vercel --prod`).
3. Microsoft Edge 실세션 검수 스크립트 작성 및 캡처 3종(데스크톱 로그인/회원가입, 모바일 390px) 확인.
4. 인수인계 문서 작성 및 Git 커밋/푸시.
