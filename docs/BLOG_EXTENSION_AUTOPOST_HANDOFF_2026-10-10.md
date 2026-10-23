# BLOG(원문) → 네이버 자동 포스팅 개선 — 최종 인수인계 (v1.40 ~ v1.57, 2026-10-10)

> 대상: `ai-auto-blog`(BLOG(원문)생성 자동화, https://ai-auto-blog-one.vercel.app)와 그 크롬 확장 `ai-auto-blog/extension/`.
> 이 문서는 2026-10-10 하루 동안(v1.40~v1.57) 한 개선 작업 전체를 **핵심 내용·처리 과정·로직·주의사항** 순서로 정리한 것이다.
> 세부 변경 이력은 `ai-auto-blog/AGENTS.md`(버전별), 진행표는 `docs/HANDOFF.md`, 에러 교훈은 `docs/ERROR_LESSONS.md`, 최초 분석·계획은 `docs/BLOG_AUTOMATION_HANDOFF_2026-10-10.md`, 공용 엔진 제안은 `docs/SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md`에 있다.
> 담당 구분: `ai-auto-blog/`는 Claude, `naver-blog-agent/`는 Codex. 서로의 폴더를 고치지 않는다(이번 작업에서도 `naver-blog-agent`는 읽기만 했다).

---

## 1. 핵심 내용 (한눈에)

**목표**: BLOG에서 **최종 본문(+이미지·링크·카테고리·태그)을 완성해 "네이버 입력기로 보내기"를 누르면, 크롬 확장이 알아서 회원의 네이버 블로그 새 글쓰기 화면을 열어 발행 직전까지 입력**한다. 확장은 "포스팅(입력)만" 한다. **마지막 "발행" 버튼은 절대 자동으로 누르지 않는다**(회원이 직접 — 규칙 §20-4).

**이전 방식과 달라진 점**
| 구분 | 이전(v1.39 이하) | 지금(v1.57) |
|---|---|---|
| 시작 | 회원이 확장 사이드패널에서 글을 골라 "입력 시작" | 웹에서 보내면 **30분 안에 확장이 자동으로 가져가 시작** |
| 실행 위치 | 사이드패널 화면(닫으면 중단) | **백그라운드 작업기**(`background.js`) — 패널을 닫아도 계속 |
| 검증 | "기대 문구가 문서에 들어 있나" | **매 단계 문서를 정확히 대조**(순서·중복·누락 모두 잡음) |
| 실패 처리 | 같은 단계 재시도(중복 입력 위험) | **재입력 없이 즉시 중지**, 입력된 내용 보존, 사유 코드 기록 |
| 중복 실행 방지 | 없음 | **실행 번호(run id)+3분 임대(lease)+하트비트** |
| 카테고리·태그 | 확장 사이드패널에 직접 입력 | **BLOG에서 정해 글과 함께 전송**(카테고리=확장이 읽어 준 실제 네이버 목록에서 선택) |
| 알림 | 없음 | 크롬 알림(발행 직전 준비 완료·입력 완료·입력 중단) |

**근거**: 네이버 블로그 에이전트(`naver-blog-agent`, Codex 담당)가 이미 쓰던 "최종 완성 원고를 확장에 보내면 확장이 발행 전 단계까지 자동 진행" 구조가 효율적이라고 주인님이 판단해 BLOG에도 적용. 에이전트의 장점(대상 블로그·빈 편집기 확인, 문서 정확 비교, 카테고리 실제 목록 선택)을 가져오되, BLOG는 §20 봇 탐지 회피 규칙(CDP 한 글자씩 70~170ms 입력)을 그대로 유지했다.

---

## 2. 전체 흐름 (회원 관점 → 시스템 관점)

1. 회원이 BLOG에서 글 생성(또는 수정) → **글 보기/글쓰기 결과 화면**에서 "네이버 카테고리" 칸의 **"카테고리 불러오기"**를 누르고(처음 한 번 또는 목록이 바뀔 때) 카테고리를 고른다. 기본값은 마지막으로 보낸 글의 선택.
2. **"🧩 네이버 입력기로 보내기"** → `POST /api/posts/[id]/extension-handoff`(본문 `{category}`) → 글이 "자동 입력 대기"(`extension_handoff_at`=지금, 입력 상태 비움)가 된다.
3. 확장 작업기가 10초마다(+30초 알람) `POST /api/extension/task`로 대기 글을 **가져간다**. 서버는 가져가는 순간 상태를 `in_progress`로 바꾸고 **새 실행 번호(run id)와 3분 임대**를 정해 돌려준다(두 확장이 켜져 있어도 한 곳만 가져감).
4. 작업기가 이미지를 미리 내려받고 → **본인 블로그의 빈 새 글쓰기 탭**을 연다(기존에 내용이 있는 탭은 건드리지 않고 새 탭) → 제목 → 본문(문단·이미지·링크 순서대로) → 문서 대조 → (옵션) 이미지 AI 활용 표시 → 발행 설정창에서 카테고리·태그 → **발행 직전에서 멈춤**.
5. 입력하는 동안 45초마다 하트비트로 임대를 연장하고, 모든 결과 보고에 run id를 싣는다. 서버가 "이 실행은 대체됨(409)"이라고 하면 입력을 중지한다.
6. 완료/중단 시 크롬 알림. 결과는 서버가 `success·persisted·status`를 확인해 줄 때까지 `chrome.storage`에 보관(보고만 재시도, 입력은 절대 재실행하지 않음).
7. 회원이 네이버 화면에서 내용 확인 후 **마지막 발행 버튼을 직접 누른다**.

실패하거나 30분이 지난 글은 **BLOG에서 다시 "네이버 입력기로 보내기"**를 누르면 된다(확장에는 더 이상 직접 시작 UI가 없다 — v1.56).

---

## 3. 코드 지도

### 3-1. 확장 `ai-auto-blog/extension/` (MV3, 최소 Chrome 120)
| 파일 | 역할 |
|---|---|
| `manifest.json` | 권한: sidePanel·storage·scripting·tabs·debugger·alarms·notifications. `content_scripts`로 BLOG 사이트에 `web-bridge.js` 주입. `version`·`version_name`은 **빌드가 `utils/version.ts`와 자동 동기화**(손으로 고치지 않는다). |
| `blog-core.js` | 순수 규칙: `unitsFromSnapshot`(문서→비교 단위), `createExpected`(+`clone`), `countLinks`, `compareUnits`(정확 비교), `imageFileName`, 태그 추천(`buildRecommendedTags` — 지금은 사이드패널에서 안 쓰지만 시험·SEO 호환으로 보존), `formatBrowserError`. |
| `blog-engine.js` | 입력 순서·검증·중지 판단(`runInputTask`, `TaskError`). **adapter 인터페이스만** 사용(브라우저 API 직접 호출 없음 → 가짜 adapter로 시험 가능). 카테고리·태그는 **작업(task) 값만** 사용. |
| `naver-adapter.js` | 크롬 API 연결부: 탭 열기/고르기(`prepareEditor`, `reuse=false`면 항상 새 탭), 프레임 찾기, CDP 입력(`typeText`), 이미지 업로드, 링크 붙여넣기, 발행 설정(`openPublishSettings`·`applyTags`·`applyCategory`), **카테고리 목록 읽기(`readCategories`)**, `closeTab`, `cleanup`. 바꾸는 명령은 **한 프레임에서만**, 읽기 조사만 모든 프레임. |
| `naver-page.js` | 네이버 편집기 프레임 **안에서** 도는 단일 함수 `blogEditorCommand`(주입 함수라 바깥 함수 사용 불가). 명령: snapshot·inspect·dismissResume·focus·clickImageButton·setImageFile·pasteLink·imageAi·openPublishSettings·tagFocus·tagState·`categories`·`categorySelect`·focusProbe·imageUiProbe·settingsProbe. |
| `background.js` | **작업기**(서비스 워커): 큐 가져가기(`pump`), 실행(`runTask`), 하트비트, 결과 보고·재시도(`flushPending`), 재시작 복구(`recoverInterrupted`), 알림(`notifyOutcome`), **카테고리 목록 읽기(`readCategories`)**, 메시지 처리. |
| `web-bridge.js` | BLOG 사이트 화면 ↔ 확장 좁은 다리: `ping`(설치·버전 확인), `categories`만 전달. 토큰·입력·발행 명령은 전달하지 않음. |
| `sidepanel.html/js` | 연결 토큰·블로그 ID 저장, 알림·AI 표시 체크, 진행 상태 카드·중지 버튼, **관리자 전용 구조 분석 카드**. (보낸 글 목록·직접 시작·카테고리/태그 칸은 v1.56~57에서 삭제) |

### 3-2. 서버 `ai-auto-blog/`
| 위치 | 역할 |
|---|---|
| `utils/extensionTask.ts` | 상수·규칙: `AUTO_START_WINDOW_MS`(30분), `RUNNING_GUARD_MS`(90분), `LEASE_MS`(3분), `isRunActive`, `newRunId`, `leaseExpiry`, 허용 상태 이동표 `ALLOWED_PREVIOUS`. |
| `utils/naverCategory.ts` | 카테고리 형식 검증(`parseNaverCategory`: id 숫자 1~12자리·이름 1~120자, `readNaverCategory`: 깨진 값은 null). 에이전트 `naverPublishing.ts`와 같은 형식. |
| `utils/extensionAuth.ts` | 확장 토큰 검증(`personal_access_tokens`, sha256, `checkProgramAccess` 재사용). `isAdmin`은 **화면 표시용**(권한 판정에 쓰지 않음). |
| `utils/extensionContent.ts` | 글 HTML → 입력 블록(문단·이미지·링크)과 태그(글 끝 해시태그). |
| `app/api/extension/task` | 가져가기(run id·임대·카테고리 포함). |
| `app/api/extension/posts/[id]/input-result` | 결과 보고(run id 검사, 상태 이동 검사, 멱등). |
| `app/api/extension/posts/[id]/heartbeat` | 임대 연장. |
| `app/api/extension/posts/[id]/start`, `GET app/api/extension/posts` | **옛 확장(v1.55 이하) 호환용으로 유지**(새 확장은 안 씀). |
| `app/api/extension/whoami` | 연결 확인 + `latestVersion`·`downloadUrl`·`isAdmin`. |
| `app/api/posts/[id]/extension-handoff` | 웹에서 보내기(본인 글만, 살아 있는 실행은 409, 카테고리 저장). |
| `app/api/posts/naver-category-default` | 카테고리 기본값(마지막으로 보낸 글의 선택). |
| `components/NaverCategoryPicker.tsx` | 웹의 카테고리 선택 UI(확장과 `window.postMessage`로 통신). |
| `components/settings/ExtensionSettings.tsx` | 설정 화면의 확장 설치·사용법 안내("3. 확장 프로그램 설정과 사용법"). |

### 3-3. DB (`blog_posts`, 공용 Supabase `esgxyikcnnvmlhygjkth`)
| 칸 | 용도 |
|---|---|
| `extension_handoff_at` | 웹에서 보낸 시각(30분 자동 시작 창의 기준) |
| `naver_input_status` | null / `in_progress` / `completed` / `publish_ready` / `failed` |
| `naver_input_completed_at`, `naver_input_error` | 완료 시각, `[코드] 문장` 형식 오류 |
| `naver_run_id uuid`, `naver_lease_expires_at timestamptz` | **v1.43** 실행 번호·임대 만료(주인님 승인) — `supabase/migrations/20261010200000_blog_extension_run_lease.sql` |
| `naver_category jsonb` | **v1.57** 글의 네이버 카테고리 `{"id","name"}`(주인님 승인) — `supabase/migrations/20261010345000_blog_posts_naver_category.sql` |

버전 갱신 SQL은 `supabase/migrations/20261010…_blog_bump_version_vX_YY.sql`(v1.40~v1.57).

---

## 4. 핵심 로직과 규칙

### 4-1. 서버 상태 이동과 임대
- **자동 시작 조건**: `extension_handoff_at`이 있고 `naver_input_status`가 비어 있으며 **보낸 지 30분 이내**. 30분이 지난 글은 자동 시작하지 않는다(오래전 보낸 글이 확장을 켜자마자 입력되는 사고 방지).
- **가져가기**: 후보 선택과 갱신 모두 "아직 대기 상태인지" 조건을 걸어 경쟁을 막는다(두 확장 중 한 곳만 성공).
- **임대**: `in_progress`는 임대(3분)가 살아 있는 동안만 "진행 중"으로 보호된다. 임대가 끝나면(PC 꺼짐·확장 종료) 웹에서 다시 보낼 수 있다 — 단 **자동으로 대기로 되돌리지는 않는다**(이미 입력·발행됐을 수 있어 회원이 확인해야 함).
- **다시 보내기**: 실행 번호·임대를 비워 옛 실행의 보고가 409로 거절되게 한다. 살아 있는 실행이 있으면 보내기 자체가 409.
- **보고 규칙**: 허용되는 "이전 상태"만 받는다(`ALLOWED_PREVIOUS`). 같은 상태 재보고는 최초 시각을 보존하고 성공(응답 유실 대비). 읽은 뒤 상태가 바뀌었으면 덮어쓰지 않고 409. 성공 응답은 `success·persisted·status·runId`를 명시 — **확장은 이 값이 맞을 때만 "보고 완료"로 처리**한다(HTTP 200만으로는 저장됐다고 보지 않음).
- **옛 확장 호환**: run id 없이 보고하면 예전 규칙으로 동작(번호 없는 `in_progress` 시작은 실행 번호를 비움).

### 4-2. 확장 안전 규칙 (모두 시험으로 고정됨)
1. **시작 전 편집기가 비어 있어야** 한다. 내용이 있는 기존 글쓰기 탭은 건드리지 않고 새 탭을 연다. 빈 새 글이 **2초 이상 안정적**일 때만 시작(임시글 복원 창이 늦게 뜰 수 있음).
2. **본인 블로그 ID**(사이드패널에 저장) 확인. 다른 계정이면 `ACCOUNT_MISMATCH`로 중지. **블로그 ID를 저장하기 전에는 자동 입력을 가져가지도 않는다.**
3. **매 단계(제목/글/링크/이미지)마다 문서를 다시 읽어 "지금까지 검증된 입력 + 방금 넣은 것"과 정확히 같은지 비교**한다(연속 문단 합침, 이미지 위치·개수, 링크 미리보기 카드는 무시, 그 밖의 차이는 불일치). 예전의 "포함 검사"는 기존 제목 혼합·본문 중복·순서 뒤바뀜을 통과시켰다.
4. 다르면 **같은 단계를 다시 입력하지 않고 즉시 중지**(재시도가 중복을 만든다). 입력된 내용은 보존.
5. 바꾸는 명령(포커스·이미지·붙여넣기·설정)은 **고른 한 프레임에서만**, 읽기 조사만 모든 프레임(v1.27 "추천 링크 4번 입력" 사고 교훈).
6. 이미지: 파일명 `blog-img-NN-<지문>.<확장자>`(고유) + 업로드 뒤 **이미지가 정확히 한 장 늘었는지** 확인, 반영 실패 시 재업로드 없이 `IMAGE_NOT_APPLIED`로 중지.
7. 탭 닫힘·이동·디버거 끊김·사용자 중지·확장 재시작 → 즉시 중단하고 보고(자동 재입력 없음, `EXTENSION_INTERRUPTED`). 입력이 이미 검증·보고된 뒤(settings/completed 단계)의 재시작은 실패로 바꾸지 않는다.
8. **글자 입력**: CDP `Input.insertText` 한 글자씩 70~170ms + 가끔 250~700ms 쉼(§20 봇 탐지 회피). **에이전트의 덩어리 입력으로 바꾸지 않는다.**
9. 마지막 발행 버튼은 찾지도 누르지도 않는다(설정창의 최종 발행 `seOnePublishBtn`은 제외).

### 4-3. 링크 입력
링크만 있는 줄(추천 링크 상자 등)은 `{type:'link'}` 블록으로 보내고, 확장이 **링크가 걸린 HTML을 "붙여넣기 이벤트"로** 넣는다. 성공 판정은 **편집기 문서(snapshot)의 실제 상태**로 한다(붙여넣기 프레임의 개수 변화로 판정하면 프레임이 달라 오판 — v1.46). 붙여넣기 뒤 문서가 "기대 + 라벨"과 같으면 성공, 붙여넣기 전 그대로이면(2~6초 대기 후) 글자 "라벨: 주소"로 한 번만 대체 입력, 그 밖은 중지.

### 4-4. 커서 위치 (SmartEditor ONE의 특성)
- 커서는 **클릭 좌표**가 정한다(DOM selection이 아님). 여러 줄 문단을 다시 클릭하면 문단 가운데에 커서가 간다.
- 그래서 입력 위치를 새로 잡는 때는 **본문 첫 블록(제목 직후)과 이미지 바로 뒤뿐**(`needsFocus`). 글·링크 입력 직후엔 커서가 이미 문서 끝이므로 다시 클릭하지 않는다.
- `focus(body)`는 항상 **문서 맨 끝 문단**만 대상으로 하고, 글이 이미 있는 마지막 문단은 클릭을 거부한다(글 중간 입력 방지). "비어 있음" 판정은 안내 문구(`.se-placeholder`)를 뺀 `readText`로 한다.
- 이미지를 올리면 네이버가 오른쪽에 **"라이브러리" 패널**(role=dialog)을 연다 — 입력을 막는 팝업이 아니다. 입력을 막는 팝업은 **제목(`.se-popup-title`)이나 안내문(`.se-popup-alert-text`)이 있는 `.se-popup-container`만**(`blockingPopup()`).

### 4-5. 카테고리·태그 (v1.57)
- **태그**: 항상 글의 해시태그(서버가 task에 실어 보냄). 확장에 저장된 옛 태그 값은 무시.
- **카테고리 목록 읽기**: BLOG 화면 → `postMessage({source:'blog-publishing-app', type:'categories'})` → `web-bridge.js` → `background.js`의 `categories` 메시지. **발신 `sender.url`이 `https://ai-auto-blog-one.vercel.app/`로 시작하는 것만** 허용, 입력 작업 중이면 거절. **새 탭**(`reuse:false`)에서 발행 설정창만 열어 목록(번호·이름, 중복 제거)을 읽고, **아무것도 선택하지 않은 채** 닫은 뒤 우리가 연 탭을 닫고 BLOG 탭으로 돌아간다(실패해도 탭을 닫음, 로그인 대기 90초).
- **카테고리 선택**: `categorySelect`는 **번호(id)로 정확히 하나를 찾고 이름이 같을 때만** 선택한다. 이름이 바뀌었거나 번호가 없으면 선택하지 않고 안내(내용은 보존, 상태는 completed). 이름만으로는 절대 선택하지 않는다.
- 카테고리 미선택(null)이면 네이버 기본 카테고리로 남고, 카테고리·태그가 모두 없으면 발행 설정창을 열지 않는다(`completed`).
- 웹은 불러온 목록에 선택 번호가 없으면(네이버에서 삭제) 선택을 해제하고, 이름이 바뀌었으면 새 이름으로 갱신한다.

### 4-6. 생성 개선 (v1.42, 확장과 별개)
- **당해 연도**(루트 `CLAUDE.md` 원칙 8): `utils/yearPolicy.ts`(에이전트 `yearPolicy.ts`의 사본 — **규칙을 바꾸면 양쪽을 같이 고칠 것**)와 `utils/news/promptRules.ts`의 `buildYearRule()`이 `new Date().getFullYear()`를 프롬프트에 주입. 제목·소제목·해시태그의 과거 연도는 올해로 보정, 본문의 과거 사실 연도는 보존.
- **글자 수 단위 통일**: 목표는 **공백 제외 글자 수**(800~3,500, 100자 단위, 기본 2,000). 응답에 실제 `bodyChars`·`targetChars`. 예전 `wordCount`·`target_word_count`도 글자 수로 읽는다.
- **뉴스 지표**: `signals`는 내부 추정값(`estimated:true`), 기사가 없으면 0점·`hasData:false`.
- ⚠️ 실제 유료 생성으로 모델이 새 지침을 지키는지는 **아직 시험하지 않았다**(승인 필요).

### 4-7. 기타 운영 기능
- **크롬 알림**(v1.44): 발행 직전 준비 완료·입력 완료·입력 중단. 사용자 중지·서버가 대체한 실행은 알리지 않음. 알림 클릭 시 해당 네이버 탭으로 이동. 끄기 가능(`aiAutoBlogNotify`, 기본 켜짐).
- **이미지 "AI 활용" 표시**(v1.49): **기본 꺼짐**, 사이드패널 체크 시에만 자동 켬(`aiAutoBlogImageAi`). 네이버 정책 요구가 확인되면 기본값을 켜짐으로 되돌릴 수 있다(`background.js`의 `imageAi: all[KEY.imageAi] === true`와 사이드패널 기본 체크).
- **구조 분석**: 관리자(`isAdmin`) 계정으로 연결했을 때만 사이드패널에 표시(개발·오류 진단용 — 앞으로도 필요할 수 있어 보존).
- **버전 알림**: `whoami`의 `latestVersion`과 설치된 확장 버전이 다르면 사이드패널 상단에 "새 버전" 배너.

---

## 5. 처리 과정 (시간순 요약)

| 버전 | 내용 |
|---|---|
| v1.40 | 서버 큐: `task`·`input-result` 강화·30분 자동 시작 창·허용 상태 이동·다시 보내기 보호, `extension-handoff`의 `ok` 필드 누락 버그 수정 |
| v1.41 | **확장 작업기 전면 개편**(background worker, 정확한 문서 비교, 단일 프레임, 결과 선보관 재보고, 오류 코드) |
| v1.42 | 생성: 당해 연도·글자수 단위·뉴스 지표 표기 |
| v1.43 | **실행 번호·임대·하트비트**(DB 칸 2개, 승인) |
| v1.44 | 완료 크롬 알림. **첫 실제 시험 실패** → v1.45 |
| v1.45 | 이미지 업로드 뒤 라이브러리 패널을 팝업으로 오인하던 문제(2차 시험) |
| v1.46 | 링크 중복 입력(프레임 판정)·본문 중간 포커스 문제 |
| v1.47 | 링크가 마지막 문단 중간에 들어가던 문제(클릭 좌표 특성) |
| v1.48 | 빈 본문 안내 문구를 "글 있음"으로 오인하던 안전장치 |
| v1.49 | 이미지 AI 표시를 옵션(기본 꺼짐)으로 |
| v1.50~55 | 정리 6건: 구조 분석 관리자 전용 · 해시태그 버튼 제거 · 단계 안내 제거 · `inspectStructure` 제거 · `HEARTBEAT_MS` 제거 · 설정 화면 안내 보강 |
| v1.56 | **"보낸 글" 섹션·직접 시작·확장 태그 칸 삭제**(BLOG에서 완성 → 확장은 포스팅만) |
| v1.57 | **카테고리를 BLOG에서 실제 네이버 목록으로 선택**(DB 칸 1개, 승인), 확장 카테고리·태그 칸 삭제, `web-bridge.js` 추가 |

실제 화면 시험은 주인님 PC에서 v1.44~v1.48 5회 반복 후 끝까지 성공(제목·본문·이미지 3장·링크). v1.57 카테고리 등록도 "잘 등록된다"고 주인님이 확인했다.

---

## 6. 주의사항 (다음 작업자가 꼭 지킬 것)

**최상위 규칙**
- 본인 계정·본인 API 키 원칙(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`): 운영자·다른 회원의 키/계정으로 대신 처리하지 않는다. 확장 토큰은 회원 본인 것(`personal_access_tokens`).
- **최종 발행 버튼은 자동으로 누르지 않는다.** 이를 깨는 변경은 만들지 않는다.
- 시험 계정: `buylifemall@gmail.com`=유일한 관리자, `buylifemall@naver.com`=일반 회원 테스트 계정. 비밀 키를 출력·커밋하지 않는다.

**확장 운영 규칙(루트 `CLAUDE.md` 원칙 10)**
- 프로그램을 업데이트하면 **확장 폴더·ZIP·DB 버전이 한 번에** 바뀌어야 한다. 버전 올리기: `utils/version.ts`의 `APP_VERSION` → `npm run build`(prebuild가 manifest·ZIP 자동 생성) → DB `programs.version`·`extension_version`·`extension_download_url` 갱신(MCP `execute_sql`) + `supabase/migrations`에 같은 SQL 파일 → 배포 후 **`node scripts/check-extension-release.mjs ai-auto-blog`로 `OK` 확인**.
- 배포: `cd ai-auto-blog && vercel deploy --prod --yes --scope buylife`. Vercel CLI가 결과 대신 JSON 안내만 출력하면 `vercel ls ai-auto-blog --scope buylife`로 Ready 확인. `vercel.json`의 `framework: nextjs`는 지우지 않는다.
- 회원 PC의 확장은 **자동 업데이트되지 않는다**(압축 해제 방식) — 확장을 바꾼 배포의 보고에는 항상 "ZIP 다시 받기 → 기존 폴더에 덮어쓰기 → `chrome://extensions` 새로고침 → (BLOG 화면 새로고침)" 안내를 넣는다.
- 서버 응답을 바꿀 때는 **옛 확장이 깨지지 않게** 호환을 유지한다. 지금도 `GET /api/extension/posts`·`POST …/start`는 옛 확장(v1.55 이하) 때문에 남겨 두었다. 옛 확장이 사라졌다고 확인되기 전에는 지우지 않는다.

**확장 개발 주의**
- 새 안전장치를 넣을 때는 **"정상 빈 상태(새 글·이미지 직후)"를 가짜 화면 시험에 먼저 넣는다**(v1.47은 이 경우를 시험하지 않아 v1.48에서 터졌다).
- 상태를 바꾸는 주입은 `allFrames`로 돌리지 말고 한 프레임에서만. 성공 판정은 한 프레임의 개수 변화가 아니라 **편집기 문서의 실제 상태**로.
- 다른 프로그램에서 "화면에서 확인된" 셀렉터를 옮겨도, 그 앞 단계(이미지 업로드 등)가 다르면 화면 상태가 달라진다 — **새 단계 조합은 실제 화면으로 확인**해야 한다(모의 시험 131개가 놓친 문제를 실제 시험 1회가 찾았다).
- 카테고리 읽기는 회원의 기존 글쓰기 탭을 빌리지 않는다(`reuse:false`). 읽기 도중 회원이 쓰던 글이 있어도 영향이 없어야 한다.
- 이 환경의 브라우저 도구(claude-in-chrome)는 naver.com 접속이 차단되어 **실제 네이버 화면 검증은 주인님 PC에서만** 가능하다.

**서버·DB 주의**
- DB 스키마 변경·환경변수·비밀 키 변경·유료 API 대량 호출·회원 대신 발행/결제는 **사전 승인** 필요(이번 DB 칸 3개는 모두 승인받음).
- 모든 확장용 API는 `privateJson`(`private, no-store`)과 `dynamic='force-dynamic'`+`fetchCache='force-no-store'`를 쓴다. DB 오류는 내용을 노출하지 않고 503/500.
- `naver_category`의 기본값은 별도 테이블 없이 **본인 글에서만** 읽는다(`user_id` 필터 필수).
- 에이전트의 `yearPolicy.ts` 사본은 규칙 변경 시 양쪽 동기화.

**알려진 한계 / 의심 지점**
- `1. 항목`처럼 번호로 시작하는 줄을 네이버가 자동 목록으로 바꾸면 글자가 달라져 `TEXT_MISMATCH`로 안전 중지될 수 있다(이 경우 해당 줄 처리 방식을 조정).
- 서식(소제목 크기·굵게)은 한 글자씩 입력 방식이라 입력되지 않는다(주인님 선택).
- 이미지는 Supabase Storage `post-images`에 올라가고 **30일 뒤 자동 삭제**(콘텐츠 일체 30일 보관 정책)되므로, 오래된 글을 다시 보내면 이미지를 못 불러와 건너뛸 수 있다(경고로 표시).
- 임대가 끝난 `in_progress` 글은 자동 복구하지 않는다(회원이 네이버 화면 확인 후 다시 보내야 함).

---

## 7. 시험·검수 방법

```bash
cd ai-auto-blog
npm run test:extension        # 확장: 엔진·작업기·adapter·페이지 (74개)
npm run test:extension-api    # 서버 API: 가짜 메모리 DB로 실제 route 실행 (38개)
npm run test:security         # 접근·보안 (39개)
npm run test:generation       # 생성 규칙 (7개)
npm run build                 # 타입 포함 빌드 + 확장 ZIP 자동 생성
node ../scripts/check-extension-release.mjs ai-auto-blog   # DB·라이브 ZIP 버전 일치 확인
```
- 시험은 `vm` + 가짜 chrome/DB/DOM으로 실제 코드를 실행한다(운영 DB·유료 API·실제 네이버 없음). **회귀 시험은 수정 전 코드에서 실패하는지 확인**하는 방식으로 만들었다.
- 이 시험이 못 잡는 것: 실제 네이버 화면의 셀렉터·타이밍. 반드시 주인님 PC 실제 시험이 필요하다.

---

## 8. 남은 작업 (2026-10-10 기준)

**확인 필요(주인님 PC)**: 크롬 완료 알림 표시, 마지막 발행 버튼 미클릭, v1.56~57 사이드패널 정리(보낸 글·카테고리 칸 없음, 구조 분석 카드는 관리자만).
**승인 필요**: 유료 AI 생성 실제 시험(연도·글자 수 규칙: 응답의 `bodyChars` vs `targetChars`) — 짧은 요청 1회.
**Codex 검토/주인님 승인 대기**: `docs/SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md`(공용 엔진 제안), 네이버 블로그 에이전트에 run id/lease 적용(에이전트 DB 변경 필요).
**장기(이전부터)**: SSO 도메인 확대(shots 시범 확인 후), Supabase Pro 전환(2026-10-20 전), 보안 마무리(옛 키 폐기는 주인님이 직접), 저장소 비공개 전환 준비.
