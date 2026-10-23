# AI 프롬프트 템플릿 자동화 — 디자인 리뉴얼 개발 플랜 (2026-10-16)

> **프로그램명**: AI 프롬프트 템플릿 자동화 (`prompt-template-studio`)  
> **공식 라이브 URL**: https://prompt-template.buylife.xyz/  
> **작업 버전**: `v1.03` ➔ `v1.04`  
> **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 템플릿 스튜디오)**  
> **배경 및 테마**: 라이트 클린 슬레이트 (`#f8fafc`), 퓨어 화이트 카드 (`#ffffff`), 블루/인디고 포인트 (`#2563eb` ~ `#4f46e5`)  
> **담당 CLI**: Antigravity(Windows) — `agy`  

---

## 1. 개요 및 배경

본 프로그램은 동적 변수(`{{variable}}`)를 포함한 맞춤형 프롬프트 템플릿을 생성·관리하고, AI 3단 스마트 제안 및 변수 자동 채우기, Gemini 모델 원클릭 실행을 지원하는 생산성 도구입니다.
기존 화면은 화이트/뉴트럴 톤으로 구성되어 있으나, 풀스크린 형태의 단계별 비주얼 사용 매뉴얼(`/guide`)이 누락되어 팝업 모달 형태로만 제공되고 있었습니다.
이에 최상단 지침 7번(단계별 비주얼 사용 매뉴얼 신설 의무)과 11번(전 화면 단일 배경색 및 통일된 테마 준수 의무)에 따라, 전체 화면을 단일 슬레이트(`#f8fafc`) 배경으로 일체화하고 체계적인 비주얼 가이드북을 구축합니다.

---

## 2. 작업 범위 및 세부 계획

### A. 디자인 템플릿화 및 테마 단일화
1. **단일 배경색 통일 (최상단 지침 11번)**:
   - `src/app/globals.css`: `body` 배경을 `bg-[#f8fafc] text-slate-900`으로 고정.
   - `src/components/PromptTemplateApp.tsx`: 최상위 컨테이너 `min-h-screen bg-[#f8fafc]` 적용.
   - 대시보드 템플릿 라이브러리(`PromptLibrary`), 가이드 뷰(`PromptGuideView`) 모두 동일한 슬레이트/화이트 카드 디자인 시스템 일치.
2. **사이드바 UI 정돈**:
   - `src/components/Sidebar.tsx`: 사이드바 `bg-white border-slate-200`, 블루/인디고 활성 배지.
   - 유틸리티 영역 최상단에 `📖 연동 & 사용 매뉴얼` 메뉴 신설 (`tab=guide` 및 `/guide` 라우트 연동).
   - 계정 이메일 및 로그아웃 버튼 12px 간격 밀착 배치.

### B. 단계별 비주얼 사용 매뉴얼 전면 신설 (최상단 지침 7번)
1. **신규 컴포넌트 `src/components/PromptGuideView.tsx` 구축**:
   - **5단계 파이프라인 인포그래픽**:
     - Step 1: 본인 Gemini API 키 1초 연동 (`user_api_keys.provider = 'gemini'`)
     - Step 2: 템플릿 탐색 또는 새 프롬프트 제작 (`{{변수}}` 문법)
     - Step 3: AI 3단 어시스턴트 활용 (제목/설명/본문 자동 제안)
     - Step 4: AI 변수 자동 채우기 & 원클릭 즉시 실행 (Gemini 2.5 Flash)
     - Step 5: JSON 내보내기 및 기기간 백업 & 복원
   - **{{동적 변수}} 문법 치트시트 & 실전 활용 가이드**:
     - 변수 선언 문법, 카테고리별 추천 템플릿 패턴 카드
   - **프롬프트 엔지니어링 4대 핵심 원칙 (골든 룰)**:
     - 명확한 페르소나 설정, 구체적 입력 제약, 출력 포맷 명시, 동적 변수화
   - **자주 묻는 질문 (FAQ) 4종 아코디언 컴포넌트**:
     - API 비용, 변수 개수 제한, 모델 실행 속도, 데이터 안전성
2. **독립 라우트 및 SPA 동기화**:
   - `src/app/guide/page.tsx` 생성으로 `/guide` 직접 접속 지원.
   - `PromptTemplateApp.tsx`에서 URL 쿼리 파라미터 `?tab=`과 탭 상태(`library`, `guide`) 양방향 동기화.

### C. 버전 동기화 및 검증
1. **버전 판올림**: `v1.03` ➔ **`v1.04`**
   - `src/lib/version.ts`: `APP_VERSION = 'v1.04'`
   - `package.json`: `"version": "1.4.0"`
   - Supabase 공유 DB `programs` 테이블: `version = 'v1.04'` 업데이트.
2. **로컬 빌드 검증**: `npm run build` (Turbopack).
3. **Vercel 프로덕션 배포**: `vercel deploy --prod --yes --scope buylife`.
4. **Microsoft Edge (`msedge.exe`) 실세션 브라우저 검수**:
   - 데스크톱(1440px) 및 모바일(390px) 화면 캡처 및 일체감 검증.

---

## 3. 검수 계획
- Microsoft Edge 브라우저를 통한 실서버(`https://prompt-template.buylife.xyz/`) 검수:
  1. `/guide` 및 `?tab=guide` 비주얼 가이드북 5단계 파이프라인 & FAQ 아코디언 정상 렌더링.
  2. 대시보드 라이브러리(`?tab=library`)와 가이드 화면의 단일 배경색(`#f8fafc`) 일체감 확인.
  3. 사이드바 `📖 연동 & 사용 매뉴얼` 탭 전환 및 모바일 390px 반응형 가독성 확인.
