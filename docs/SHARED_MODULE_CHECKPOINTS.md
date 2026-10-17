# 공용 모듈 작업 필수 점검표 (SHARED_MODULE_CHECKPOINTS.md)

> 2026-10-17 주인님 지시로 만든 인수인계 문서다. 모든 CLI(Claude Code·Codex·Antigravity)가 따른다.
> 2026-10-17 하루 동안 공용 기준 코드(YouTube 3묶음, 이미지 1~4묶음 A, 사본 30곳 이상)를 적용하면서 실제로 겪은 실수와 해결법을 **신규 프로그램 개발·기존 프로그램 유지보수 때 반드시 확인할 점검표**로 정리했다.
> 원칙과 절차는 [`SHARED_MODULES.md`](SHARED_MODULES.md)(등록 목록·고치는 절차), 기능별 위치는 [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md)(기능별 프로그램 지도)에 있다. 이 문서는 그 두 문서를 대신하지 않고 **놓치기 쉬운 점검 항목**만 모은다.

---

## 0. 한 장 요약 (작업 시작 전 30초 점검)

| # | 점검 | 어기면 생기는 일 |
|---|---|---|
| 1 | 손대려는 기능이 [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md)에 기준 코드로 있는지 **먼저** 확인 | 같은 기능을 또 새로 짜서 기준이 둘이 됨 |
| 2 | 사본 파일(`geminiImage.ts`·`nanoBananaModels.ts`·`youtubeData.ts`·`goldenEngine.ts` 등)은 **직접 고치지 않음** — 기준만 고치고 `node scripts/check-shared-modules.mjs --sync` | 다음 `--sync` 때 수정이 사라지거나 검사에서 `DIFF` |
| 3 | 기준을 고치면 **사본을 쓰는 모든 프로그램**을 테스트. 배포는 등급제 — 급한 수정(버그·이중 과금·보안)만 즉시 전체 배포·버전 +0.01, 나머지는 다음 배포 때 함께(`SHARED_MODULES.md` 「미배포 사본」, 2026-10-18 비용 절감) | 급한 수정이 배포 안 되면 옛 코드로 계속 돎 / 급하지 않은 변경까지 매번 전체 배포하면 빌드 비용 급증 |
| 4 | **이미지 프롬프트는 공용화하지 않음** — 공용은 모델·주소·호출·대기 시간·이미지 받기까지 | 프로그램마다 컨셉이 다른 결과물이 똑같아짐 |
| 5 | `timeoutMs × (retries + 1)`이 Vercel 함수 한도(300초) 안인지 계산 | 함수가 중간에 끊겨 회원에게 원인 모를 오류 |
| 6 | 한 번 호출에 돈이 드는 생성(이미지 여러 장 등)은 `retries: 0` 검토 — 기준은 2026-10-18부터 시간 초과를 재시도하지 않지만, 서버 오류 뒤 재시도도 드물게 이중 생성될 수 있다 | 재시도로 **회원 키에 이중 과금** |
| 7 | 공용 오류(`GeminiImageError` 등)를 **각 프로그램의 기존 오류 형식**으로 바꿔 던짐 | 화면의 기존 안내 문구·상태 코드가 깨짐 |
| 8 | 프로그램의 기존 테스트 실행 — 요청 본문 모양을 검사하는 테스트가 있을 수 있음 | 빌드는 되는데 테스트가 실패 |
| 9 | 크롬 확장이 있는 프로그램은 manifest·ZIP·DB `extension_version`을 같은 버전으로 | 회원이 받는 확장과 사이트 버전이 어긋남(핵심 원칙 10) |
| 10 | 버전은 `v1.99 → v2.00 → v2.01`, 세 자리 마이너 금지 | DB 제약 `^v[0-9]+\.[0-9]{2}$` 위반으로 저장 실패 |

---

## 1. 작업 전 — 찾기와 판단

