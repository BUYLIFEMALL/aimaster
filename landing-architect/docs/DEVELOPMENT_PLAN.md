# AI 랜딩페이지 기획 자동화 (landing-architect) — 분석 및 개발 플랜 (2026-10-13, 승인 대기)

> 상태: **분석·플랜 단계. 코드 미착수.** 참고 원본: Google AI Studio 앱 "AI Landing Page Architect Enhance (배포용)" (개발자 GPT PARK).
> 원본 소스 ZIP(주인님 승인 후 `D:\PDS\lpa-source`에 받아 전수 정독, 실행하지 않음, 약 70KB·19개 파일). 코드는 복제하지 않고 흐름·프롬프트 구조·템플릿 데이터의 설계만 참고한다.

## 1. 원본 분석

### 1-1. 한 줄 요약
**주제·타겟·목표 3개를 입력하면 → AI가 주제별 템플릿(레이아웃 유형 + 메인/서브 4페이지 구조)을 적용한 "기획안 JSON"을 만들고 → 같은 대화 세션으로 단일 HTML 프로토타입을 생성**하며, 이미지는 키워드 플레이스홀더를 무료/키 기반 이미지 API로 치환한다. 결과 HTML은 미리보기·복사·다운로드하고 "AI Studio Build용 변환 프롬프트"로 다음 단계(Vite+React+Vercel)로 넘긴다. 서버 없이 브라우저에서 Gemini를 직접 호출하는 클라이언트 전용 앱.

### 1-2. 화면·단계 (실제 미리보기 확인)
헤더(로고·개발자 크레딧·설정) → **① 프로젝트 정의**(주제 + [주제 예시 선택] 드롭다운, [타겟/목표 자동 완성], 타겟, 목표, [기획안 생성 시작]) → **② 기획안**(JSON 표시·복사, [PROTO TYPE 만들기]) → **③ 프로토타입**(iframe 미리보기, HTML 복사·다운로드) → 하단 고정 바(React 프로젝트 변환 프롬프트 복사).

### 1-3. 전체 프로세스 흐름

