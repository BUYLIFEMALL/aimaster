# AI 타로 (tarot)

AIMaster 계정으로 로그인해야 이용할 수 있는 **AI 타로 리딩 웹앱**. 질문을 입력하고 5종
스프레드(원카드/3카드 과거현재미래/3카드 궁합/5카드 심층분석/켈틱크로스 10카드) 중 하나를
골라 카드를 뽑으면,
AI가 그린 카드 일러스트(Gemini, 6종 화풍 선택 가능)와 AI가 풀어주는 종합 해석(OpenAI, 모델
선택 가능)을 결과 화면에서 바로 볼 수 있고, 리딩 결과는 `/history`(내 타로 보관함)에 자동
저장된다. `mbti-character`를 스캐폴드 템플릿으로 삼아 만들었으며, 로그인 필수 구조·API 키
표준 패턴·카카오 공유 컴포넌트를 그대로 가져와 타로 도메인에 맞게 확장했다.

## 기획 배경

### 왜 실제 타로 덱 원화를 쓰지 않고 AI로 매번 새로 그리는가
가장 널리 알려진 타로 덱은 1909년 출판된 Rider-Waite-Smith(RWS) 덱이다. 이 덱의 원본
흑백 삽화 자체는 미국에서 퍼블릭 도메인이지만, 실제로 시중에 유통되는 컬러 카드는
1971년부터 U.S. Games Systems, Inc.가 재출판하면서 자체적으로 채색·리터칭한 버전이고,
이 회사는 그 특정 채색본에 대해 별도 저작권을 주장해왔다. AIMaster는 구독 결제가 있는
상업 플랫폼이므로, mbti-character가 실존 애니메이션/게임 캐릭터 대신 오리지널 캐릭터를
만들기로 결정했던 것과 같은 이유로(README "기획 배경" 참고), 이 프로젝트도 특정 상업
타로 덱의 스캔본을 쓰지 않기로 했다. 대신 카드 이름·수트·아르카나 종류·정/역방향 같은
고정 메타데이터만으로 Gemini("나노바나나")가 매 리딩마다 새 일러스트를 생성한다
(`app/api/generate-card-image/route.ts`). 전통 타로 상징 자체(예: "죽음 카드 = 끝과 새로운
시작")는 수백 년간 쌓인 공유 민속 지식이라 저작권 대상이 아니므로, `lib/cards.ts`의 78장
카드 설명 문구는 이 지식을 참고하되 문장은 전부 새로 썼다.

### 왜 mbti-character를 스캐폴드로 골랐는가
이 저장소에서 "로그인 필수 + 콘텐츠 생성형 퀴즈/리딩 + AI 이미지 생성(BYOK) + 카카오 공유"
조합을 이미 실전 검증한 서브프로젝트가 mbti-character였다. 인증(`lib/auth.ts`,
`lib/access.ts`), API 키 등록(`lib/apiKeys.ts`, `components/settings/ApiKeyRow.tsx` —
수정(초록)/삭제(빨강) 버튼까지 이미 구현돼 있었다), 카카오 공유(`components/
ShareButtons.tsx`, `components/KakaoScript.tsx`), OG 이미지 생성(Windows 로컬 폰트 경로
우회 포함)까지 거의 그대로 재사용할 수 있어 새로 설계하는 대신 복제 후 도메인만 바꿨다.
Next.js 14 + React 18 조합도 mbti-character와 동일하게 유지했다(이미 이 조합으로 빌드가
검증되어 있고, 이 프로젝트는 React 19 전용 기능이 필요 없기 때문).

## 설계 배경

### 왜 로그인이 필요한가
mbti-character와 동일한 이유다 — 랜딩 페이지(`/`)는 비로그인 방문자도 볼 수 있는 마케팅
화면으로 남기고, 실제 카드 뽑기(`/draw`)와 결과(`/result`)는 로그인해야 쓸 수 있게 했다.
AIMaster는 하나의 계정으로 모든 서브프로그램을 쓸 수 있으므로, 진입장벽이 낮고 바이럴이
잘 되는 콘텐츠(타로 리딩)일수록 신규 가입을 만들어내는 통로로 쓸 수 있다는 전략이다.
`lib/access.ts`의 `requireProgramAccess()`/`checkProgramAccessApi()`(`THIS_PROGRAM_SLUG =
"tarot-reading"`)가 로그인 + 프로그램 이용 권한을 함께 확인하며, `required_grade_id`는
카탈로그의 "일반"(가장 낮은 기본 등급)이라 로그인만 하면 별도 구독 없이 무료로 이용할
수 있다.

### 카드 스프레드는 왜 5종류인가
초기 버전은 실제 타로 앱들이 가장 널리 쓰는 입문용 스프레드인 과거-현재-미래 3카드
스프레드 하나만 지원했다. 이후 사용성을 넓히기 위해 `lib/deck.ts`의 `SPREAD_CONFIGS`에
부담 없는 원카드(오늘의 운세), 관계를 보는 3카드 궁합, 좀 더 깊은 고민을 위한 5카드
심층분석, 그리고 가장 정통적인 10카드 켈틱 크로스까지 총 5종 스프레드를 추가했다. 각
스프레드는 `positions`(자리 순서)·`positionLabels`(자리별 한글 라벨)·
`positionDescriptions`(자리별 설명)를 자체적으로 갖고 있어, 카드 뽑기(`drawCards()`)와
결과 화면(`ResultInteractive`)이 스프레드 종류에 관계없이 이 설정 하나로 동작한다. 켈틱
크로스는 카드 10장을 한 번에 해석해야 해서 `/api/generate-reading`의 시스템 프롬프트를
따로 두고, OpenAI 응답 토큰 한도(`max_completion_tokens`)도 카드 수가 10장 이상이면 2000
→ 3500으로 늘려 흐름이 끊기지 않게 했다.

### 카드 뽑기 방식
`lib/deck.ts`의 `drawCards(spreadType)`이 선택된 스프레드의 `cardCount`만큼 78장
(`lib/cards.ts`의 `TAROT_DECK`) 중 서로 다른 카드를 뽑고, 각 카드는 독립적으로 50/50
확률로 정방향/역방향이 결정된다. 결제나 사용자 데이터와 무관한 단순 연출용 랜덤이라
암호학적 난수는 쓰지 않고 브라우저에서 `Math.random` 기반으로 그대로 실행한다
(`components/DrawFlow.tsx`). 뽑은 결과는 `스프레드유형|화풍|cardId:방향:자리` 형태로
직렬화해(`serializeDraw`) `/result?cards=...&q=...` 쿼리스트링으로 결과 화면에 전달한다.
셔플/뒤집기 연출은 별도 애니메이션 라이브러리(framer-motion 등) 없이 `app/globals.css`의
순수 CSS 트랜지션(`card-shuffle-anim`, `card-flip-*`)만으로 구현했다 — MVP 범위에서 과한
투자를 피하기 위한 의도적 선택이다.

### 리딩 이력 저장(`/history`)
결과 화면(`ResultInteractive`)은 카드 이미지나 AI 해석이 하나라도 생기는 순간부터
브라우저 Supabase 클라이언트로 `tarot_readings` 테이블에 자동으로 insert/update한다
(`user_id` + RLS owner-only, `supabase/migrations/0004_create_tarot_readings.sql`). 질문·
뽑힌 카드 구성·카드별 이미지 URL·AI 종합 해석이 한 행에 함께 저장되며, `/history`
페이지(`app/history/page.tsx` + `components/HistoryList.tsx`)에서 본인이 뽑았던 리딩을
날짜순으로 펼쳐보고(페이지네이션 10건씩), 개별 삭제도 할 수 있다(`lib/actions/history.ts`
서버 액션). 상단에는 **스프레드 종류별 카테고리 필터**(전체/원카드/3카드/궁합/5카드/켈틱
크로스, 건수가 0인 종류는 숨김)가 있어 `?spread=<type>&page=1`로 특정 종류만 걸러볼 수
있다(2026-09-19 추가, 사용자 요청). 목록은 항상 그 필터/페이지 안에서 **가장 최근 리딩이
자동으로 펼쳐진 채**로 보이고 나머지는 접혀 있다 — `HistoryList`의 펼침 상태(`expandedId`)
초기값이 `readings[0]`(최신순 정렬의 첫 항목)이기 때문인데, 카테고리를 바꿔도 이 상태가
안 바뀌는 리액트 버그가 있어서 `app/history/page.tsx`가 `<HistoryList key={`${spread}-
${page}`}>`로 카테고리/페이지가 바뀔 때마다 컴포넌트를 통째로 새로 마운트시키도록 고쳤다.
카드 이미지/글자 크기도 `/result`(최초 생성 화면)와 동일한 그리드 로직(카드 1~3장은 더
크게, 5장 이상만 5열)과 폰트 크기로 맞췄다(2026-09-19, 사용자 지적: "보관함 이미지/글자가
너무 작다").

**🐛 [심각, 발견 및 수정] `tarot_readings` 테이블이 실제 운영 DB에 한 번도 적용된 적이
없었다(2026-09-19)**: 마이그레이션 파일(`0004_create_tarot_readings.sql`)은 저장소에 있고
이 코드도, README/AGENTS.md의 Phase 표도 전부 "완료"라고 기록돼 있었지만, 실제
Supabase(`esgxyikcnnvmlhygjkth`) 운영 DB에는 이 테이블 자체가 생성된 적이 없었다(`select
table_name from information_schema.tables where table_name ilike '%tarot%'`가 빈 결과를
반환 — `tarot_register_program`/`tarot_pricing_plans`/`tarot_card_images_storage` 마이그레이션은
2026-09-16에 정상 적용됐지만 `tarot_readings` 생성 마이그레이션만 빠져 있었다). 그 결과:
- 카드 이미지/AI 해석 저장(`.insert()`)이 **매번 조용히 실패**하고 있었다(호출부가
  `catch (err) { console.error(...) }`로만 처리해 사용자에게는 아무 에러도 보이지 않았다).
- `/history`(내 타로 보관함)는 항상 빈 상태였을 것이다.
- "이 타로 리딩은 회원님의 개인 보관함에 자동 저장되었습니다" 배지도 실제로는 뜬 적이 없다.
- 2026-09-19에 도입한 "완성된 리딩을 id로 공유"(`/result?rid=...`) 기능도 저장이 항상
  실패하니 `readingId`가 절대 채워지지 않아 매번 예전 방식(카드 구성만 담긴 짧은 링크)으로
  폴백했다 — 사용자가 "카카오톡 공유 후 카드 만들기 전 페이지로 넘어간다"고 재현한 증상의
  진짜 원인이 바로 이것이었다.

Supabase MCP로 `apply_migration`을 실행해 테이블을 실제로 생성했다. 이 과정에서 원본
0004 파일에 **UPDATE RLS 정책이 아예 빠져 있던 것**도 함께 발견했다(이미 저장된 리딩에
`.update()`로 이미지/해석을 추가할 때도 이 정책이 없으면 실패한다) —
`0005_add_readings_update_policy.sql`로 추가했다. **교훈**: 마이그레이션 SQL 파일을
저장소에 커밋해두는 것과 그것을 실제 운영 DB에 적용하는 것은 별개다. 이 프로젝트처럼
"코드는 있는데 실제로 동작 안 하는" 상태가 오래 방치될 수 있으니, 새 테이블에 의존하는
기능을 완료 처리하기 전에 `list_migrations`/`information_schema.tables`로 실제 적용
여부를 반드시 확인할 것.

**🐛 [연쇄 원인, 발견 및 수정] `SUPABASE_SERVICE_ROLE_KEY` 환경변수 자체가 아예 등록되어
있지 않았다(2026-09-19)**: 테이블을 생성한 뒤에도 `/result?rid=<실제로 존재하는 id>`가
여전히 `/draw`로 튕겨나가는 문제가 남아있었다. `lib/supabase/server.ts`의
`createAdminClient()`를 보면:
```ts
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```
`SUPABASE_SERVICE_ROLE_KEY`가 Vercel 프로덕션 환경변수에 **아예 등록돼 있지 않아서**(직접
`vercel env ls production`으로 확인), 이 "RLS를 우회해야 할 관리자 클라이언트"가 조용히
익명 공개키(anon key)로 대체되고 있었다. `/result?rid=...` 접근은 로그인 세션이 없는
방식이라 `auth.uid()`가 항상 비어있고, `tarot_readings`의 SELECT RLS 정책
(`auth.uid() = user_id`)이 항상 막아서 **실제로 존재하는 리딩도 항상 "없음"으로 조회**되고
있었다 — `rid` 기반 공유뿐 아니라 위 "레거시 공유 링크 복원" 로직도 처음부터 이 문제를
안고 있었을 가능성이 높다(둘 다 같은 `createAdminClient()`를 쓴다). AIMaster 전체가
공유하는 Supabase 프로젝트(`esgxyikcnnvmlhygjkth`)의 관리자 키라 새로 발급받지 않고
다른 서브프로젝트(threads 등)에 이미 등록된 값을 그대로 Vercel에 추가하고(`vercel env add
SUPABASE_SERVICE_ROLE_KEY production`) 재배포해서 해결했다. **교훈**: `createAdminClient()`
류의 "관리자 클라이언트"를 쓰는 기능은, env var가 없을 때 다른 키로 조용히 대체(fallback)
하는 코드가 있으면 에러 없이 실패하니 배포 시 실제 env var 등록 여부까지 확인할 것.

### AI 카드 일러스트 생성 — 본인 Gemini 키만 사용
초기 버전은 결과 화면 진입 시 자동으로 카드 이미지를 생성했으나, 현재는
`components/ResultInteractive.tsx`에서 **카드를 하나씩 직접 클릭해야** 그 카드의 일러스트
생성이 시작되는 방식으로 바뀌었다(카드를 한 장씩 궁금해하며 클릭하는 게임적 재미 요소 +
불필요한 API 호출 절감). `app/api/generate-card-image/route.ts`는
`checkProgramAccessApi()`로 로그인을 확인한 뒤 `resolveApiKey(userId, "gemini")`로 회원
본인 키만 조회해서 쓴다(앱 공용 키 폴백 없음). 클라이언트는 자유 텍스트 프롬프트를 보낼 수
없고 `cardId`(78장 중 하나)·`orientation`·`style`(6종 화풍 중 하나)·`model`(나노바나나
Standard/2-2K/2-4K/Pro 중 하나, `lib/deck.ts`의 `GEMINI_MODEL_OPTIONS`)만 보내며, 실제
프롬프트는 서버가 `lib/cards.ts`의 고정 데이터 + 선택된 화풍의 `promptModifier`로만
조립한다. 6종 화풍(`CARD_STYLES`: 몽환 수채화·귀여운 캐릭터·한국 전통 동양화·네온
스테인드글라스·다크 아르누보 골드·사이버펑크 네온)은 `/draw`에서 미리 고른다.

**루트 CLAUDE.md 플랫폼 공통 원칙 3번(인물 묘사는 기본적으로 한국인)을 어떻게 반영했는가**:
타로 카드는 메이저 아르카나 대부분(바보·마법사·여사제·여황제·황제·교황·연인·은둔자·정의·
매달린 사람·죽음·절제·악마·별·달·태양·심판 등)과 마이너 아르카나의 코트 카드(페이지/기사/
여왕/킹)가 전통적으로 사람을 그린다. 카드마다 "사람이 등장하는지" 여부를 개별 플래그로
관리하는 대신, `buildPrompt()`가 **모든 카드 프롬프트에 예외 없이** "사람이 등장하면
특별한 맥락이 없는 한 한국인(동아시아인) 외모로 그린다"는 문장(`KOREAN_PERSON_RULE`)을
포함시키도록 했다 — 사람이 없는 카드(예: 소드 3, 펜타클 4의 일부 구성)에서는 이 문장이
그냥 무해하게 무시되므로, 정확한 인물 유무 메타데이터를 78장 전부에 대해 관리하는 복잡도
없이도 원칙을 빠짐없이 지킬 수 있다.

생성된 이미지는 base64로만 돌려주지 않고 Supabase Storage 공개 버킷 `tarot-card-images`에
회원 본인 폴더(`${user.id}/...`)로 업로드해 공개 URL을 반환한다(RLS는
`mbti-character-images` 버킷과 동일하게 본인 폴더만 쓰기 가능·조회는 공개,
`supabase/migrations/0003_card_images_storage.sql`) — 카카오톡 공유(`imageUrl`)와 공유
링크의 `og:image` 둘 다 실제 HTTP(S) URL이 있어야 미리보기가 뜨기 때문이다.

### AI 종합 해석 생성 — 본인 OpenAI 키만 사용
`app/api/generate-reading/route.ts`는 뽑힌 카드(카드ID+위치+방향, 스프레드별 1~5장)와
사용자가 입력한 질문(최대 300자, 선택)을 받아 OpenAI를 호출해 하나로 이어지는 한국어
해석을 생성한다. 기본값은 `gpt-4o-mini`이지만, `/draw`에서 `OPENAI_MODEL_OPTIONS`
(GPT-5.6/5.5/5.4 Sol·Terra·Luna, o1, o3-mini)를 직접 골라 `model` 파라미터로 넘길 수
있다 — o1/o3 계열은 추론 모델이라 system role 대신 user role로 프롬프트를 합쳐 보낸다.
스프레드 종류(`SPREAD_CONFIGS`)에 따라 시스템 프롬프트가 달라진다 — 원카드는 "오늘의
조언" 한 장, 3카드 궁합은 "나의 마음/상대방의 마음/우리의 미래", 5카드는 "현재
상황/원인/조언/장애물/결과" 식으로 자리별 해석 가이드가 다르게 구성된다. 확정적 예언·
의학/법률/재정 조언 금지 같은 공통 가이드도 포함하며, 각 카드의 `lib/cards.ts`
정방향/역방향 문구를 근거로 함께 넘겨 모델이 카드 상징을 임의로 지어내지 않고 우리
데이터에 그라운딩해서 해석하도록 했다. 이 라우트도 `checkProgramAccessApi()` +
`resolveApiKey(userId, "openai")`로 본인 키만 쓴다.

**API 키가 없을 때도 빈 화면이 아니다**: Gemini/OpenAI 중 어느 쪽이든 키가 없으면 해당
기능만 건너뛰고, `lib/cards.ts`에 미리 써둔 카드별 정방향/역방향 짧은 설명을 항상 함께
보여준다(`ResultInteractive`의 각 카드 타일 하단). 키 등록을 유도하는 안내와
`ApiKeyRequiredModal`(어떤 provider가 필요한지 `providerLabel`로 표시하도록 mbti-character
버전에서 살짝 일반화)이 함께 뜬다.

### 카카오톡 공유
mbti-character의 `components/ShareButtons.tsx`를 그대로 재사용했다(실기기 테스트를 거쳐
"카카오 SDK 공유 버튼 + 항상 링크 복사 버튼" 조합으로 정착된 컴포넌트). 결과 화면은
스프레드 카드 수만큼(1~5장) 각각 이미지가 생길 수 있지만, 카카오 Feed 템플릿/`og:image`는
이미지 1장만 받을 수 있어 **첫 번째 자리 카드(`cards[0]` — 3카드 기준 "과거", 궁합 기준
"나의 마음", 5카드 기준 "현재 상황")의 생성 이미지를 대표 이미지로 사용**한다. 생성되면
`shareUrl = ${shareUrlBase}&img=<대표 카드 이미지 공개 URL>&imgs=<전체 카드 이미지 JSON>`
형태로 조립해 `ShareButtons`와 `generateMetadata()`(og:image) 양쪽에 넘긴다. `img`/`imgs`
파라미터는 mbti-character와 동일하게 `getTrustedImageUrl()`로 우리 Storage 버킷 URL
접두사인지 검증한 뒤에만 신뢰한다(조작된 값으로 임의 이미지를 공유 미리보기에 끼워넣는
것을 방지).

**🐛 [발견 및 수정] 카카오톡 공유 후 "결과 보러가기" 클릭 시 엉뚱한 페이지로 이동하던
버그, 두 가지 원인(2026-09-19)**:
1. **카카오 개발자 콘솔 도메인 미등록**: tarot은 mbti-character가 쓰던 카카오 앱(JS 키)을
   그대로 재사용하는데, 그 앱의 "플랫폼 키 > JavaScript SDK 도메인"과 "제품 링크 관리 >
   웹 도메인" 두 곳 모두에 `tarot-eight-jet.vercel.app`가 등록돼 있지 않았다. 같은 앱을
   쓰는 `kakao_auto_poster`만 등록이 돼 있어서, 공유 버튼을 누르면 카카오 서버가 그 앱에
   등록된 다른 서비스(`kakaoautoposter.vercel.app/dashboard`)로 대신 연결해줬다 — 사용자가
   직접 두 화면 모두에 도메인을 등록해 해결(코드 변경 아님, 외부 콘솔 설정).
2. **`encodeURI(decodeURI(targetUrl))` 이중 인코딩 버그**: 1번을 고친 뒤에도 "결과
   보러가기"가 `/draw`로 떨어지는 문제가 남아있었다. `handleKakaoShare()`가
   `window.location.href`를 그대로 쓰지 않고 `encodeURI(decodeURI(targetUrl))`로 한 번 더
   "정규화"하고 있었는데(2026-09-17 커밋 `fe66123`에서 다른 목적으로 추가됨),
   `decodeURI()`는 예약 문자(`:`, `,` 등)의 `%XX`는 그대로 남겨두고 나머지만 디코딩하기
   때문에, `cards` 파라미터의 구분자로 쓰는 `:`/`,`의 `%3A`/`%2C` 앞에 남아있는 `%` 문자까지
   `encodeURI()`가 다시 `%25`로 이중 인코딩해버렸다(`%3A` → `%253A`). 그 결과 공유 링크를
   열면 서버가 받는 `cards` 값 안에 실제 `:`/`,`가 아니라 문자 그대로의 `%3A`/`%2C`가
   남아있어 `deserializeDraw()`가 파싱에 실패해 `null`을 반환하고, `app/result/page.tsx`의
   `if (!parsed) redirect("/draw")`가 그대로 실행됐다. **고침**: 이 불필요한 재인코딩 단계를
   제거하고 브라우저가 이미 올바르게 인코딩해주는 `window.location.href`를 그대로 쓰도록
   되돌렸다 — 이 정규화를 다시 추가하지 말 것.

**완성된 리딩을 id로 직접 공유(`/result?rid=<uuid>`, 2026-09-19 도입)**: 위 두 버그를 고친
뒤에도 근본적인 설계 문제가 남아있었다 — `window.location.href`는 `/draw`에서 처음 이동해온
`cards=...` 쿼리스트링 그대로이고, 카드 이미지·AI 해석을 생성해도 브라우저 주소창은 바뀌지
않는다. 그래서 카카오톡으로 공유해도 받는 사람은 완성된 결과가 아니라 **빈 카드부터 다시
시작**해야 했다(사용자 지적, 2026-09-19: "타로카드 완성되면 이미지와 내용을 저장해두고
결과물 페이지를 가져와서 뿌려지는 형태로 해야 하지 않나"). 이미 `tarot_readings`에 카드
이미지·AI 해석이 생기는 대로 자동 저장되고 있었으므로(위 "리딩 이력 저장" 참고), 그 저장된
행의 `id`(`gen_random_uuid()`라 추측 불가능 — kakao_auto_poster의 `/share/[token]`과 동일한
설계 원리) 하나만 담은 짧은 링크를 공유하도록 바꿨다:
- `ResultInteractive`가 리딩을 처음 저장하는 순간 `readingId` state를 채우고(예전엔 `useRef`
  였는데, ref는 값이 바뀌어도 리렌더를 안 일으켜 `shareUrl`이 갱신되지 않는 문제가 있어
  `useState`로 바꿨다), `shareUrl`(카카오 공유·링크 복사가 공통으로 쓰는 값)이 이 시점부터
  `${origin}/result?rid=<id>`로 바뀐다. 저장 전(아직 이미지/해석이 하나도 없을 때)에는 기존
  `cards`/`img`/`imgs`/`rd` 쿼리스트링 방식으로 폴백한다.
- `ShareButtons.tsx`의 `handleKakaoShare()`도 더 이상 `window.location.href`를 쓰지 않고
  이 `shareUrl`(정확히는 origin이 보정된 `currentShareUrl`)을 그대로 쓴다.
- `app/result/page.tsx`가 `rid` 파라미터를 받으면 `createAdminClient()`로 그 리딩 한 건만
  정확히 조회해서(카드 구성 매칭 같은 추측이 필요 없다) 카드·이미지·AI 해석·질문을 그대로
  복원한다 — 아래 "레거시 공유 링크 복원" 로직과 달리 애초에 모호한 매칭이 없어 크로스 유저
  노출 위험 자체가 구조적으로 없다. `generateMetadata()`도 동일하게 `rid`로 조회해 카카오
  미리보기(og:image 카드 합성 포함)를 만든다.
- **기존에 이미 공유된(`cards`/`img`/`imgs`/`rd` 방식) 링크는 계속 그대로 동작한다** — 이
  경로를 없애지 않고 `rid`가 없을 때의 대체 경로로 남겨뒀다.

**레거시 공유 링크 복원(2026-09-18 크로스 유저 노출 수정 완료)**: `imgs`/`rd`가 없던 옛
형식의 공유 링크(카드+대표 이미지 1장만 있던 시절 링크)를 위해, `app/result/page.tsx`는
`createAdminClient()`(RLS 우회)로 `tarot_readings`에서 부족한 이미지/해석을 보충해준다.
과거엔 "같은 스프레드 + 같은 카드 구성"만 보고 매칭해서, 원카드 스프레드(78장×2방향=156
가지뿐)처럼 조합 가짓수가 적은 경우 **전혀 다른 사용자가 우연히 같은 카드를 뽑았을 때 그
사람의 질문·AI 해석이 잘못 복원되는 크로스 유저 노출 위험**이 있었다. 지금은 두 가지로
막는다: (1) `initialImageUrl`(URL의 `img` 파라미터, `getTrustedImageUrl()` 검증됨)이 아예
없는 경우, 즉 새로 카드를 뽑은 일반적인 경우에는 이 DB 조회 자체를 실행하지 않는다.
(2) `img`가 있는 진짜 공유 링크에서도, 카드 구성만으로 매칭하지 않고 **공유받은 그 정확한
이미지 URL을 실제로 갖고 있는 리딩**만 찾는다 — 이미지 URL 경로 자체에 원 작성자의
`user_id`와 생성 시각이 포함돼 있어(`app/api/generate-card-image/route.ts`의
`objectPath`) 사실상 유일한 식별자로 쓸 수 있다.

**`/api/og` — 카드 전체를 합성한 OG 이미지(2026-09-19 도입 → 같은 날 되돌림)**: 처음엔
카드 수 5장 이하인 스프레드에서 `generateMetadata()`가 `/api/og?spread=...&cards=...
&imgs=...` 형태로 넘겨, `/api/og`가 Satori(`next/og`의 `ImageResponse`)로 카드 이미지들을
실제로 나란히 배치한 합성 카드를 그려서 og:image로 썼다. `imgs`는 클라이언트가 조작해서
보낼 수 있는 값이라 `/api/og`가 `TRUSTED_IMAGE_PREFIX`(우리 Storage 버킷 URL)로 자체
재검증하도록 만들어(오픈 이미지 프록시/SSRF 방지) curl로는 200에 정상적인 PNG가 왔지만,
**실제 카카오톡 "링크 복사 → 채팅창에 붙여넣기" 미리보기에서는 썸네일이 계속 빈 채로
떴다.** Vercel 런타임 로그로 확인해보니 카카오 크롤러의 요청 자체는 매번 200으로 성공하고
있었는데, 응답 헤더를 비교해보니 원인이 드러났다 — `next/og`의 `ImageResponse`는
`Content-Length` 없이 `Transfer-Encoding: chunked`로만 응답하는 반면, 실제 카드 이미지
(Supabase Storage)는 `Content-Length`를 정상 제공한다. 카카오톡의 링크 미리보기 크롤러가
`Content-Length` 없는 동적 이미지 응답을 신뢰하지 못해 렌더링을 포기하는 것으로 보인다.
**그래서 카드 여러 장을 합성해서 보여주는 기능은 되돌렸고**, 대신 이미 안정적으로 동작이
검증된 방식 — **대표 카드 1장의 실제 생성 이미지(Supabase Storage) URL을 그대로 og:image로
쓰는 방식**(`app/api/generate-card-image/route.ts`가 만드는 그 이미지, `Content-Length`
정상 제공)으로 통일했다. 이미지가 하나도 없는 경우(카드를 아직 하나도 안 뽑았거나 Gemini
키가 없는 경우)에는 여전히 `/api/og`의 브랜드 카드(🔮 AI 타로 + 대표 카드 이름)로
대체한다 — 이 폴백도 같은 `Content-Length` 문제를 안고 있을 가능성이 있지만, "이미지가
아예 없을 때"의 대체 카드라 우선순위를 낮췄다. `/api/og`의 합성 렌더링 코드 자체는
삭제하지 않고 남겨뒀다(추후 이 이미지를 요청 시점에 스트리밍하는 대신 Supabase
Storage에 미리 렌더링해서 올려두는 방식으로 바꾸면 `Content-Length` 문제 없이 다시 쓸 수
있다). mbti-character와 동일하게 `middleware.ts`의 matcher에서 `api/og` 경로를 로그인
체크 대상에서 제외했다(카카오톡/페이스북 크롤러가 로그인 없이 긁어가야 하므로).

**🐛 [발견 및 수정] `present` 파라미터가 있을 때 브랜드 카드가 500 에러를 내던 잠재
버그(2026-09-19)**: 합성 이미지 기능을 배포 후 직접 검증하다가, `/api/og?present=<cardId>`
(카드 이미지가 하나도 없을 때 모든 `/result` 페이지의 기본 og:image가 실제로 쓰는 경로)가
production에서 500을 내는 것을 발견했다. 원인은 Satori(`next/og`)의 요구사항 — **자식
노드가 2개 이상인 요소는 `display: "flex"`를 명시해야 한다** — 를 "오늘의 현재 카드:
{card.nameKo}" 줄(정적 텍스트+변수, 자식 노드 2개)이 지키지 않고 있었던 것. 이 코드는 이번
세션 이전부터 있던 코드라, 카드 이미지를 아직 하나도 생성하지 않은 채 공유된 링크의 카카오
미리보기가 그동안 계속 깨져 있었을 가능성이 높다. `display: "flex"`를 추가해 수정했다.

## 남은 작업

- (실사용자 로그인 테스트 필요) 실제 AIMaster 계정으로 `/login` → `/draw` → `/result` →
  `/history`까지 실기기/브라우저로 한 번 확인 권장. `/api/og`는 `next/og`의 기본 폰트 로딩이
  Windows 로컬 개발 환경(`next start`/`next dev`)에서 깨지는 문제(`app/api/og/route.tsx`
  코드 주석 참고, Vercel Linux 배포에서는 무관)로 로컬에서 직접 검증할 수 없으니, 실제
  카카오톡 공유 시 합성 미리보기가 의도대로 뜨는지 배포 환경에서 확인 권장.

## Phase 진행 상태

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 스캐폴딩(mbti-character 구조 복제, Next.js 14 + React 18) | ✅ |
| 2 | 78장 카드 콘텐츠 (`lib/cards.ts`) | ✅ |
| 3 | 카드 스프레드 뽑기 + 셔플/뒤집기 연출(`/draw`) | ✅ |
| 4 | 결과 화면: 카드별 AI 일러스트 클릭 생성(Gemini, BYOK, 6종 화풍) | ✅ |
| 5 | 결과 화면: AI 종합 해석 자동 생성(OpenAI, BYOK, 모델 선택) | ✅ |
| 6 | 카카오톡/링크 공유(대표 이미지 반영) + 동적 OG 카드 | ✅ |
| 7 | `programs`/`pricing_plans` 카탈로그 등록 + 카드 이미지 Storage 버킷 | ✅ |
| 8 | 로그인 필수 전환(mbti-character와 동일 패턴, 처음부터 적용) | ✅ |
| 9 | 4종 스프레드(원카드/3카드/궁합/5카드) 확장 | ✅ |
| 10 | 리딩 이력 저장(`tarot_readings`) + `/history` 보관함 페이지 | ✅ |
| 11 | 켈틱 크로스(10카드) 스프레드 추가 | ✅ |
| 12 | `/history` 삭제 UI + 페이지네이션 | ✅ |
| 13 | 레거시 공유 링크 크로스 유저 노출 버그 수정 | ✅ |
| 14 | 공유 카드(OG 이미지)에 카드 전체 합성 반영 | ↩️ 시도 후 되돌림(카카오 크롤러가 `Content-Length` 없는 동적 이미지를 렌더링 못함 — 위 "카드 전체를 합성한 OG 이미지" 참고) |
