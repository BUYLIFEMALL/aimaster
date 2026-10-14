# AI 4컷 만화 자동화 (`four-cut-comics`) — 인수인계 (2026-10-14)

> 다른 CLI/세션은 이 문서와 `docs/DEVELOPMENT_PLAN.md`(원본 정밀 분석·전체 플랜), 루트 `docs/ERROR_LESSONS.md`를 먼저 읽고 이어서 작업한다.

## 1. 확정 사항
- **프로그램명**: AI 4컷 만화 자동화 (주인님 확정 2026-10-14, 1순위안) / slug `four-cut-comics` / 폴더 `AIMaster/four-cut-comics` / 주소 `four-cut-comics.buylife.xyz` / 시작 `v1.01`.
- **원본 참고**: https://4cut-comics-99gg.vercel.app/ (코드·브랜드는 복사하지 않고 기능만 새로 구현). 분석 결과 전부는 `docs/DEVELOPMENT_PLAN.md` §1.
- 본인 Gemini 키만 사용(폴백 금지), 이미지는 서버에 저장하지 않음, FREE 배지는 달지 않음(주인님 결정 시 관리자 화면에서), 프리미엄 후보 아님(운영자 비용 없음).
- 기본 결정값: 서버 보관함 1차 제외, 작품 보관은 브라우저 IndexedDB(v1.03).

## 2. 현재 상태 — "스캐폴딩 + 도메인 라이브러리 일부"만 있고 **빌드·배포 전**
`portrait-photo/`에서 비도메인 파일을 복사해 시작했다(권한·키·로그인·사이드바·쉘). **아래 "남은 작업"을 끝내기 전에는 `npm run build`가 실패한다**(복사본이 아직 인물사진 코드를 참조).

### 이미 작성한 파일(`src/lib/comic/`, 순수 TS·테스트 대상)
| 파일 | 내용 |
|---|---|
| `options.ts` | 스타일 4(id: meongrang/american/webtoon/ligne-claire), 장르 11(free/satire/daily/pet/touching/growth/campaign/manual/scifi/concept/language, satire만 `search`), 형식 2(single/serial), 이미지 모델 2(`gemini-3.1-flash-lite-image`·`gemini-3.1-flash-image`), 말풍선 4(simple/webtoon/narration/cinematic), 검증 함수 |
| `script.ts` | 타입(Character/Panel/Script), `extractJson`, `normalizeScript`(컷 정확히 4개), `normalizeIdeas`, `renameCharacter`(화자·대사 속 이름 함께 변경, 빈·중복 거부), `lineFor`, `showsSpeaker`, `wrapText(measure,…)` |
| `prompt.ts`(서버 전용 호출) | `buildIdeasPrompt`, `buildScriptPrompt`(연도 규칙·한국인 기본·주제 태그 격리·시사 풍자 검색 지시), `buildFollowupPrompt`, `buildCharacterPrompt`, `buildPanelPrompt` |

### portrait-photo에서 복사한 파일(그대로 재사용, 일부 문구 수정 필요)
`src/proxy.ts`, `src/app/{layout,page,login,setup,globals.css}`, `src/app/api/auth/logout`, `src/app/api/keys`(+`keys/test`), `src/app/(workspace)/{layout,settings}`, `src/components/{auth,layout,workspace}`, `src/lib/{access,aiRoute,apiKeys,auth,config,gemini,guides,programAccess,version}.ts`, `src/lib/supabase/*`, `src/lib/utils/phone.ts`, `package.json`·`tsconfig.json`·`next.config.ts`·`vercel.json`·`.gitignore`.