1. **기준 코드 찾기**: [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md) §3에서 기능(이미지 생성, YouTube 읽기, 황금 채널 찾기 등)을 찾는다. 기준이 있으면 새 프로그램도 사본으로 가져다 쓴다. 지도에 「예정」으로 적힌 묶음은 아직 사본이 아니므로 그 프로그램의 옛 코드가 남아 있다는 뜻이다.
2. **사본인지 확인하는 법**: `scripts/check-shared-modules.mjs`의 `MODULES` 목록에 그 파일 경로가 있으면 사본이다. 파일 머리말에도 기준 위치가 적혀 있다.
3. **프로그램만 다르게 해야 할 때**: 사본을 고치지 말고 **호출하는 쪽에서 덮어쓴다.** 예: 모델 등급은 `getNanoBananaConfig()` 결과에서 이름만 가져다 쓰고 비율·온도·화질은 그 프로그램의 기존 값을 넘긴다(cardnews·music-video는 1K, shorts-onestop은 9:16).
4. **이미지 모델 레퍼런스**: 모델 교체는 `ai-image-studio`를 먼저 갱신한다(이미지 레퍼런스 규칙). 등급표(기준 `ai-image-studio/lib/providers/nanoBananaModels.ts`, 2026-10-17 기준값):

   | 등급 id | 모델 | 기본 화질 | 온도 |
   |---|---|---|---|
   | `nanobanana` | `gemini-3.1-flash-lite-image` | 1K | 0.7 |
   | `nanobanana-2-2k` (기본값) | `gemini-nano-banana-2.1` | 2K | 0.7 |
   | `nanobanana-2-4k` | `gemini-nano-banana-2.1` | 4K | 0.7 |
   | `nanobanana-pro` | `gemini-3-pro-image` | 4K | 0.4 |

   등급을 바꾸면 결과물·가격이 달라진다(예: music 앨범 커버가 Pro 등급이 되면서 1장 약 $0.113 → $0.24). 등급 변경은 완료 보고에 가격 변화와 함께 적는다.

## 2. 구현 — 연결 코드 쓸 때

1. **시간 제한과 재시도 계산(2026-10-17 교훈)**: 기준 기본값은 `timeoutMs` 120초 · `retries` 1이다. 이 값을 그대로 쓰면 최악의 경우 240초 + 대기 시간이다. 한 요청 안에서 이미지 여러 장을 만들거나 앞뒤로 다른 AI 호출이 있으면 300초를 넘는다. **연결 코드에서 `timeoutMs × (retries + 1)` + 앞뒤 작업 시간을 계산해 300초 안에 들어오게 한다.**
   - 실제 적용값: shop-detail-page 240초·재시도 0, photo-remake 180초·0, shorts-onestop 150초·0, blog-content-maker 240초·0, blog-workroom 200초·0, cardnews·style-dna·music-video 110초(재시도 기본).
2. **이중 과금 방지**: 이미지 생성은 시간 초과가 나도 구글 쪽에서는 이미 만들어져 요금이 나갔을 수 있다. "다시 시도해도 같은 결과를 받을 수 없는" 유료 생성은 `retries: 0`으로 두고, 시간 초과는 "생성됐을 수도 있으니 잠시 뒤 확인" 같은 불확실 안내로 돌려준다(blog-content-maker의 504 안내 참고). **2026-10-18부터 기준이 시간 초과는 자동 재시도하지 않는다**(서버 오류·혼잡·연결 실패만 재시도). 다른 공용 호출 모듈을 만들 때도 같은 규칙을 따른다.
3. **오류 감싸기**: 공용 오류 코드(`QUOTA_EXCEEDED`·`RATE_LIMITED`·`INVALID_KEY`·`API_NOT_ENABLED`·`PERMISSION_DENIED`·`MODEL_NOT_FOUND`·`BAD_REQUEST`·`SAFETY_BLOCKED`·`NO_IMAGE`·`TIMEOUT`·`NETWORK`·`SERVER_ERROR`·`CANCELLED`·`UNKNOWN`)를 프로그램이 원래 쓰던 오류 클래스·상태 코드·문구로 바꿔 던진다(`AiError`, `UserError`, `AppError`, `providerError()` 등). 화면이 기존 문구를 기대하는 곳이 많다.
4. **회원 본인 키**: 공용 모듈은 키를 받기만 한다. 키 읽기 SQL·`resolveApiKey()`는 각 프로그램 그대로 두고 우회하지 않는다. 운영자 키 폴백을 만들지 않는다.
5. **브라우저에서 도는 프로그램**(예: seo-thumbnail-pro): 키를 주소(`?key=`)가 아니라 머리글(`x-goog-api-key`)로 보내는 기준 동작을 그대로 쓴다.
6. **요청 취소**: 화면에서 취소할 수 있는 프로그램은 `signal`을 넘긴다(emotion-writer 참고). 취소는 `CANCELLED`(499)로 돌아온다.
7. **응답 처리**: gemini-3-pro-image는 중간 초안(`thought: true`) 이미지를 함께 보낸다. 기준의 `extractGeminiImage`가 마지막 최종 이미지를 고르므로 프로그램에서 첫 조각만 보는 코드를 새로 짜지 않는다.
8. **고아 코드 정리**: 연결을 바꾸면서 쓰이지 않게 된 import·상수·옛 모델 목록은 지운다. 원래부터 쓰이지 않던 코드는 그대로 두고 보고만 한다.
9. **시간 초과 안내 표준(2026-10-17, 10-18 정정)**: 시간 초과·응답 끊김은 「결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인」 뜻으로 안내한다(기준 문구가 이렇게 되어 있으니 `e.message`를 그대로 쓰면 된다). **「보관함·결과에서 확인」이라고 쓰지 않는다** — 우리 서버가 요청을 끊으므로 이미지는 프로그램에 저장되지 않는다(2026-10-18 정정 사례). "잠시 후 다시 시도"만 쓰면 회원이 바로 다시 눌러 이중 과금될 수 있다.
10. **SDK(`@google/genai`)를 쓰던 프로그램 전환 요령(2026-10-18, 4묶음 B)**: 이미지 호출만 공용 모듈로 바꾸고 글 생성은 SDK 그대로 둔다. 라우트 `maxDuration`이 짧은 곳(30~60초)이 많으니 시간 제한 = 한도 − 여유. 모델 폴백(없는 모델·이미지 없음일 때만)이 있는 곳은 **마감 시각을 정해 남은 시간만 다음 호출에 준다**(thumbnail-master·portrait-photo·fashion-style, 여러 장은 banana-canvas `runTask`의 `deadline`). 이 방식은 시간 검사에 `CHECK`로 나오니 문서에 직접 확인한 최대값을 적는다. `toUserError`류는 `AiError`에 메시지가 있으면 그 메시지를 보여 주게 고쳐 시간 초과 표준 안내가 나오게 한다.

