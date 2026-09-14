# 캐릭코드(MBTI) (mbti-character)

AIMaster 계정으로 로그인해야 이용할 수 있는 **캐릭터 매칭 성격유형 테스트**. 자매 프로젝트인
`mbti`(성격코드)와 달리 유형 코드(INFP 등)만 보여주고 끝내지 않고 **자체 제작한 오리지널
캐릭터**로 결과를 매칭해 보여주는 것이 특징이며(2026-09-14 사용자 결정), 로그인 요구사항은
"AIMaster 회원가입 유도 채널" 역할까지 겸하도록 나중에 추가됐다(같은 날 사용자 결정 — 자세한
배경은 아래 "왜 로그인이 필요한가" 참고).

## 기획 배경

GitHub에서 실제 배포된 MBTI 관련 오픈소스를 조사하던 중 `tianxingleo/ACGTI`(1,071⭐, 애니
캐릭터-MBTI 매칭 퀴즈)를 발견해 구조를 분석했다. ACGTI는 실존 애니메이션/게임 캐릭터 이름을
그대로 써서 매칭하는데, 이는 비상업적 동인 문화 관례로는 용인되지만 **AIMaster처럼 구독 결제가
있는 상업 플랫폼에서 그대로 따라 하면 저작권 리스크가 크다**(2026-09-14 사용자 확인 질문에
대한 답변 → "자체 제작 캐릭터(추천)" 선택). 그래서 이 프로젝트는 세계관·이름·설정·대사를 전부
새로 창작한 16명의 오리지널 캐릭터(`lib/characters.ts`)로 매칭한다.

## 설계 배경

### 왜 로그인이 필요한가 (2026-09-14부터, `mbti`와의 가장 큰 차이점)
처음에는 `mbti`(성격코드)와 동일하게 로그인 없는 완전 공개 사이트로 만들었다. 그런데
"이 프로그램의 경우 회원가입 후 로그인 해야 사용할 수 있도록 해줘", "한번 가입하면 다른
프로그램도 쓸 수 있으니까 이 프로그램은 회원가입 유도용으로도 써도 좋을듯 해"라는 사용자
지시에 따라, 검사(`/test`)와 결과(`/result`)를 로그인해야만 쓸 수 있게 바꿨다(랜딩 페이지
`/`는 비로그인 방문자도 볼 수 있는 마케팅 화면으로 남겨둠). AIMaster는 하나의 계정으로
모든 서브프로그램을 쓸 수 있으므로, 진입장벽이 낮고 바이럴이 잘 되는 콘텐츠일수록 신규
가입을 많이 만들어낼 수 있다는 전략이다.

이제 다른 서브프로젝트(threads/blog 등)와 동일하게 플랫폼 표준 멀티테넌시 패턴을 따른다:
- `lib/access.ts`의 `requireProgramAccess()`(페이지/레이아웃, 권한 없으면 redirect)와
  `checkProgramAccessApi()`(API route, JSON 에러 응답) — threads의 `lib/access.ts`와 동일
  구조. `THIS_PROGRAM_SLUG = "mbti-character"`, `required_grade_id`는 카탈로그에 등록된
  "일반"(모든 신규 가입자가 기본으로 갖는 최하위 등급) 그대로라 **로그인만 하면 별도 구독/
  결제 없이 무료로 이용**할 수 있다 — `pricing_plans`/`grade_program_access` 행은 만들지
  않았다.
- 로그인은 `app/(auth)/login`에서 이 프로젝트 자체 폼으로 처리하고, 회원가입은 로컬에서
  받지 않고 `app/(auth)/signup`에서 AIMaster 루트(`buylife.xyz/register`)로 안내한다 —
  threads/blog와 동일한 "회원가입은 AIMaster에서만" 패턴. 로그인/랜딩 페이지 모두
  같은 Supabase 프로젝트(esgxyikcnnvmlhygjkth)의 Auth를 그대로 쓰므로, AIMaster나 다른
  서브프로그램에서 만든 계정으로 이 사이트에도 바로 로그인할 수 있다.
- `middleware.ts`가 `/test`, `/result` 접근 시 로그인 여부를 먼저 확인해 `/login?redirect=`
  로 되돌려보낸다. 로그인 상태 확인이 들어가는 페이지/레이아웃/API route는 전부
  `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`를 같이 선언했다(루트
  CLAUDE.md 멀티테넌시 원칙 1번 — 이 둘이 빠지면 Vercel이 권한 체크 결과 자체를 캐싱해
  다른 사람에게 그대로 서빙하는 사고가 난 전례가 있다).
- 결과 페이지가 이제 로그인 쿠키에 따라 접근이 달라지므로, 빌드 타임에 정적 생성할 수 없다
  — 예전에 있던 `generateStaticParams()`를 제거하고 완전히 동적 렌더링으로 바꿨다.