## 3. 남은 작업(순서대로) — v1.01
1. **치환**: `package.json` name→`four-cut-comics`·version `1.0.1`, `src/lib/version.ts`(APP_VERSION `v1.01`, APP_NAME `AI 4컷 만화 자동화`, PROGRAM_SLUG), `src/lib/access.ts`의 `THIS_PROGRAM_SLUG`, `layout.tsx` 설명, `settings/page.tsx` 문구("만화 생성에 쓸…"), `Sidebar.tsx`(1 만화 만들기만, 아이콘 Camera→예: Clapperboard, `/history` 메뉴 제거, 상단 `← 다른 프로그램 보기` 유지), `globals.css`의 `/* ---- 인물사진 스튜디오 ----*/` 아래 스튜디오 전용 스타일은 새 화면에 맞춰 교체(공통 레이아웃 CSS는 유지).
2. **`src/lib/gemini.ts` 재작성**: `import type … "@/lib/portrait/options"` 제거. `toUserError`·`AiError`·`generatePlain` 유지, 추가: `generateText(apiKey, prompt, {json?:boolean, search?:boolean, schema?})`(텍스트 모델 `gemini-flash-lite-latest`, 429/5xx 최대 2회 백오프), `generateImage(apiKey, model, parts)`(`imageConfig:{aspectRatio:"1:1"}`, `thought` 파트 제외하고 마지막 inlineData 사용, finishReason 안내). `generatePortrait`·`detectHead` 삭제.
3. **서버 라우트**(모두 `guardAi` 사용, `dynamic="force-dynamic"`+`fetchCache="force-no-store"`+`maxDuration=60`): `/api/script`(kind: `script`|`ideas`|`followup`), `/api/character`(name·description·styleId·model), `/api/panel`(description·styleId·model·sheets[] base64, 시트는 클라이언트에서 긴 변 768px로 줄여 전송 — Vercel 4.5MB 한도), 요청 검증은 `src/lib/comic/validate.ts`(옵션 id 화이트리스트, 주제 ≤2000자, 시트 ≤3장·합계 3.2MB). 시사 풍자(`search`)는 JSON schema 병용 불가 → 텍스트에서 `extractJson`, 실패 시 1회 재요청.
4. **클라이언트**: `src/lib/comic/draw.ts`(Canvas: 컷 위 대사 합성 4종 — 원본 분석 §1-4 규칙: 폰트 Noto Sans KR bold, 줄 높이 1.3, 패딩 4%, simple=하단 반투명 흰 상자, webtoon=하단 흰 둥근 상자+테두리+화자명 `#F97316`, narration=상단 `rgba(255,250,205,.9)`+`#8B4513` 테두리·가운데 정렬, cinematic=흰 글자+검은 stroke; 저장 레이아웃 grid2x2/horizontal/vertical/개별), `src/components/studio/Studio.tsx`(4단계 스테퍼: 주제 → 대본 → 등장인물 → 만화, 컷 일괄 생성·실패 컷만 재시도·다시 그리기, 이미지 모델 localStorage 기억, 키 없음 시 등록 안내 모달 — `portrait-photo`의 `needKey` 처리 참고), `(workspace)/studio/page.tsx`, `(workspace)/guide/page.tsx`(사용 매뉴얼).
5. **테스트** `tests/comic.test.mjs`(portrait와 같은 `node --import tsx --test`): 옵션 id 일관성, `normalizeScript`(3컷·빈 인물 거부), `renameCharacter`(중복·빈·예약어), `extractJson`(코드펜스), `wrapText`(긴 단어), 프롬프트에 당해 연도 포함·"말풍선 금지"·한국인 기본·주제 태그 포함, 알 수 없는 id는 null.
6. **등록**: `supabase/migrations/0001_register_program.sql`(portrait-photo 것을 복사해 slug·이름·설명 교체, `app_url=https://four-cut-comics.buylife.xyz`, `version='v1.01'`, badges `["new"]`, pricing_plans 기본 3단계(monthly/bimonthly/quarterly 1·2·3만원), 카테고리는 portrait-photo와 같은 카테고리 id `b5cec438-a6cc-43e5-83bc-59368f8a2c4d` 재사용 검토). `vercel project`/`vercel domains add four-cut-comics.buylife.xyz --scope buylife`, 환경변수는 portrait-photo 프로젝트 것을 `vercel env`로 동일 이름 복제(`NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY`·`NEXT_PUBLIC_MAIN_SITE_URL`, 값은 비밀이라 문서에 적지 않음).
7. **썸네일**: `docs/PLATFORM_PATTERNS.md` §13 템플릿 + `scripts/generate-program-thumbnail.mjs four-cut-comics <geminiUserId> "<프롬프트>"`(실사 16:9, 즉흥 프롬프트 금지, 주인님 Gemini 키 비용 발생 → 실행 전 확인).
8. **검수**: `npm test` → `npx tsc --noEmit` → `npm run build` → 커밋(명시 경로) → 푸시 → `cd four-cut-comics && vercel deploy --prod --yes --scope buylife` → `programs.version` 확인 → Chrome 로그인 화면 확인(일반 회원 `buylifemall@naver.com`, 비밀번호는 주인님이 직접) → 실호출 1세트(시트 2장+컷 4장) → 테스트 기록 정리 → 루트 `docs/HANDOFF.md`에 항목 추가(HEAD blob 방식) → `AGENTS.md` 작성.