## 3. 검수 — 테스트·빌드

1. **기준 테스트**: `ai-image-studio`에서 `node --test tests/geminiImage.test.mjs`(2026-10-17 기준 12개 통과). 기준을 고치면 테스트도 추가한다.
2. **사본 일치 + 시간 검사**: `node scripts/check-shared-modules.mjs` → 전부 `OK`. 2026-10-17부터 이 스크립트가 `generateGeminiImage()` 호출마다 `timeoutMs`·`retries`(숫자 또는 같은 파일 상수)를 읽어 최악 시간 = (retries+1) × timeoutMs + 재시도 대기를 계산하고, 300초를 넘으면 `OVER`(종료 코드 1), 값을 못 읽으면 `CHECK`(직접 확인)로 표시한다. **앞뒤 다른 작업 시간·한 요청 안 여러 번 호출·`maxDuration`이 300초보다 짧은 경우는 계산하지 않으므로 §2-1대로 사람이 확인한다.**
3. **프로그램 테스트가 본문 모양을 검사할 수 있다(2026-10-17 교훈)**: 기준은 `contents: [{ role: "user", parts }]` 배열로 보낸다. photo-remake 테스트는 `body.contents.parts`를 검사하다 실패해 `body.contents[0].parts`로 고쳤다. style-dna 테스트는 옛 모델 화면 이름을 기대하다 실패했다. **기존 테스트를 지우지 말고 바뀐 사실에 맞게 기대값만 고친다.**
4. **타입·빌드**: 프로그램마다 `npx tsc --noEmit` + `npm run build`. 이전부터 있던 오류(예: threads-content-ops `lib/coupangLinks.ts`, eslint 설정 없는 폴더)는 내 변경과 구분해 보고한다.
5. **실제 이미지 생성 시험은 일괄로 하지 않는다**(비용). 오류 신고가 들어오거나 꼭 필요할 때 시험 계정의 본인 키로 최소 횟수만 한다.

## 4. 배포·버전·DB

1. 프로그램 폴더마다 `vercel deploy --prod --yes`. 여러 곳을 연달아 배포하면 로그를 남기고 결과를 하나씩 확인한다.
   - **로그 오탐 주의**: 빌드 출력의 `_global-error` 같은 글자 때문에 단순 문자열 검사(`error`/`FAIL`)가 실패로 잘못 판정할 수 있다(2026-10-17 stepmail). 실패로 보이면 `vercel inspect <배포주소>`로 `production · Ready`인지 확인한다.