- `/api/og`(공유 카드 이미지)는 카카오톡/페이스북 같은 크롤러가 로그인 없이 긁어가야 하므로
  예외적으로 로그인 체크에서 제외했다(`middleware.ts`의 matcher에서 `api/og` 경로 자체를
  뺐다) — 그렇지 않으면 공유 링크의 미리보기 카드가 깨진다.
- AI 캐릭터 이미지 생성(`/api/generate-character-image`)도 다른 서브프로젝트와 동일하게
  `/settings`에서 등록한 회원별 `user_api_keys`(provider="gemini")를 `resolveApiKey()`로
  꺼내 쓰는 표준 패턴으로 되어 있다 — 자세한 내용과 변경 히스토리는 아래 "AI 캐릭터
  이미지 생성" 참고.
- AIMaster 플랫폼과는 계속 가볍게 연동한다: 헤더의 "다른 프로그램 보기" 링크(`buylife.xyz/
  programs`), `programs` 테이블 카탈로그 등록(slug: `mbti-character`, category: 기타,
  `supabase/migrations/0001_register_program.sql`).

### 폴더명·패키지명과 브랜드명이 다른 이유
`mbti` 프로젝트가 폴더/패키지명은 "mbti", 카탈로그 표시명은 "성격코드(MBTI) 측정기"였던
것과 동일한 패턴이다. 이 프로젝트도 폴더/패키지명(`package.json`의 `name`)은 내부 식별용
"mbti-character"로, 실제 서비스 노출명(사이트 타이틀, 카탈로그 등록명)은 "캐릭코드(MBTI)
측정기"로 통일한다(2026-09-14 사용자 지시: "정정 폴더명은 mbti-character, 프로젝트명도
통일").

### 왜 자체 제작 캐릭터인가
`lib/characters.ts`의 16명은 이름·직업·세계관·대사·설명을 전부 이 프로젝트를 위해 새로
창작했다. 하나의 학교/게임 세계관으로 묶는 대신, 각 캐릭터를 서로 다른 배경(항해사, 발명가,
상단주, 사서, 여행 작가, 정비사 등)에 독립적으로 배치해서 특정 실존 작품의 설정을 연상시키지
않도록 했다. 실존 애니메이션/게임/영화 캐릭터의 이름이나 설정을 절대 가져다 쓰지 않는다 —
새로운 캐릭터를 추가하거나 기존 캐릭터를 수정할 때도 이 원칙을 지킬 것.

### 채점 방식
`mbti`와 동일한 방식(문항마다 5점 리커트 척도 → 지표별 합산 → 중간값 기준 좌/우 극 결정 →
0~100% 강도 정규화, `lib/scoring.ts`)을 쓰지만, 코드를 import해서 공유하지 않고 이 폴더
안에 독립적으로 복제해 두었다 — 서브프로젝트는 서로 자기완결적이어야 한다는 루트
CLAUDE.md 원칙 때문이다. 문항 문구(`lib/questions.ts`)도 캐릭코드 콘셉트에 맞춰 새로 썼다.
현재는 20문항 축약판(`/test`)만 제공하고, `mbti`처럼 60문항 정식판은 아직 만들지 않았다
(남은 작업 참고).

### 공유 카드(OG 이미지)
`/api/og?type=INFP` 형태로 캐릭터 이름·직업·유형 코드가 들어간 카드 이미지를 동적으로
생성한다(`app/api/og/route.tsx`, `next/og` 기반). `mbti`에서 이미 확인된 Windows 로컬
개발 환경의 `@vercel/og` 폰트 경로 버그(`join(import.meta.url, ...)`가 Windows에서
깨지는 문제)가 여기도 동일하게 적용되므로, Noto Sans KR 폰트 파일을 직접 읽어서 넘기는
방식으로 우회했다. Vercel 프로덕션(Linux)에서는 영향이 없다.

### 카카오톡 공유
`mbti`에서 실기기 테스트 3라운드 끝에 도달한 최종 형태(`components/ShareButtons.tsx`)를
그대로 재사용했다 — `navigator.share()`와 User-Agent 감지는 카카오톡 인앱 브라우저에서
반복적으로 실패했고, "카카오 SDK 공유 버튼 + 항상 링크 복사 버튼(클립보드 API 800ms
타임아웃 후 `execCommand('copy')` 폴백)" 조합만이 모든 환경에서 안정적으로 동작했다.

### AI 캐릭터 이미지 생성 — 본인 키만 사용, `/settings`에서 등록(표준 패턴)
결과 페이지에서 스타일(귀여운/실사/애니메이션풍/수채화, `lib/imageStyles.ts`)을 고르면
Gemini 이미지 생성 모델("나노바나나", `gemini-2.5-flash-image`)로 그 캐릭터의 일러스트를
즉석에서 만들어 보여준다(`components/CharacterImageGenerator.tsx`).