## 4. 후속 버전(요약, 상세는 DEVELOPMENT_PLAN §6)
- v1.02 AI 자동 말풍선(완성 컷을 텍스트 모델에 보내 JSON: 빈 영역 0~1000, 화자 입 위치, speech/thought/shout) + 직접 배치 편집 / v1.03 인스타 문구·이어서 만들기(단편·계속·완결)·만화 합치기·내 작품(IndexedDB 20개) / v1.04 스타일·컷 수·비율·서버 보관함.

## 5. 주의
- 이 폴더는 아직 **커밋만 되어 있고 배포·DB 등록·썸네일 모두 미완료**다. `programs`에 `four-cut-comics`는 없다(2026-10-14 기준).
- 원본의 모델 ID(`gemini-3.1-*`)는 계정마다 열려 있지 않을 수 있다 → 연결 테스트 결과에 맞춰 `IMAGE_MODELS`를 조정.
- 공식 서류·저작권 이슈 없음(창작 만화). 단, 실존 인물·유명인 풍자 대본은 안전 필터에 걸릴 수 있어 안내 문구를 둔다.
- 다른 CLI가 동시에 같은 저장소를 쓴다: 스테이징은 커밋 직전, `git add` 명시 경로만.

---
## 6. 진행 상황 업데이트 (2026-10-14 후반) — v1.01 코드·등록·배포 완료, 운영 검증·썸네일 남음
**위 §2·§3의 1~6번은 끝났다.** 아래가 실제 현재 상태이며 §2의 "빌드 전"·§5의 "미배포·미등록" 문구는 낡았다.

### 완료
- 치환·재작성: `version.ts`(v1.01), `access.ts`(slug), `package.json`(1.0.1, 포트 3031), `Sidebar`(만화 만들기·API키·매뉴얼), `settings` 문구, `layout` 설명.
- 서버: `src/lib/gemini.ts`(텍스트 `gemini-flash-lite-latest`, 이미지 1:1, 재시도 2회, 오류 한글화), 라우트 `/api/script`(ideas·script·followup, 시사 풍자만 검색 근거), `/api/character`, `/api/panel`(시트 ≤3장·각 1MB base64), `src/lib/comic/validate.ts`. 모두 `guardAi`(권한+본인 키), 이미지·입력 서버 비저장.
- 클라이언트: `src/lib/comic/draw.ts`(심플·웹툰·나레이션·시네마틱 합성, 바둑판·가로·세로·개별 저장, 시트 768px 축소·교체 업로드), `src/components/studio/Studio.tsx`(4단계: 주제→대본 편집(이름 변경 연동)→캐릭터 시트(재생성·교체)→컷 일괄/개별 생성·저장), `/studio`·`/guide` 페이지, CSS(`.cc-*`).
- 테스트 `tests/comic.test.mjs` 7건 통과, `tsc` 정상, `npm run build` 정상.
- **DB 등록 완료**(공용 Supabase): `programs`(id `d39acd06-6ee9-4d6f-924a-82382eb8e146`, slug `four-cut-comics`, v1.01, app_url `https://four-cut-comics.buylife.xyz`, badges `["new"]`, 카테고리·최소 등급은 portrait-photo와 동일), `pricing_plans` 3단계, VIP 등급 접근. 마이그레이션 `supabase/migrations/0001_register_program.sql`(설명 본문은 운영 DB가 정본).
- **Vercel**: 프로젝트 `four-cut-comics`(buylife 팀) 생성·`.vercel` 링크, 환경변수 4개(`NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY`·`NEXT_PUBLIC_MAIN_SITE_URL`)를 `scripts/add-four-cut-comics-vercel-env.mjs`로 등록, 도메인 `four-cut-comics.buylife.xyz` 연결, 프로덕션 배포 READY, 미로그인 `/studio` → `/login` 307 확인.

