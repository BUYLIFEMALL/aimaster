# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **캐릭코드(mbti-character)** 프로젝트에서 AI Agent(Claude Code 등)가 협업할 때
준수해야 할 필수 가이드라인입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **환경변수와 API 키 변경**(카카오 공유 SDK 앱키 등)

---

## 🎯 프로젝트 목적

AIMaster 계정으로 **로그인해야 이용할 수 있는 캐릭터 매칭 성격유형 테스트 웹사이트**
(2026-09-14부터 — 그 전엔 `mbti`처럼 로그인 없는 공개 사이트였다). 로그인 → 20문항 검사
(`/test`) → 4개 이분지표(E/I, S/N, T/F, J/P) 점수화 → 16개 유형 중 하나로 매칭된 자체
제작 오리지널 캐릭터를 결과로 보여주고 → 카카오톡/인스타 공유용 동적 OG 카드 생성까지가
핵심 흐름이다. 로그인 요구사항은 "AIMaster 회원가입 유도 채널"이라는 사용자의 명시적
전략이기도 하다. 자세한 설계 배경(왜 로그인이 필요해졌는지, 왜 자체 제작 캐릭터를 쓰는지,
폴더명과 브랜드명이 왜 다른지, 자매 프로젝트 mbti와 무엇이 다른지)은 README.md 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `mbti-character/`
* 모든 관련 소스 코드는 이 폴더 내에서 개발 및 관리합니다.

---

## ⚠️ 캐릭터 콘텐츠 작성 시 반드시 지킬 것

`lib/characters.ts`의 16개 캐릭터는 전부 **자체 제작(오리지널) 캐릭터**다. 실존하는
애니메이션/게임/영화 속 캐릭터의 이름·설정·세계관을 가져다 쓰지 않는다 — 이 프로젝트는
구독 결제가 있는 상업 플랫폼(AIMaster)에서 서비스되므로, 참고 프로젝트인 ACGTI처럼
비상업 동인 문화 관례(실존 캐릭터 이름 사용)를 그대로 따라 하면 저작권 리스크가 크다
(2026-09-14 사용자 확인 후 결정). 캐릭터를 추가/수정할 때도 이름과 설정을 새로 창작할 것.

---

## 🔗 AIMaster 플랫폼 공통 원칙 적용 현황

mbti-character는 AIMaster 저장소 안의 서브프로젝트이므로 "Platform-hub 구조"(서브폴더
안에서 자기완결적으로 개발·배포)는 그대로 따른다. 2026-09-14부터 로그인이 필요해지면서
threads/blog 등과 동일한 멀티테넌시 표준 패턴도 대부분 적용됐다:
- `lib/access.ts`의 `requireProgramAccess()`(페이지/레이아웃)와 `checkProgramAccessApi()`
  (API route)로 로그인 + `mbti-character` 프로그램 이용 권한을 확인한다. 새 페이지나 API
  route를 추가할 때 이 체크를 빠뜨리지 말 것(다른 서브프로젝트에서 반복적으로 발생한 실수 —
  루트 CLAUDE.md 멀티테넌시 원칙 1번 감사 이력 참고).
- 로그인 확인이 들어가는 파일에는 `dynamic = "force-dynamic"` + `fetchCache =
  "force-no-store"`를 반드시 같이 선언한다 — 이미 `middleware.ts`, `app/layout.tsx`,
  `app/page.tsx`, `app/test/page.tsx`, `app/result/[type]/page.tsx`, `app/settings/page.tsx`,
  `app/api/generate-character-image/route.ts`에 적용돼 있다.
- 공용 Supabase 프로젝트(esgxyikcnnvmlhygjkth)를 그대로 쓰되, 검사 응답/결과 저장용 이
  프로젝트 자체 데이터 테이블(`user_id` + RLS owner-only)은 아직 없다 — 검사 응답/결과가
  여전히 클라이언트+URL 파라미터로만 오가고 서버에 저장되지 않기 때문이다. 결과를 서버에
  저장하는 기능(예: 검사 이력)을 추가하게 되면 그때 이 원칙을 적용할 것.
- **`user_api_keys` 표준 패턴을 그대로 쓴다(BYOK/localStorage 방식 아님).** 2026-09-14
  처음엔 로그인이 없어 BYOK(방문자가 결과 화면에서 직접 키 입력 → localStorage 보관)로
  만들었지만, 로그인이 필수가 된 뒤에도 전환을 깜빡해서 사용자가 "API 키 등록 절차가
  빠졌다"고 지적한 뒤 표준 패턴으로 바꿨다 — `lib/apiKeys.ts`의 `resolveApiKey()`가
  공용 `user_api_keys`(provider="gemini")에서 회원 본인 키만 조회하고, `/settings`
  (헤더 라벨 "API키등록·플랫폼연동")에서 등록/삭제한다. **새로운 유료 API 연동을
  추가할 때 로그인 기반 회원 시스템이 이미 있다면, 절대 BYOK/localStorage로 되돌아가지
  말고 처음부터 이 표준 패턴을 쓸 것** — 이 프로젝트가 그 실수를 겪은 전례다. 자세한
  히스토리는 README.md "AI 캐릭터 이미지 생성" 참고.
- **예외: `/api/og`는 로그인 체크에서 제외한다.** 카카오톡/페이스북 크롤러가 로그인 없이
  이 URL을 긁어가야 공유 미리보기 카드가 정상 노출되므로, `middleware.ts`의 matcher에서
  `api/og` 경로 자체를 뺐다. 이 경로에 실수로 로그인 체크를 추가하지 말 것.

AIMaster 플랫폼과의 연결은 헤더의 "다른 프로그램 보기" 링크(`buylife.xyz/programs`)와,
`programs` 카탈로그 등록으로 유지한다(README.md "남은 작업" 참고).

## 📦 Phase 진행 상태

상세 내용은 README.md의 "Phase 진행 상태" 표 참고. 한 번에 다 만들지 않고 Phase별로
하나씩 붙여나간다.