**히스토리(왜 두 번 바뀌었는지 기록해둔다):** 원래 이 사이트는 로그인이 없었기 때문에, 방문자가
결과 화면에서 그때그때 본인 Gemini API 키를 직접 입력하고 브라우저 `localStorage`에만
남기는 BYOK 방식으로 처음 만들었다 — 로그인한 회원을 전제로 하는 루트 CLAUDE.md
멀티테넌시 원칙 3번("본인 키만 사용")을 적용할 "회원" 자체가 없었기 때문이다. 이후
로그인이 필수로 바뀌면서(위 "왜 로그인이 필요한가" 참고) 이 BYOK 방식을 표준 패턴으로
전환했어야 했는데 그대로 방치돼 있었고, 사용자가 "이미지 생성과 콘텐츠를 생성하려면
API 키를 등록해야 하지 않아? 프로그램 시작할 때 등록하게 하는 내용이 빠져있네"라고
지적해서 발견·수정했다(2026-09-14). 지금은 다른 서브프로젝트(naver-cafe-poster 등)와
완전히 동일한 표준 패턴이다:
- `/settings`("API키등록·플랫폼연동") 페이지에서 로그인한 회원이 본인 Gemini API 키를
  입력하면 공용 `user_api_keys` 테이블(provider="gemini")에 저장된다(`lib/apiKeys.ts`,
  `lib/actions/settings.ts`). 헤더 우측에 로그인 상태일 때만 이 링크가 보인다
  (`app/layout.tsx`).
- `app/api/generate-character-image/route.ts`는 더 이상 클라이언트로부터 API 키를 받지
  않는다 — `checkProgramAccessApi()`로 로그인을 확인한 뒤, `resolveApiKey(userId,
  "gemini")`로 그 회원이 등록해둔 키를 서버에서 직접 조회해 쓴다. 앱/운영자 공용 키로
  폴백하지 않으므로, 키가 없으면 `NO_API_KEY` 에러를 반환한다.
- 결과 페이지(`app/result/[type]/page.tsx`)는 미리 `getUserApiKey()`로 등록 여부를 확인해
  `hasApiKey` prop을 넘긴다. 키가 없는 상태에서 "생성하기"를 누르면 `ApiKeyRequiredModal`이
  뜨고 `/settings`로 안내한다(`insta_auto_poster`의 동일 컴포넌트와 같은 패턴).
- 클라이언트가 자유 텍스트 프롬프트를 직접 보내게 하면 우리 서버가 임의 프롬프트 릴레이로
  악용될 수 있으므로, 여전히 `typeCode`(16개 중 하나)와 `styleId`(4개 중 하나) 조합만
  받고 실제 프롬프트는 서버가 `lib/characters.ts`/`lib/imageStyles.ts`의 고정 데이터로만
  조립한다 — 이 부분은 BYOK 시절 설계를 그대로 유지했다.
- `user_api_keys_provider_check` 체크 제약에 `gemini`가 이미 포함돼 있어(다른
  서브프로젝트에서 이미 사용 중) DB 마이그레이션은 필요 없었다.

## Phase 진행 상태

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 스캐폴딩(Next.js 보일러플레이트, mbti 구조 복제) | ✅ |
| 2 | 자체 제작 16캐릭터 콘텐츠 (`lib/characters.ts`) | ✅ |
| 3 | 20문항 검사 → 채점 → 결과 페이지(캐릭터 매칭) | ✅ |
| 4 | 동적 OG 공유 카드(`/api/og`) | ✅ |
| 5 | 카카오톡 공유 SDK 연동 | ✅ (mbti의 검증된 컴포넌트 재사용) |
| 6 | `NEXT_PUBLIC_SITE_URL` 배포 반영 + `programs` 카탈로그 등록 | ✅ |
| 7 | AI 캐릭터 이미지 생성 (BYOK, 나노바나나) | ✅ |
| 8 | 로그인 필수 전환 + AIMaster 회원가입 유도 채널화 | ✅ |
| 9 | 60문항 정식판(`/test/full`) | ⬜ 남은 작업 |

## 남은 작업
- `mbti`처럼 60문항 정식판 추가.
- 캐릭터별 상세 페이지, 캐릭터 도감(전체 16명 갤러리) 등 파생 콘텐츠.
- (실사용자 로그인 테스트 필요) 실제 AIMaster 계정으로 `/login`에서 로그인 → `/test` →
  결과까지 실기기/브라우저로 한 번 확인 권장. 이 세션에서는 curl로 미들웨어 리다이렉트
  동작(로그인 없이 접근 시 `/login?redirect=...`로 307)까지만 검증했다.
- AI로 생성한 캐릭터 이미지를 결과 공유 카드(OG 이미지)에도 반영할지 검토 — 현재
  `/api/og`는 여전히 이모지+그라디언트 고정 카드다(생성 이미지는 방문자 브라우저에만
  표시되고 서버에 저장되지 않으므로, 공유 카드에 반영하려면 별도 저장 로직이 필요).