2. 버전: 코드 `lib/version.ts`(또는 `src/lib/version.ts`)의 `APP_VERSION` + DB `programs.version`을 같은 작업에서 +0.01. `v1.99` 다음은 `v2.00`(threads-content-ops 사례).
3. 확장이 있는 프로그램(핵심 원칙 10, 상세 [`EXTENSION_RELEASE_RULES.md`](EXTENSION_RELEASE_RULES.md)):
   - `blog-content-maker`: prebuild는 일치 여부만 검사 → manifest를 손으로 맞춘다.
   - `naver-blog-seo-studio`: 옛 버전 ZIP을 `git rm` 한 뒤 `node scripts/build-extension-archive.mjs`.
   - `naver-blog-allinone`: `extension/` 내용을 `public/downloads/naver-blog-allinone-latest.zip`으로 압축.
   - `naver-blog-auto-poster_web`: `POSTER_WEB_EXTENSION_VERSION`·manifest 수정 → `node naver-blog-auto-poster_web/scripts/build-extension-archive.mjs`(결과는 루트 `public/downloads`) → 루트 앱 배포.
   - 배포 뒤 `node scripts/check-extension-release.mjs <slug>` → `OK`.
4. 화면 확인: 크롬에서 각 프로그램 좌측 메뉴 아래 버전 표시. 비공개 프로그램이고 시험 계정에 권한이 없으면 404가 정상일 수 있다(poster_app·poster-web — 각 `docs/IMPROVEMENTS.md`에 기록).

## 5. 문서·커밋

1. 프로그램마다 `AGENTS.md`(또는 `README.md`)에 버전·바뀐 연결 파일·적용값(시간 제한·재시도)·「사본은 직접 고치지 않음」 주의를 적는다.
2. [`SHARED_MODULES.md`](SHARED_MODULES.md) §3 「최근 변경」, [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md) §3 행과 이력, [`PROGRAM_CAPABILITY_MAP.md`](PROGRAM_CAPABILITY_MAP.md) 버전을 함께 갱신한다. 새 사본은 `scripts/check-shared-modules.mjs`의 `MODULES`에 넣는다(폴더가 없으면 `--sync`가 만든다).
3. 에러를 해결했으면 [`ERROR_LESSONS.md`](ERROR_LESSONS.md)에 한 항목, 루트 [`HANDOFF.md`](HANDOFF.md) 맨 위에 요약.
4. 커밋은 내 파일만 경로를 지정해 스테이징한다. 공유 문서에 다른 CLI의 미커밋 변경이 있으면 내 줄만 올린다(hash-object/update-index). `.git/index.lock`이 있으면 지우지 말고 기다린다.
5. 완료 보고에는 사본을 쓰는 **모든 프로그램의 표**(프로그램 · 바꾼 연결 파일 · 테스트/빌드 · 배포 · 버전 · 화면 확인)를 넣는다. 하나라도 실패하면 완료가 아니다.

## 6. 남은 공용화 작업 (2026-10-18 기준)

| 순서 | 묶음 | 대상 | 주의 |
|---|---|---|---|
| 1 | 개별 | threads-affiliate-poster `imageGenerator.ts`(여러 플랫폼 생성기) | Gemini 외 공급자와 섞여 있음 |

## 7. 이력

| 날짜 | 내용 | 작성 |
|---|---|---|
| 2026-10-18 | 5묶음 완료 반영(§6) | Claude Code(윈도우) |
| 2026-10-18 | 4묶음 B 완료 반영(§6), SDK 전환 요령(§2-10) 추가 | Claude Code(윈도우) |
| 2026-10-18 | 시간 초과 안내를 Google 사용량 확인으로 정정(§2-9) — 결과는 저장되지 않으므로 「결과 확인」 금지 | Claude Code(윈도우) |
| 2026-10-18 | 기준이 시간 초과를 자동 재시도하지 않도록 변경 반영(§0-6, §2-2) | Claude Code(윈도우) |
| 2026-10-17 | 시간 초과 안내 표준 문구(§2-9) 추가 — 기준·사본 30곳 반영 | Claude Code(윈도우) |
| 2026-10-17 | 검사 스크립트에 이미지 호출 시간(300초) 자동 검사 추가 — 34곳 OK | Claude Code(윈도우) |
| 2026-10-17 | 최초 작성 — YouTube·이미지 공용화 작업(사본 30곳) 교훈 정리 | Claude Code(윈도우) |
