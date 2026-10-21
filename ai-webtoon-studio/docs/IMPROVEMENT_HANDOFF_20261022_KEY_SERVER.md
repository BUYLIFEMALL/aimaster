# 인수인계 — 회원 Gemini 키를 브라우저에 두지 않기 (v1.27, 2026-10-22)

> 작성: Claude Code(윈도우, 메인 계정). 대상 ① 운영 AIMaster, DB ref `esgxyikcnnvmlhygjkth`.
> 계기: 이미지 카테고리 재비교(`docs/analysis-image-consolidation-20261021/REPORT.md` §8·§9, 플랜 W2)에서 발견 → 주인님 지시 「진행하고 다른 CLI가 작업 전 참고할 수 있도록 인수인계 파일 남겨」.
> **이 프로그램(또는 같은 구조의 다른 프로그램)을 고치는 CLI는 작업 전에 이 문서를 먼저 읽어 주세요.**

## 1. 무엇이 문제였나 (v1.26까지)
| 문제 | 위치(옛 코드) | 왜 안 되나 |
|---|---|---|
| 서버가 회원 키 원문을 브라우저로 내려줌 | `GET /api/user/key` → `{ key: api_key }` | 최상위 규칙(본인 키 격리) — 브라우저 확장·공용 PC·XSS로 키가 새어 나갈 수 있음 |
| 브라우저가 그 키를 localStorage에 저장 | `StudioWorkspace.tsx` → `saveStoredSettings({ geminiApiKey })`, 키 `ai_webtoon_studio_settings_v1` | 로그아웃해도 그 PC에 키가 남음 |
| 브라우저가 키로 Gemini를 직접 호출, 글 생성은 키를 **주소(`?key=`)**에 붙임 | `lib/gemini.ts` `callGeminiText`, `lib/imageGen.ts`, `SettingsModal` 키 테스트 | 주소에 키가 남으면 기록·프록시에 노출 |
| 키 경로에 프로그램 권한 확인 없음(로그인만) | `api/user/key` GET·POST | 권한 없는 로그인 회원도 키 저장·조회 가능 |
| 설정 창 안내가 「키는 서버에 저장되지 않고 브라우저에만」 — 실제와 반대(서버+브라우저 둘 다) | `SettingsModal.tsx` | 회원에게 사실과 다른 안내 |

## 2. 바꾼 구조 (v1.27)
```
브라우저(프롬프트만) ──▶ /api/ai/text  ─┐  checkProgramAccessApi()  →  getMemberGeminiKey(user.id)  →  Gemini(x-goog-api-key 머리글)
                    ──▶ /api/ai/image ─┘  (이미지는 공용 사본 lib/geminiImage.ts 그대로, data URL로 응답 — 1K라 4.5MB 한도 안)
설정 창 ──▶ POST /api/user/key {apiKey, test:true}  키 확인만(저장 안 함)
       ──▶ POST /api/user/key {apiKey}             user_api_keys 저장(회원 본인)
화면   ──▶ GET  /api/user/key                       { hasKey: boolean } 만
```
- 새 파일: `src/lib/serverAi.ts`(`server-only`, 본인 키 읽기·글 호출), `src/app/api/ai/text/route.ts`(maxDuration 120), `src/app/api/ai/image/route.ts`(maxDuration 150, 시간 제한 120초·재시도 0 — 이중 과금 방지, 예전 값 그대로).
- 바꾼 파일: `api/user/key/route.ts`(권한 확인·등록 여부만·서버 키 확인), `lib/gemini.ts`·`lib/imageGen.ts`(키 인수 제거, 서버 경로 호출), `lib/types.ts`·`lib/storage.ts`(설정에서 키 칸 제거 + **예전 버전이 저장한 키를 첫 접속 때 지움**), `Header`·`StudioWorkspace`·`SettingsModal`·화면 4개(`apiKey` 속성 → `hasKey` 등록 여부).
- 바꾸지 않은 것: 프롬프트·모델(`gemini-2.5-flash`, `gemini-nano-banana-2.1` 1K)·무료 대체 렌더러(Pollinations) 흐름, 공용 사본 `geminiImage.ts`(기준 ai-image-studio — 직접 고치지 말 것).

## 3. 검수 결과
- 무료: tsc 0, `npm test` 22개(새 `tests/keyNotInBrowser.test.mjs` 4개 — 화면 코드에 Google 직접 호출·키 원문 설정 없음, 키 경로는 `hasKey`만, AI 경로 권한·본인 키) 통과, build.
- 배포 `ai-webtoon-studio-pvxt536dl` Ready, DB `programs.version` v1.27.
- 운영: 로그인 없이 `GET /api/user/key`·`POST /api/ai/text`·`POST /api/ai/image` 모두 401.
- 크롬(시험 회원 계정): 옛 버전처럼 localStorage에 가짜 키 값을 넣고 새로 고침 → **지워짐**(남은 값은 모델 선택뿐), `/api/user/key` → `{"hasKey":true}`, 헤더 「Gemini AI 엔진 연결」 표시, 왼쪽 위 v1.27.
- **미확인(비용)**: 서버 경로로 실제 글·이미지 생성 1회 — 승인 범위(W1·W4·W5) 밖이라 하지 않음. 다음 CLI 또는 주인님 승인 후 「시놉시스 AI 확장」 1회(글, 수 원 이하)로 확인.

## 4. 다른 프로그램에 남은 같은 패턴 (2026-10-22 저장소 검색, `.vercel/` 복사본 제외)
| 프로그램 | 남은 것 | 담당·처리 |
|---|---|---|
| `ebook-studio` | 키 원문 반환(`api/user/key` → `{key: data?.api_key}`), 브라우저 localStorage 저장, 설정 창 브라우저 직접 `?key=` 호출 | **미처리** — 이 문서 §2와 같은 방식으로 고치면 됨(별도 작업으로 주인님 확인 후) |
| `naver-blog-allinone` | 설정 창에서 브라우저가 `?key=`로 Gemini 직접 확인 | **미처리** — 블로그 통합 담당(Codex) 영역, 담당 CLI와 협의 |
| `seo-thumbnail-pro`·`website-scraper` | `.vercel/` 옛 복사본에만 있음, 현재 코드는 이미 고쳐짐 | 해당 없음 |

## 5. 다음 CLI가 지킬 것
1. 키 원문을 응답 JSON·localStorage·sessionStorage·주소(`?key=`)에 넣지 않는다. 화면에는 `hasKey`만.
2. AI 호출은 서버 경로에서 `checkProgramAccessApi()` → 본인 키(`user_api_keys`) → 머리글(`x-goog-api-key`)로. 운영자 키 폴백 금지.
3. 이미지 응답은 data URL로 돌려줄 때 Vercel 응답 한도(4.5MB)를 넘지 않게 화질을 확인(지금 1K). 2K 이상으로 올리면 저장소 업로드 + 서명 주소 방식으로 바꿀 것.
4. `geminiImage.ts`·`nanoBananaModels.ts`는 공용 사본 — 기준(ai-image-studio)만 고치고 `node scripts/check-shared-modules.mjs --sync`.
5. 재검수: `npm test`(정적 검사 포함), 크롬에서 localStorage `ai_webtoon_studio_settings_v1`에 `geminiApiKey`가 없는지.