| 단계 | 사용자 동작 | 내부 로직 (모델·호출) |
|---|---|---|
| 0. 설정 | 설정 모달: 이미지 소스(LoremFlickr 무료/Unsplash/Pexels/Pixabay) + 해당 키 입력·Test | 키를 `localStorage`에 XOR 난독화 저장(암호화 아님). Gemini 키는 빌드 환경변수 `GEMINI_API_KEY` |
| 1. 타겟/목표 자동 완성 | 주제 입력 후 버튼 | `gemini-3.1-pro-preview`, JSON 스키마 `{target, goal}`(한국어, 구체적 인구통계+심리/측정 가능한 목표). 실패하면 빈 값 반환(오류 은폐) |
| 2. 기획안 생성(Phase 1) | [기획안 생성 시작] | **채팅 세션 생성**(시스템 지침 + temperature 0.7) → 주제로 **템플릿 매핑**(`TOPIC_TEMPLATES`, 20개 프리셋 → 스타일 5종 + 구조 문자열 "Main / Sub1~4") → 프롬프트에 입력값·구조 전략 삽입 → **순수 JSON** 응답, 코드블록 제거 후 `JSON.parse`(실패 시 원문 그대로) |
| 3. 프로토타입(Phase 2) | [PROTO TYPE 만들기] | **같은 채팅 세션**에 "위 기획안 기반 단일 HTML" 지시(스타일별 Tailwind 레이아웃 가이드, importmap·React import 금지, 메인/서브를 `#home`/`#sub-page` 토글, Tailwind·FontAwesome CDN, 이미지 `loremflickr.com/1600/900/{영문키워드}`, 지도는 기획에 있을 때만). 응답에서 `<!DOCTYPE html>`~`</html>` 추출(없으면 ```html 블록 → 없으면 오류 HTML) |
| 4. 이미지 치환 | (자동) | 제공자가 LoremFlickr면 그대로, 아니면 HTML 안 URL의 키워드를 모아 제공자 API로 병렬 조회(랜덤 페이지 1~10, 가로형) → URL 교체, 실패 키워드는 LoremFlickr 유지 |
| 5. 결과 | 미리보기·복사·다운로드, 변환 프롬프트 복사 | `sandbox="allow-scripts allow-forms allow-popups allow-modals"` iframe, `landing-page.html` 다운로드, 고정 프롬프트(“Vite+React+TS 구조로 변환…”) |

### 1-4. 옵션·고정 값
- **주제 프리셋 20종**(개인 홈피, 링크 인 바이오, 온라인 CV, 포트폴리오, 기업/가게 홍보, 뉴스레터, 콘텐츠 허브, 디지털 굿즈, 컨설팅 예약, 프리랜서, 클래스 접수, 지역 소규모 서비스, 후원/기부, 웹도구 모음, 바로가기 허브, 미니 웹앱, 오픈소스 랜딩, 대기자 명단, 설문/피드백, 기타).
- **레이아웃 유형 5종**: Card(모바일 프로필 카드) · Document(A4 문서) · Hero(풀스크린 입력폼) · Gallery(그리드) · Landing(섹션 스크롤). 프리셋마다 유형 1개 + 서브 4페이지 구조가 **고정 문자열**로 정해져 있고 "임의 변경 금지"가 프롬프트에 명시됨.
- **기획안 JSON 스키마**: `projectInfo`(주제·타겟·목표·언어·선택 스타일·구조 전략·디자인 의도) / `structure`(메인 섹션 목록·서브 페이지 id·title·path·purpose·contentSpecs) / `contentStrategy`(헤드라인·CTA·핵심 메시지) / `designSystem`(주/보조/배경색·타이포·무드보드) / `developmentGuide`(스택 Vite+React+TS, 폴더 구조, Vercel 배포 설정 문구, 이미지 경로·manifest) / `imageAssets`(이름·URL·설명·프롬프트).
- **모델**: 전부 `gemini-3.1-pro-preview`, 이미지 생성 없음(키워드 기반 스톡 사진만).
- **Vercel 트러블슈팅 가이드**(`VERCEL_TROUBLESHOOTING_GUIDE`): 정의만 있고 화면에 쓰이지 않음.

### 1-5. 결과물
(1) 기획안 JSON 텍스트, (2) 단일 HTML 파일(프로토타입), (3) 다음 단계용 변환 프롬프트 문구. 저장·히스토리 없음(새로고침하면 소실, 채팅 세션은 모듈 전역 변수).

### 1-6. 결함·한계 (우리 버전에서 해결)
1. **키 처리**: Gemini 키를 빌드 환경변수로 번들에 주입(배포하면 공개) + 이미지 제공자 키를 XOR 난독화로 localStorage에 저장하고 키를 URL 쿼리로 브라우저에서 직접 호출 → AIMaster 최상위 규칙(회원 본인 키·서버 경유) 위반 구조.
2. **세션이 전역 변수**: 새로고침·탭 이동 시 Phase 2 불가("세션이 만료되었습니다"), 사용자 간 격리 개념 없음.
3. **JSON 검증 없음**: 기획안이 JSON이 아니어도 원문을 그대로 통과, 스키마·구조(서브 4개)·한국어 여부를 확인하지 않아 Phase 2가 어긋날 수 있음.
4. **오류 은폐**: 자동 완성 실패 시 빈 값, 이미지 치환 실패 무음, `alert()` 사용.
5. **기획안을 편집할 수 없음**: 생성된 JSON을 고치거나 섹션별로 다시 만들 방법이 없고, 결과를 바꾸려면 처음부터 다시.
6. **이미지 품질**: LoremFlickr는 무작위 사진이라 주제와 어긋나기 쉽고, 키워드 정규식은 `loremflickr.com/1600/900/…` 형식만 인식.
7. **보안**: 생성 HTML을 `allow-scripts` iframe에 그대로 렌더(샌드박스는 있으나 `allow-popups/modals` 허용), 다운로드 파일에 외부 CDN 의존.
8. 기획안 `developmentGuide`에 Vercel 배포 안내가 하드코딩되어 있어 모델이 매번 동일 문구를 반복, 템플릿 20개는 코드에 박혀 있어 확장·수정 불가, 개발자 크레딧·유튜브 링크 하드코딩, 다크 테마 고정.

### 1-7. 실행 결과 확인 상태
운영 미리보기에서 **초기 화면·입력 필드·프리셋 UI**를 확인했다. 실제 생성 결과는 Gemini 키(과금)가 필요해 원본으로 호출하지 않았고, **프롬프트·스키마·상태 전이·템플릿 20개는 소스로 확정**했다. 구현 후 주인님 본인 키로 1~2회 실제 호출해 결과를 대조한다(텍스트 호출 2회, 소액).

## 2. 제품 정의 (결정 사항 — 되묻지 않고 확정)

| 항목 | 결정 | 이유 |
|---|---|---|
| 이름 / slug | **AI 랜딩페이지 기획 자동화** / `landing-architect` | 플랫폼 명명 관례. **이름·폴더·slug·Vercel 프로젝트·도메인을 처음부터 `landing-architect`로 통일**(구현 때 `landing-architect.vercel.app` 가용성을 먼저 확인, 선점이면 `…buylife.xyz`만 공식 주소로 사용) |
| AI 호출 | 서버 API 경유 + **회원 본인 Gemini 키**(`user_api_keys`), 키 없으면 `needKey` 안내, 폴백 금지 | 최상위 규칙 |
| 이미지 제공자 키 | Unsplash/Pexels/Pixabay도 **회원 본인 키**를 `user_api_keys`에 저장해 **서버가 대신 호출**(브라우저에 키·URL 쿼리 노출 제거). 기본값 LoremFlickr(무키). 구현 시 DB `user_api_keys_provider_check` 제약에 `unsplash`·`pexels`·`pixabay` 추가(ERROR_LESSONS §14) | 규칙 3·4, 무료 키지만 계정당 한도가 있어 공용 키 예외 아님 |
| 저장 | **기획안·프로토타입은 서버 DB에 회원별 저장**(텍스트 수십 KB, RLS owner-only, 회원당 50개 상한) | 이미지 앱과 달리 용량이 작고 기기 간 이어쓰기 가치가 큼 |
| 접근 | FREE 아님(일반 이상 + 관리자 부여 사용기간), 기본 3요금제 | AI 기능 프로그램의 기본 정책 |
| 모델 | 기본 `gemini-3.1-pro-preview`, 사용 불가 시 `gemini-2.5-pro` → `gemini-2.5-flash` 순 폴백, 상수화 | 모델명 변동 대응 |
| 프롬프트 규칙 | 당해 연도 주입(규칙 8), 한국어 출력 고정, 인물 묘사는 한국인 기본(규칙 3) | 불변 원칙 |

## 3. 범위

### v1.01 (원본 동등 + 결함 해결)
1. 입력: 주제(프리셋 20 + 직접 입력), 타겟, 목표, **[타겟/목표 자동 완성]**(오류를 숨기지 않고 안내).
2. 기획안 생성(Phase 1): 서버 1회 호출(시스템 지침 + 템플릿 매핑) → **JSON 스키마 검증·정규화**(서브 페이지 4개·한국어·필수 키), 실패 시 1회 자동 재시도 후 구체적 오류 안내.
3. **기획안 편집**: 섹션별(프로젝트 정보·구조·콘텐츠 전략·디자인 시스템·이미지 에셋)로 보기, 텍스트 직접 수정, **섹션 다시 만들기**, JSON/Markdown 내보내기.
4. 프로토타입 생성(Phase 2): **세션 대신 "기획안 + 지시문"을 요청에 모두 담는 무상태 호출**(새로고침해도 이어서 가능), 스타일별 레이아웃 가이드, HTML 추출·검증(`<!DOCTYPE>`/`</html>`, 금지 태그 importmap 검사, 길이), 미리보기(모바일/태블릿/데스크톱 폭 전환).
5. 이미지 치환: LoremFlickr 기본, Unsplash/Pexels/Pixabay 선택 시 서버 병렬 조회(제한·타임아웃·실패 항목 표시).
6. 결과: HTML 복사·다운로드, **AI Studio Build/Vercel 변환 프롬프트**(원본 문구 + 기획안 JSON 첨부 옵션), 프로젝트 저장·목록·불러오기·삭제.
7. 설정: AI 모델, 이미지 소스, 이미지 제공자 키 등록(표준 `API키등록·플랫폼연동` 화면), 흰색 UI, 표준 사이드바, KO 중심(필요 시 EN 후속), 상세 사용 매뉴얼.
8. 안전: 생성 HTML 미리보기는 `allow-scripts`만 허용(팝업·모달 제외) + 다운로드 시 안내 문구, 외부 이미지 URL 검증.

### 후속
템플릿 편집(회원 사용자 정의 주제 템플릿), AI 이미지 생성 옵션(본인 키), 다중 페이지 ZIP(Vite 프로젝트) 내보내기, 공개 링크 공유, 영어 UI.

## 4. 아키텍처
- Next.js 16 App Router + TS, 순수 CSS, `ui-canvas`/`music-player`/`fashion-style` 패턴 재사용(접근 게이트·사이드바·키 관리·`/open` 진입·보이는 Chrome 하네스).
- 서버 API(전부 `checkProgramAccessApi` + `force-dynamic`, `maxDuration` 120): `POST /api/ai/suggest`, `/api/ai/plan`, `/api/ai/plan-section`, `/api/ai/code`, `/api/images/resolve`, `GET/POST/PUT/DELETE /api/projects`, `/api/keys`.
- `src/lib/templates.ts`: 20개 주제 템플릿(타입·설명·구조)을 데이터로 분리, `src/lib/prompts.ts`: 시스템 지침·Phase 1/2 프롬프트(연도·한국어·구조 고정), `src/lib/plan.ts`: 스키마 검증·정규화·Markdown 변환(순수, 단위 테스트), `src/lib/html.ts`: HTML 추출·검증·이미지 키워드 추출, `src/lib/gemini.ts`(서버: 모델 폴백·오류 분류).
- DB: `landing_architect_projects(id, user_id, title, inputs jsonb, plan jsonb, html text, created_at, updated_at)` + RLS owner-only(서버는 service role + `user_id` 필터), 기획안·HTML 크기 상한(예: 600KB).
- 응답이 모두 텍스트라 Vercel 4.5MB 한도 문제 없음. 모의 응답 + 보이는 Chrome 하네스로 UI 검수, 실제 호출은 본인 키로 소액 확인.

## 5. DB·등록
- 신규 테이블 1개 + `user_api_keys` provider 제약 확장(승인된 범위의 스키마 변경).
- `programs` 등록: slug `landing-architect`, 카테고리 Tools, 최소 등급 일반, 배지 new, 기본 3요금제, `app_url=https://landing-architect.buylife.xyz`, v1.01.
- 썸네일: **`PLATFORM_PATTERNS.md §13` 템플릿 + `scripts/generate-program-thumbnail.mjs`**(한국인 실사 16:9, 기획안·와이어프레임·노트북 화면 암시).

## 6. 단계
| 단계 | 내용 | 검증 |
|---|---|---|
| 0 | 폴더·인증·접근·사이드바·키 관리·DB 테이블·provider 제약 확장 | 로그인→권한→키 등록 |
| 1 | 템플릿 데이터·프롬프트·스키마 검증·HTML 추출(순수 로직) | 단위 테스트 |
| 2 | 서버 AI 라우트(suggest/plan/plan-section/code) + 오류 분류·폴백 | 모의 응답 테스트 |
| 3 | 입력·기획안 뷰/편집·프로토타입 미리보기·이미지 치환 | 보이는 Chrome 하네스 |
| 4 | 프로젝트 저장·목록, 내보내기·변환 프롬프트, 매뉴얼 | 화면 검수 + 실제 호출 1~2회 |
| 5 | 등록·도메인·썸네일(§13)·배포 | 라이브 점검·커밋·푸시 |

## 7. 리스크
1. **모델 가용성**(`gemini-3.1-pro-preview`): 폴백 체인과 안내, 호출 전 모델 목록 확인.
2. **응답 형식 불안정**(JSON·HTML): 스키마 검증 + 재시도 + 수정 가능한 UI, 실패 사유 표시.
3. **생성 HTML의 안전**: 샌드박스 iframe, 외부 스크립트는 CDN(Tailwind·FontAwesome)만 허용 안내, 저장 시 크기 제한.
4. **이미지 제공자 한도**: 서버 병렬 수 제한·실패 시 LoremFlickr 폴백 표시.
5. **응답 지연**: pro 모델 30~90초 → 진행 표시·취소, 서버 `maxDuration`과 클라이언트 타임아웃 정렬.
