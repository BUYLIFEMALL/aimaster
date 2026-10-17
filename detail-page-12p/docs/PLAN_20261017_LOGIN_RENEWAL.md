# AI 12단 상세페이지 자동화 (detail-page-12p) — 로그인 2탭 표준화 개발 플랜

> **작성 일자**: 2026-10-17
> **담당 CLI**: Antigravity (`agy`)
> **대상 프로그램**: `detail-page-12p` (프로그램 번호 8번)
> **공식 서비스 URL**: `https://detail-12p.buylife.xyz` (로그인: `https://detail-12p.buylife.xyz/login`)
> **버전 계획**: `v1.04` ➔ **`v1.05`**
> **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 이커머스 상세페이지 · 클린 슬레이트 `#f8fafc` 24px 모눈 격자, 카드 화이트 `#ffffff` & 보더 `border-slate-200`, 인디고/블루 `#4f46e5` ➔ `#2563eb` 알약 탭 & 버튼)**

---

## 1. 배경 및 목적
1. **표준 2탭 레이아웃 통일 지침**: 사용자 레퍼런스(`threads-comment-reply` 스타일)에 맞춘 `[로그인]` / `[회원가입]` 2탭 세그먼트 전환 구조 구축 (기존 단일 로그인 폼 ➔ 2탭 표준화).
2. **포커스 스튜디오 라이트 격자 테마 정밀화**: 클린 슬레이트 `#f8fafc` 배경 + 24px 모눈 격자, 카드 화이트 `#ffffff`, 인디고/블루 알약 탭 및 액션 버튼 일관 적용.
3. **오래된 도메인/경로 최신화**:
   - 구형 링크 `https://www.buylife.xyz`를 `https://aimaster.buylife.xyz/signup` 및 `/forgot-password`로 최신화.
   - 인풋 필드 좌측 아이콘(Mail, Lock), 42px 인셋 패딩, 우측 비밀번호 찾기 링크 적용.

---

## 2. 세부 구현 계획
1. **상단 브랜딩 영역**:
   - 인디고-블루 `LayoutTemplate` 아이콘 뱃지 (`from-blue-600 to-indigo-600`)
   - `AIMaster 통합 계정` 알약 뱃지 (`bg-blue-50 border-blue-200 text-blue-600`)
   - H1 타이틀 `AI 12단 상세페이지 자동화` + `v1.05` 뱃지
   - 서브 문구: "하나의 계정으로 쿠팡·스마트스토어 12단 상세페이지를 원클릭으로 기획하고 렌더링하세요"
2. **2탭 세그먼트 토글 바**:
   - 컨테이너: `bg-slate-100/90 border border-slate-200 p-1.5 rounded-xl grid grid-cols-2 gap-1`
   - 활성 탭: `bg-white text-slate-900 shadow-sm font-bold border border-slate-200/60` (포커스 스튜디오 라이트 탭)
3. **로그인 탭**:
   - 이메일: 좌측 Mail 아이콘 + 42px 인셋 패딩
   - 비밀번호: 좌측 Lock 아이콘 + 우측 "비밀번호를 잊으셨나요?" 링크
   - 풀위드 액션 버튼: `from-blue-600 to-indigo-600` 그라디언트
4. **회원가입 탭**:
   - AIMaster 단일 계정(SSO) 안내 틴트 박스
   - 12단 상세페이지 혜택 3종 체크리스트
   - `AIMaster에서 무료 회원가입하기 ➔` CTA 버튼
5. **하단 푸터**:
   - 이용약관 · 개인정보처리방침 · 고객지원 통합 안내

---

## 3. 검증 및 배포 계획
1. 로컬 Turbopack 빌드 (`npm run build`) 무결점 확인.
2. Vercel 프로덕션 배포 (`vercel --prod`).
3. Microsoft Edge 실세션 검수 스크립트 작성 및 캡처 3종(데스크톱 로그인/회원가입, 모바일 390px) 확인.
4. 인수인계 문서 작성 및 Git 커밋/푸시.
