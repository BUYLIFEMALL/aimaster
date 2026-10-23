# 티스토리 자동 포스팅 업그레이드 — 최종 인수인계 (tistory-auto-blog v1.57 ~ v1.65, 2026-10-10)

> 대상: `tistory-auto-blog`(티스토리(원문)생성 자동화, https://tistory-auto-blog-pearl.vercel.app)와 그 크롬 확장 `tistory-auto-blog/extension/`.
> **목표(주인님 지시)**: BLOG에서 최종 글을 완성해 "티스토리 입력기로 보내기"를 누르면, 확장이 알아서 티스토리 새 글에 **발행 직전까지** 입력한다. **최종 저장·발행은 회원이 직접 누른다.**
> 이식 원본: `ai-auto-blog`(BLOG)의 같은 개선 — [`BLOG_EXTENSION_AUTOPOST_HANDOFF_2026-10-10.md`](BLOG_EXTENSION_AUTOPOST_HANDOFF_2026-10-10.md). 이 문서는 **티스토리에서 달라진 점·실제 시험에서 발견한 문제·주의사항**을 정리한다. 티스토리 고유 장애 이력과 금지 사항은 `tistory-auto-blog/docs/OPERATIONS_HANDOFF.md`(9절)와 같이 읽는다. 버전별 상세는 `tistory-auto-blog/AGENTS.md`.
> 다른 CLI(Codex·Gemini·다른 Claude 세션)가 이어받을 때는 **이 문서 → OPERATIONS_HANDOFF.md → AGENTS.md → 루트 `docs/ERROR_LESSONS.md`** 순서로 읽는다.

---

## 1. 핵심 내용 (한눈에)

| 구분 | v1.56 (이식 전) | v1.65 (지금) |
|---|---|---|
| 시작 | 사이드패널에서 글 선택 → "입력" 버튼 | 웹에서 보내면 **30분 안에 확장이 자동 시작** |
| 실행 위치 | 사이드패널 페이지(1,359줄 한 파일, 패널을 닫으면 중단) | **백그라운드 작업기** + core / engine / adapter 분리 |
| 서버 | 글 목록 API + 단순 상태 보고 | `task`(대기 글 가져가기), **실행 번호·3분 임대·45초 하트비트**, 결과 검사(409·멱등·`success·persisted·status`) |
| 결과 보고 | 한 번 보내고 실패해도 무시 | 서버 저장 확인까지 보관·재보고(입력은 재실행하지 않음) |
| 시작 화면 | 회원이 직접 연 탭 | **항상 새 탭**(빈 탭에서 디버거를 먼저 붙인 뒤 `<블로그>.tistory.com/manage/newpost`로 이동), 로그인 대기·본인 블로그 확인·빈 편집기 2초 안정 확인 |
| 카테고리·태그·발행 설정 | 사이드패널에 직접 입력 | **BLOG에서 글마다 선택해 글과 함께 전송**(카테고리는 확장이 읽어 준 목록) |
| 알림 | 없음 | 크롬 알림(발행 직전 준비 완료·입력 완료·입력 중단) |
| 구조 분석 | 모든 회원에게 표시 | **관리자 계정에만 표시**(개발·진단용 보존) |
| 발행 글 모양 | 원문 스타일 일부만 반영 | 여백·테두리·인용 상자·가로줄·이미지 모서리를 원문처럼 변환 |
| 시험 | 배너 3개 | 확장 72개 + 서버 36개 + 배너 3개 |

---

## 2. 처리 과정 (버전별)

| 버전 | 내용 | DB |
|---|---|---|
| v1.57 | **서버**: 자동 입력 큐(`POST /api/extension/task`, `.../posts/[id]/heartbeat`, 강화된 `input-result`), `utils/extensionTask.ts`, `utils/tistoryPublish.ts`(발행 설정 검증), 보내기 API가 `{publish}` 저장·실행 보호 | `tistory_posts`에 `tistory_run_id`, `tistory_lease_expires_at`, `tistory_publish` 3칸 추가(주인님 승인, `supabase/migrations/0002_…`) |
| v1.58 | **웹**: 글 보기 화면의 발행 설정 패널(`components/TistoryPublishPanel.tsx`: 카테고리·공개/비공개·댓글·홈주제·현재/예약), 마지막 설정을 기본값으로(`GET /api/posts/tistory-publish-default`) | 없음 |
| v1.59 | **확장 전면 이전**: 입력 코드를 사이드패널 → 작업기로(`tistory-core.js`·`tistory-engine.js`·`tistory-adapter.js`·`background.js`·`web-bridge.js`), 사이드패널 정리, 알림, 이미지 사전 확인, 카테고리 목록 읽기, 안내 문구 갱신, 죽은 `offscreen` 코드 삭제 | 없음 |
| v1.60 | **실제 시험 1**: 홈주제 이름 불일치(`IT·인터넷` vs 티스토리 `IT 인터넷`)와 발행 설정 오류 사유가 사라지던 문제 수정 | 없음 |
| v1.61 | **실제 시험 2**: "저장된 글이 있습니다. 이어서 작성하시겠습니까?" 네이티브 확인창을 디버거로 자동 **취소** | 없음 |
| v1.62 | 글 보기 화면 레이아웃: 발행 설정 패널을 버튼 줄에서 분리(전체 폭 블록) | 없음 |
| v1.63 | 확장 "화면 구조 분석"을 관리자 계정에만 표시(서버 `whoami`의 `isAdmin`) | 없음 |
| v1.64 | **발행 글 모양**: 원문의 여백·테두리·목록·인용 상자·가로줄·이미지 모서리를 티스토리에 반영 | 없음 |
| v1.65 | v1.64의 진한 사각 테두리 수정(네 변 두께 명시) + 인용 줄 연한 회색 | 없음 |

---

## 3. 전체 흐름

1. 회원이 BLOG 글 보기에서 **"발행 설정"**을 펼쳐 카테고리("카테고리 불러오기")·공개 범위(공개/비공개)·댓글·홈주제·발행 시점을 정한다. 기본값은 마지막으로 보낸 글의 설정(예약 제외).
2. **"🧩 티스토리 입력기로 보내기"** → `POST /api/posts/[id]/extension-handoff`(본문 `{publish}`) → 글이 "자동 입력 대기"가 된다(살아 있는 실행이 있으면 409).
3. 확장 작업기가 10초마다(+30초 알람) `POST /api/extension/task`로 가져간다. 서버는 가져가는 순간 상태를 `in_progress`로 바꾸며 **실행 번호와 3분 임대**를 돌려준다. 이때 서버가 원문 HTML을 입력 블록으로 변환한다(`utils/extensionContent.ts` — **서식 변환은 이 시점에 일어난다**).
4. 작업기가 이미지 주소를 사전 확인(HEAD→GET, 사라진 이미지는 건너뜀·경고) → **빈 탭 생성 → 디버거 부착 + `Page.enable` → 글쓰기 주소로 이동**(저장된 글 이어쓰기 확인창 자동 취소) → 로그인 대기 → 본인 블로그 확인 → 빈 편집기 2초 안정 확인.
5. 제목 → 본문 블록(문단 입력 / 서식 블록 `insertContent` / 이미지 붙여넣기 + 모양 입히기, 블록마다 확인) → 저장 원본 동기화·전체 확인 → `completed` 보고 → 카테고리·태그·발행 설정(공개 범위·댓글·홈주제·예약) → `publish_ready` 보고.
6. 45초마다 하트비트, 결과는 서버가 `success·persisted·status`를 확인할 때까지 보관·재보고. 끝나면 크롬 알림.
7. 회원이 티스토리 화면에서 내용을 확인하고 **마지막 저장·발행 버튼을 직접 누른다.**

실패했거나 30분이 지난 글은 **BLOG에서 다시 "티스토리 입력기로 보내기"**를 누른다(확장에는 직접 시작 UI가 없다).

---

## 4. 코드 지도

### 4-1. 확장 `tistory-auto-blog/extension/` (MV3, 최소 Chrome 120)
| 파일 | 역할 |
|---|---|
| `tistory-core.js` | 순수 규칙(브라우저 API 없음): 검증 샘플·`matchTextBlocks`·`expectedStructure`·태그 정리·블로그 이름/주소 판정·`needsPublishDialog`·`formatBrowserError` |
| `tistory-engine.js` | 입력 순서·검증·중지 판단(`runInputTask`). adapter 인터페이스만 사용 → 가짜 편집기로 시험 가능 |
| `tistory-adapter.js` | 실제 화면 조작. **v1.56 `sidepanel.js`의 입력 함수를 내용 변경 없이 옮긴 부분**(TinyMCE MAIN world 삽입, 이미지 붙여넣기, 태그 칩 확인, 신뢰된 포인터 클릭, 발행 설정) + 새 탭 준비(`prepareEditor`)·대화상자 가드(`startDialogGuard`)·이미지 모양(`styleTistoryImage`)·카테고리 읽기(`readCategories`). 이 파일은 더 이상 생성 스크립트로 만들지 않는다 — **직접 고친다** |
| `background.js` | 작업기: 10초 가져가기·실행 번호·하트비트·결과 선보관 재보고·재시작 복구·알림·이미지 사전 확인·카테고리 목록 읽기 |
| `web-bridge.js` | 웹 ↔ 확장 좁은 다리(`ping`·`categories`만, 이 사이트 출처만, 토큰·입력·발행 명령 미전달) |
| `sidepanel.html/js` | 연결 토큰, **내 티스토리 블로그 이름 저장**, 알림 체크, 진행 상태·중지, **관리자 전용 구조 분석** |

### 4-2. 서버·웹 `tistory-auto-blog/`
| 위치 | 역할 |
|---|---|
| `utils/extensionTask.ts` | 30분 자동 시작 창·3분 임대·허용 상태 이동표·`isRunActive` |
| `utils/tistoryPublish.ts` | 발행 설정 검증(`parseTistoryPublish`)·읽기(`readTistoryPublish`)·`TISTORY_HOME_TOPICS` |
| `utils/extensionContent.ts` | 원문 HTML → 입력 블록 변환 + **원문 모양을 인라인 CSS로 번역**(`tailwindTextStyles`, `tistorySafeHtml`) |
| `utils/extensionAuth.ts` | 확장 토큰 검증(`isAdmin`은 화면 표시용) |
| `app/api/extension/task`·`posts/[id]/input-result`·`posts/[id]/heartbeat`·`whoami` | 큐·보고·임대·연결 확인 |
| `app/api/extension/posts` (GET) | **옛 확장(v1.56 이하) 호환용으로 유지** |
| `app/api/posts/[id]/extension-handoff`, `app/api/posts/tistory-publish-default` | 보내기·기본 발행 설정 |
| `components/TistoryPublishPanel.tsx`, `app/posts/[id]/page.tsx` | 발행 설정 패널과 글 보기 화면 |
| DB `tistory_posts` | `tistory_run_id`, `tistory_lease_expires_at`, `tistory_publish`(jsonb) + 기존 `extension_handoff_at`, `tistory_input_*` |

---

## 5. 핵심 설계 결정

1. **검증은 BLOG와 다르다.** BLOG는 문서 단위 "정확 비교", 티스토리는 TinyMCE가 HTML을 재구성(공백·`&nbsp;`·엔티티·태그)하므로 **문단마다 앞·뒤 48자 조각을 본문에서 찾고 제목·목록·인용·표·링크 같은 의미 구조가 남았는지** 확인한다(`TistoryCore.verificationSamples/matchTextBlocks/expectedStructure`). 정확 비교는 정상 입력을 실패로 오판한다(실제 장애: 29개 중 7개 중단).
2. **입력 함수는 새로 쓰지 않았다**(실제 화면에서 확인된 동작 보존). 순서·검증만 `tistory-engine.js`가 맡는다.
3. **같은 단계를 재입력하지 않는다**(예외: 서식 블록 텍스트가 통째로 사라졌을 때 그 블록 글자만 1회 복구 — 기존 동작). 부분 입력된 글은 발행하지 않고 BLOG에서 다시 보낸다.
4. **보호글(비밀번호)은 자동 입력에서 제외**(주인님 결정): 비밀번호를 DB·확장 저장소에 두지 않기 위해서다. 서버가 거절하고 화면에 안내한다.
5. **홈주제는 기본 목록에서 고른다**: 빈 새 글에서는 티스토리가 발행 설정창을 열지 않아 실제 목록을 읽을 수 없다. 입력 때 현재 티스토리 목록과 **공백·문장부호·대소문자를 무시하고 정확히 하나로 식별되는 항목만** 선택하며, 그렇지 않으면 선택하지 않고 실제 목록을 보여 주며 중단한다(`completed`+경고).
6. **카테고리는 번호 없이 이름(`aria-label`)으로만** 구분된다. 목록은 확장이 새 탭에서 `#category-btn` 목록을 읽어 주며(선택·발행 없음), 불러온 목록에 없는 선택은 웹이 해제한다.
7. **서식 변환은 서버에서, 이미지 모양은 확장에서**: 원문 모양은 Tailwind 클래스로만 표현되므로 변환기가 인라인 CSS로 옮긴다. 이미 발행된 글은 바뀌지 않고 **다시 보내야** 새 서식이 적용된다.
8. **옛 확장(v1.56 이하) 호환**: 글 목록 API와 실행 번호 없는 `input-result` 보고는 그대로 동작한다.

---

## 6. 실제 시험(주인님 PC)에서 발견·해결한 문제

| 증상 | 원인 | 해결 | 교훈 |
|---|---|---|---|
| 발행 설정 단계에서 "결과를 확인하지 못했습니다", 홈주제 비어 있음 (v1.60) | ① 웹 기본 목록 `IT·인터넷` ≠ 티스토리 `IT 인터넷` ② 화면에 주입한 함수의 예외가 `executeScript`에서 **값 없음**으로 보여 원인이 사라짐 | 이름 비교를 공백·문장부호 무시로, 주입 함수가 `{error}`를 돌려주고 어댑터가 사유를 던짐, 실제 목록을 오류에 표시 | 주입 함수는 예외를 직접 직렬화해 돌려준다. "결과를 확인하지 못했습니다" 같은 뭉뚱그린 오류는 가려진 원인을 의심 |
| 새 탭이 "준비 중"에서 멈춤: "저장된 글이 있습니다. 이어서 작성하시겠습니까?" (v1.61) | 페이지 요소가 아닌 **네이티브 `confirm()`**. 떠 있으면 `executeScript`도 응답 없음. "확인"을 누르면 이전 글이 불려옴 | 빈 탭에서 디버거를 먼저 붙이고 `Page.enable` 뒤에 이동, 메시지에 "저장된 글이 있습니다"+"이어서 작성"이 있는 창만 `Page.handleJavaScriptDialog {accept:false}` | 네이티브 대화상자는 디버거 이벤트로 처리, 이동 전에 미리 붙이고, 대상 창만 가려 처리 |
| 발행 설정은 정상인데 홈주제가 안 들어감 | 전송 때 패널에서 홈주제를 선택하지 않았음(DB의 `tistory_publish.topic`이 비어 있었음) | 확장 문제 아님 — 보내기 전 패널 요약 줄 확인 | 입력 결과가 이상하면 먼저 DB에 저장된 `tistory_publish` 값을 본다 |
| 글 보기 화면에서 버튼이 세로로 늘어남 (v1.62) | 발행 설정 패널이 버튼 줄 한가운데에 있었음 | 패널을 작성자 줄 아래 전체 폭 블록으로 분리 | 폭이 큰 패널은 버튼 줄과 분리 |
| 발행 글이 원문과 다름: 문단 붙음·소제목 밑줄 없음·요약 상자에 큰 따옴표(“) 장식·가로줄이 점 세 개·이미지 각짐 (v1.64) | 변환기가 여백·테두리 모양·목록 위치를 옮기지 않음, `<blockquote>`는 스킨이 장식을 붙임, `<hr>`는 스킨이 점으로 바꿈 | 인라인 CSS 보강, 스타일 인용 상자는 같은 모양의 `<p>`로, `<hr>`은 옅은 실선 문단으로, 업로드 직후 이미지에 모서리·테두리 | 원문 모양은 클래스(웹 CSS)에서 나온다 — 티스토리에는 인라인으로 옮겨야 한다 |
| 인용 상자·소제목 둘레에 진한 사각 테두리 (v1.65) | `border-style: solid`만 주고 두께를 한 변에만 줘서 **나머지 세 변이 기본 두께(약 3px)로 그려짐** | `border-width: 0 0 1px 0` / `0 0 0 4px`로 네 변 두께 명시, 인용 줄 색 연한 회색(`#cbd5e1`) | 한 변만 쓸 때는 `border-width`로 네 변을 모두 명시 |

---

## 7. 주의사항 (다음 작업자가 꼭 지킬 것)

**불변 규칙**
- **최종 `#publish-btn`은 어디에서도 찾거나 누르지 않는다.** 시험(`tests/extension-adapter.test.cjs`)이 어댑터·엔진·작업기 소스에서 이 선택자가 없음을 검사한다.
- 입력 속도(CDP 한 글자씩 70~170ms)는 §20 봇 탐지 회피 규칙 — 덩어리 입력으로 바꾸지 않는다.
- 본인 계정·API 최상위 규칙(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`), DB 스키마·환경변수·비밀 키 변경·유료 호출·회원 대신 최종 발행은 사전 승인.
- 티스토리 고유 금지 사항(`OPERATIONS_HANDOFF.md` 3절): TinyMCE는 **MAIN world**에서 다룬다, 발행 직전 `setContent()`로 본문을 다시 쓰지 않는다, 문자열 완전 일치만으로 실패 판정하지 않는다, 본문 `#태그`는 등록 태그가 아니다(태그 칩이 생성돼야 성공), 부분 입력 초안은 발행하지 않는다, **선택자는 추측하지 않고 실제 화면을 확인해 추가한다**.

**개발 주의**
- 화면에 주입하는 함수(`func:`)는 항상 `try/catch`로 `{error}`를 돌려준다 — 예외가 `undefined`로 사라진다.
- `tistory-adapter.js`의 편집기 안 주입 함수(TinyMCE·태그 칩·발행 설정창)는 가짜 화면으로 전부 시험할 수 없다 — 발행 설정창의 일부(`tests/extension-publish-dialog.test.cjs`)만 가짜 화면에서 실행한다. **변경 후에는 실제 티스토리 화면 확인이 필수**다. 이 환경의 브라우저 도구는 외부 로그인 서비스 접근이 막혀 실제 검증은 주인님 PC에서만 가능하다.
- 서식 변환을 고칠 때 `cheerio`의 `element.attribs`는 속성을 지우면 **함께 바뀐다** — 클래스를 쓰려면 지우기 전에 복사해 둔다(`originalClass`). 변환 시험(`tests/extension-content.test.cjs`)은 실제 생성 HTML 모양으로 돌린다.
- CSS 테두리는 한 변만 쓰더라도 `border-width`로 네 변 두께를 명시한다.
- `Page.javascriptDialogOpening` 이벤트는 대화상자가 열린 뒤에는 놓칠 수 있으므로 디버거를 이동 전에 붙인다. 다른 대화상자는 건드리지 않는다.
- 홈주제·카테고리처럼 사용자가 고르는 목록을 미리 만들 때는 실제 화면의 글자와 대조한다. 어긋나면 이제 오류에 실제 목록이 나오므로 그것으로 `TISTORY_HOME_TOPICS`를 맞춘다.

**운영 규칙(루트 `CLAUDE.md` 원칙 10)**
- 버전 올리기: `utils/version.ts` → `npm run build`(prebuild가 ZIP·manifest 자동 생성) → DB `programs.version·extension_version·extension_download_url` 갱신(MCP `execute_sql`) + 버전 SQL 파일 → 배포(`cd tistory-auto-blog && vercel deploy --prod --yes --scope buylife`) → `node scripts/check-extension-release.mjs tistory-auto-blog`로 `OK` 확인.
- 회원 PC의 확장은 자동 업데이트되지 않는다 — "ZIP 다시 받기 → 기존 폴더에 덮어쓰기 → `chrome://extensions` 새로고침 → 사이드패널에서 **블로그 이름 저장**". 블로그 이름을 저장하기 전에는 자동 입력이 시작되지 않는다.
- 서버만 바꾼 변경(예: 서식 변환)은 확장 재설치가 필요 없고 **글을 다시 보내면** 적용된다.

---

## 8. 아직 확인되지 않은 것 / 알려진 한계

- 자동 시작(30분 창)·크롬 완료 알림·카테고리 불러오기의 모든 경우, 로그인 복귀 흐름의 실제 화면 확인(대부분 시험 중 정상 동작이 확인됐으나 체계적 점검은 안 됨).
- **글꼴과 제목 글자 크기는 티스토리 스킨이 정한다.** 웹 화면의 "📷 설명 (클릭하여 고화질 확대)" 이미지 설명은 웹 전용 문구라 넣지 않는다. 이미지 모양(둥근 모서리·테두리)은 업로드 직후 입히는 선택 기능이며 실패해도 입력에는 영향이 없다.
- 다른 홈주제 이름이 실제 목록과 다를 수 있다 — 오류에 표시되는 실제 목록으로 보정한다.
- 이어받을 만한 후속: 이미지 설명(캡션) 지원 여부 검토, 홈주제를 실제 목록으로 동기화하는 방법(빈 새 글에서는 불가), 공용 엔진화(`SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md` 참고 — 티스토리는 편집기가 달라 어댑터만 다름).

---

## 9. 시험·검수 명령

```bash
cd tistory-auto-blog
npm run test:extension       # 규칙·엔진·어댑터·발행 설정창·작업기·변환기 (72개)
npm run test:extension-api   # 서버 API 36개(가져가기·임대·하트비트·보내기·발행 설정 검증·기본값·관리자 표시·옛 확장 호환)
npm run test:update-banner   # 새 버전 안내 3개
npx tsc --noEmit && npm run build   # 빌드가 ZIP·manifest를 현재 버전으로 자동 생성
node ../scripts/check-extension-release.mjs tistory-auto-blog
```
- 시험은 `vm` + 가짜 chrome/DB/DOM으로 실제 코드를 실행한다(운영 DB·실제 티스토리·유료 API 없음). 새 안전 규칙·오류 수정은 **수정 전 코드에서 시험이 실패하는지** 확인하는 방식으로 만든다.
- 이 시험이 못 잡는 것: 실제 티스토리 화면의 선택자·타이밍·스킨 렌더링 → 주인님 PC 실제 시험.

---

## 10. 남은 작업

- **확인 필요(주인님 PC)**: 알림 표시 전반, 홈주제 외 목록·예약 발행 같은 덜 쓴 설정, v1.65 서식 결과의 최종 모습(주인님은 "잘되었다"고 확인).
- **장기(루트 `docs/HANDOFF.md`)**: SSO 도메인 확대, Supabase Pro 전환(2026-10-20 전), 보안 마무리(옛 키 폐기는 주인님), 저장소 비공개 전환 준비.