### 2026-10-14 저녁 완료 (Claude Code 보조 계정, 엣지)
- **운영 화면 검수 통과**: 엣지에서 일반 회원 `buylifemall@naver.com`(본인 Gemini 키)으로 `https://four-cut-comics.buylife.xyz/studio` 실호출 — 주제 "출근길 지하철에서 우산을 두고 내린 직장인" → 대본(등장인물 1명·한국인 묘사·4컷) → 캐릭터 시트 1장 → 기본 모델 `gemini-3.1-flash-lite-image`로 4컷 일괄 생성(약 30초, 캐릭터 일관·한글 대사 합성 정상) → 1컷 [다시 그리기] `/api/panel` 200. 콘솔 오류 없음. 서버 저장이 없어 정리할 테스트 데이터 없음. **미확인**: 저장 버튼(바둑판·가로·세로·개별) 실제 파일 다운로드, `Nano Banana 2`(`gemini-3.1-flash-image`) 모델, 등장인물 2명 이상, 모바일 폭.
- **썸네일 등록**: `scripts/generate-program-thumbnail.mjs`(관리자 키 1회, `gemini-3-pro-image-preview`) → `program-images/catalog/four-cut-comics-thumbnail.jpg`, 공개 주소 200, 메인 상세 화면 표시 확인. 기록 SQL `supabase/migrations/0002_thumbnail.sql`. 코드 변경이 없어 버전은 v1.01 유지.
- 루트 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md` 기록 완료(아래 §7 반영).

### 남은 일 (다음 계정이 이어서)
1. 위 "미확인" 항목(저장 다운로드·Nano Banana 2·다인물·모바일)은 v1.02 작업 때 함께 확인한다.
2. **버전 규칙**: 이후 수정마다 `src/lib/version.ts`+`package.json`+`programs.version`을 +0.01.
3. **v1.02**: AI 자동 말풍선(완성 컷을 텍스트 모델에 보내 JSON: 빈 영역 0~1000·화자 입 위치·speech/thought/shout) + 직접 배치 편집(이동·크기·회전·꼬리·모양·색, 터치) + 재배치. **v1.03**: 인스타 문구, 이어서 만들기(단편·계속·완결 — `/api/script` `followup`은 이미 구현, UI만 필요), 만화 합치기, 내 작품(IndexedDB 20개). **v1.04**: 스타일·컷 수·비율·서버 보관함.
4. (완료 2026-10-14) 루트 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md` 기록.

## 7. 이번 작업에서 배운 점(ERROR_LESSONS에 옮김, 2026-10-14)
- 이 환경의 Bash 도구는 한글+작은따옴표가 섞인 긴 heredoc을 "unexpected EOF"로 거부한다 → 파일은 Write/Edit 도구로 만들고, Bash는 짧은 명령만 쓴다.
- PowerShell 5.1에서 `Get-Content`/`Set-Content -Encoding utf8`로 한글 소스를 치환하면 인코딩이 깨져 TSX가 망가진다 → 치환은 Edit 도구나 node 스크립트로 한다.
- 일본 외무성(`mofa.go.jp`)은 curl·WebFetch가 403이라 로그인된 Chrome(`claude-in-chrome`)으로 열어야 읽힌다.
- `vercel link --yes --project <새이름>`이 프로젝트를 자동 생성하고 `.env.local`을 만든다(`.gitignore`의 `.env*`로 제외됨).
