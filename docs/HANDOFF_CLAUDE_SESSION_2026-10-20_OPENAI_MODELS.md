# 인수인계 — 2026-10-20 Claude Code(윈도우) 세션: SEO 스튜디오 업그레이드 · OpenAI 모델 규칙 공용화 · 모델 점검 도구

> 다른 CLI(Claude Code·Codex·agy)가 이 문서만 읽고 이어서 작업할 수 있게 정리했습니다. 작업 전에 루트 `docs/ACTIVE_WORK.md`·`docs/HANDOFF.md` 맨 위·`docs/ERROR_LESSONS.md`를 함께 확인하세요.
> 대상 DB는 모두 **① AIMaster 운영**(ref `esgxyikcnnvmlhygjkth`)입니다. Lab(②)은 건드리지 않았습니다.

---

## 0. 한눈에 보기

| 구분 | 상태 |
|---|---|
| SEO 스튜디오(`naver-blog-seo-studio`) | v1.74 → **v1.80** 배포 완료 · 일반 회원 검수 완료 |
| Threads 쇼핑제휴(`threads-affiliate-poster`) | v1.66 → **v1.71**(이 세션) 배포 완료 · 일반 회원 검수 완료. **이후 다른 CLI가 예약 공용 코드 수정으로 v1.74까지 올림**(`2428e00c`·`be5c5107` 등, 2026-10-20 재확인) |
| 공용 기준 코드 `openai-request-params` | 기준 1 + 사본 8 등록 · 검사 OK |
| 모델 점검 스크립트 `scripts/check-openai-models.mjs` + 커밋 직전 훅 | 완성 · 첫 실제 점검 완료(23개 중 17 OK) |
| **남은 일 1순위** | 타로(`tarot`)의 존재하지 않는 OpenAI 모델 6개 정리 → §3-1 (2026-10-20 재확인: 아직 6개 그대로, 타로는 작업 중 표에 없음) |

서비스 주소:

https://naver-blog-seo-studio.buylife.xyz

https://threads-affiliate-poster.buylife.xyz

---

## 1. 이 세션에서 한 일 (순서대로)

### 1-1. SEO 스튜디오 업그레이드 (v1.74 ~ v1.76)
- **v1.74**: 외부 데스크톱 앱 「네이버 블로그 SEO 최적화 도우미 6.5.4」를 새 프로그램으로 만들지 않고 흡수(정적 분석만, 코드·프롬프트 미복사). 내 실제 경험 메모·경험 질문(AI는 질문만)·자연스러운 문체·FAQ 옵션, AI 없는 「발행 전 점검」(`lib/seoQuality.ts`)·단어 빈도·모바일 미리보기. **버그 수정**: 「홈판 스토리」「인사이트 엣지」 전략이 항상 400(생성 API 허용 목록이 옛 이름). 분량 미달 시 요금만 나가던 문제 → 보강 2회·1,500자 이상 저장+분량 안내.
- **v1.75**: GPT-5·GPT-6 계열 생성 400 수정(원인: `temperature` 지정 거부) + OpenAI 거부 이유 표시. 여러 단어 키워드 점검(단어 모두 포함이면 통과). 휴대폰 목록 날짜 칸 가로 넘침 수정.
- **v1.76**: 대시보드 상태 안내 초기값이 기록이 있어도 「없습니다」로 보이던 문제.
- 상세: `naver-blog-seo-studio/AGENTS.md`(v1.74~v1.80 절) · `naver-blog-seo-studio/docs/IMPROVEMENT_HANDOFF_20261020.md` · 플랜 `naver-blog-seo-studio/docs/PLAN_20261020_SEO_HELPER_UPGRADE.md` · 원장 `docs/IMPROVEMENTS.md` #12~#18.

### 1-2. 다른 프로그램 GPT-5 계열 점검 → 쇼핑제휴 수정 (v1.67)
- GPT-5·GPT-6을 고를 수 있는 19개 프로그램의 OpenAI 호출을 점검. 온도 문제는 SEO 스튜디오 외 없음.
- **발견·수정**: `threads-affiliate-poster/src/lib/ai/generator.ts`가 `max_tokens`를 보내 GPT-5.6·GPT-6(선택지 6개)로 글 생성 시 400 → 운영 v1.66에서 재현 후 수정·재시험 성공.

### 1-3. 공용 기준 코드 `openai-request-params` (SEO v1.77~v1.80 · 쇼핑제휴 v1.68~v1.71)
- **기준**: `naver-blog-seo-studio/lib/ai/openaiRequestParams.ts` (+ 테스트 `tests/openaiRequestParams.test.mjs`, `npm run test:openai-params` 8개)
- **함수**
  | 함수 | 하는 일 |
  |---|---|
  | `openAIGenerationParams(model, { temperature, maxTokens })` | 요청 본문에 펼쳐 넣음. 추론 모델(GPT-5·GPT-6·o)은 온도 제외, 한도는 `max_completion_tokens`(최소 4000 — 생각 단계 포함) |
  | `isOpenAIReasoningModel(model)` | 추론 모델 판정 |
  | `openAIModelNotice(model)` | 「GPT-5·GPT-6 계열은 … 느릴 수 있습니다」 |
  | `openAIModelTier` / `openAIModelCostLevel` / `openAIModelBadge` | ⚡ 빠름(mini·nano·luna)·⚖️ 균형·💎 고품질(sol·astra·pro·gpt-5·o1·o3) / 💰~💰💰💰 / 「⚡ 빠름 · 비용 💰」 |
  | `openAIModelTierHint(model)` | 마우스 올리기·누르기 설명(상대 비용이며 정확한 단가 아님 포함) |
  | `openAIErrorReason(response)` | OpenAI 거부 이유를 「— OpenAI 안내: …」로 |
- **사본 8곳** (직접 고치지 말 것 — 기준만 고치고 복사, `node scripts/check-shared-modules.mjs`로 검사)
  | 사본 | 배포 상태 |
  |---|---|
  | `threads-affiliate-poster/src/lib/ai/openaiRequestParams.ts` | 배포됨(호출 2곳 + 화면 2곳 사용) |
  | `style-dna-analyzer/src/lib/ai/` · `cardnews-studio/src/lib/ai/` · `naver-blog-allinone/src/lib/blog/` · `naver-blog-agent/src/lib/ai/` · `ai-auto-blog/utils/ai/` · `tistory-auto-blog/utils/ai/` · `threads-content-ops/lib/` | **미배포**(호출부만 교체, 동작 같음). `docs/SHARED_MODULES.md` 「미배포 사본」 |
- 제외: `youtube-channel-consultant`(테스트가 `llm.ts`를 Node로 직접 불러오는 import 없는 구조), 해당 없음: `shorts-viral-studio`(온도 미전송).
- **`--sync`는 쓰지 않았음**: 다른 세션이 작업 중인 공용 모듈까지 덮어쓸 수 있어 사본은 직접 복사(`cp 기준 사본`) 후 검사만 실행.

### 1-4. 화면 안내 (SEO 3곳 · 쇼핑제휴 2곳)
- 모델 선택 칸 아래: `모델 성격: ⚡ 빠름 · 비용 💰 ⓘ`(`<details>` — 누르면 펼침, `title` — 마우스 말풍선) + GPT-5·GPT-6이면 지연 안내.
- 위치: SEO `components/studio/TitleView.tsx`(2곳)·`app/settings/AiModelSettings.tsx`, 쇼핑제휴 `src/components/posts/ProductPostForm.tsx`·`src/components/trends/ViralPostDetector.tsx`.

### 1-5. 모델 점검 도구
- `node scripts/check-openai-models.mjs` — 프로그램 코드에서 OpenAI 글 모델 수집(현재 23개)·보낼 옵션·마지막 결과(호출 없음)
- `--new` — 시험 안 했거나 실패한 모델만(키 없음, 있으면 종료 1)
- `--live` — 본인 `OPENAI_API_KEY`로 시험 안 한 모델만 1회씩 짧게 호출 → `scripts/data/openai-model-check.json` + `docs/HANDOFF.md` 맨 위 자동 한 줄(`--no-handoff`로 끔). 키 형식 검사(`sk-…`), 401·응답 전 실패는 기록 없이 중단, 오류 문구 속 키 조각 가림.
- `--staged` + **커밋 직전 훅** `scripts/git-hooks/pre-commit`(설치 `node scripts/git-hooks/install.mjs`, 윈도우 `.git/hooks/pre-commit`에 설치됨 — `.git`을 함께 쓰는 맥미니도 적용): 이번 커밋에 시험 안 한 모델 이름이 추가되면 **경고만**(커밋은 절대 막지 않음, 약 1초).

### 1-6. 첫 실제 점검 결과 (2026-10-20 10:08, 주인님 키)
- OK 17: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4o`, `gpt-4o-mini`, `gpt-5`, `gpt-5.4`, `gpt-5.5`, `gpt-5.6-luna/sol/terra`, `gpt-6-astra/luna/sol`, `gpt-6.1-sol`, `o1`, `o3`, `o3-mini`
- **실패 6(404 모델 없음)**: `gpt-5.4-luna/sol/terra`, `gpt-5.5-luna/sol/terra` — **`tarot/lib/deck.ts` `OPENAI_MODEL_OPTIONS`에만 있음**(기본값 `gpt-5.6-sol`은 정상)

### 1-7. 검수 요약
- 매 배포: tsc 0 · 테스트 통과 · build · Vercel Ready(순차 배포) · DB `programs.version` 갱신 · SEO 확장 `check-extension-release` OK(코드 변경 없어 회원 재설치 불필요).
- 크롬 실화면: 관리자 + **일반 회원(`buylifemall@naver.com`, 주인님 로그인)** 모두 확인. `gpt-5.6-luna` 실호출 성공(SEO 경험 질문 5개, 쇼핑제휴 474~490자 글). 시험 후 모델 선택은 GPT-4.1로 되돌림.
- 비용: 관리자·시험 계정 본인 OpenAI 키 짧은 호출 약 15회 + 주인님 점검 23회(짧은 호출).

---

## 2. 주요 커밋

| 커밋 | 내용 |
|---|---|
| `4d792ac5` | SEO v1.74 |
| `15bf98ad` · `a7450857` | SEO v1.75 · v1.76 |
| `1950446b` | 쇼핑제휴 v1.67(`max_tokens`) |
| `9d44bf39` | 공용 기준 코드 등록(SEO v1.77·쇼핑제휴 v1.68) |
| `28e8bf33` | 사본 7곳(미배포) |
| `deec0eb1` · `12207bc8` · `e320cc53` · `8bfe3461` | 점검 스크립트 · HANDOFF 자동 기록 · 커밋 훅 · 키 형식 검사 |
| `55ea0197` · `3bafa48c` · `06ce5206` | 모델 성격 · 설명 · 상대 비용(SEO v1.78~v1.80 · 쇼핑제휴 v1.69~v1.71) |
| `f2523dae` | 일반 회원 검수 기록 |
| `542b1948` | 첫 실제 점검 결과 |
| `f8f655b8` · `44c41f7e` | 교훈 기록 |

---

## 3. 남은 작업 (우선순위 순, 다음 첫 단계 포함)

### 3-1. 🔴 타로 존재하지 않는 OpenAI 모델 6개 정리 (회원 오류 가능)
- ✅ **처리 완료(2026-10-20 Claude Code 윈도우, 타로 v1.26, 커밋 `3d92d336`)** — 메뉴에서 6개 삭제 → `gpt-5.5`·`gpt-5.4`, 옛 링크 이름은 서버 자동 변환. `check-openai-models.mjs --new` 「17개 모두 통과」. 상세 `tarot/AGENTS.md` v1.26.
- 증상: 타로에서 회원이 GPT-5.5/5.4 Luna·Sol·Terra를 고르면 「모델 없음」 오류.
- 다음 첫 단계: `docs/ACTIVE_WORK.md`에서 `tarot` 작업 중인지 확인(이 문서 작성 시점에는 비어 있음) → `tarot/lib/deck.ts` `OPENAI_MODEL_OPTIONS`에서 6개 삭제(필요하면 `gpt-5.5`·`gpt-5.4`로 대체) → 회원이 저장해 둔 선택값(로컬 저장·DB 등)이 6개 중 하나면 기본값으로 돌리는 처리 확인 → 버전 +0.01(코드·DB) 배포 → 크롬 확인 → `node scripts/check-openai-models.mjs --new`로 남은 모델 0개 확인.
- 이 모델들이 온도·출력 한도를 어떻게 보내는지도 공용 기준 코드 사본으로 바꿀지 함께 검토.

### 3-2. 🟡 미배포 사본 7곳 — 「다음에 고칠 때 함께」 (주인님 결정)
- 각 프로그램을 다른 이유로 배포할 때: 사본·호출부 변경이 함께 나가므로 **버전 +0.01**하고 버전 기록에 적기.
- 같은 기회에 화면 안내 붙이기(주인님 결정): 모델 선택 칸 아래 「모델 성격: {openAIModelBadge(model)} ⓘ」 + `openAIModelNotice`. 붙일 파일:
  | 프로그램 | 화면 파일 |
  |---|---|
  | style-dna-analyzer | `src/app/(dashboard)/analyze/page.tsx` · `test/page.tsx` |
  | cardnews-studio | `src/components/studio/ui.tsx` · `src/app/(dashboard)/background/page.tsx` |
  | naver-blog-allinone | `src/components/blog/ModelSettingsCard.tsx` |
  | naver-blog-agent | `src/app/(dashboard)/page.tsx` |
  | ai-auto-blog · tistory-auto-blog | `app/write/ai-form/page.tsx` |
  | threads-content-ops | `app/threads-content-ops/AttentionComposer.tsx` |
- 기준 구현 참고: SEO `components/studio/TitleView.tsx`, 쇼핑제휴 `src/components/posts/ProductPostForm.tsx`.

### 3-3. 🟢 시험 못 한 것 (위험 낮음)
- GPT-5 계열로 SEO 스튜디오 **긴 원문(2,000자) 전체 생성** — 짧은 호출로 같은 경로만 확인.
- 쇼핑제휴 「글 + 이미지 한 번에 생성」·예약 발행을 GPT-5 계열로 — 이미지 비용 때문에 미시험.

### 3-4. 🟢 SEO 스튜디오 남은 제안
- 원장 #17: 원본 앱의 SNS 홍보 문구(스레드·X·페이스북)를 쓰레드 계열 프로그램과 연계.
- 점검표 경고 항목을 누르면 본문 해당 위치로 이동.
- 관리자 생성 기록의 시험 글 1건은 30일 뒤 자동 삭제(조치 불필요).

### 3-5. 새 OpenAI 모델을 목록에 넣을 때 (운영 절차)
1. 프로그램 모델 목록에 추가 → 커밋하면 훅이 경고
2. 주인님(또는 키 보유자)이 **Claude Code 밖 별도 PowerShell**에서:
   ```powershell
   cd D:\Antigravity\AIMaster
   $env:OPENAI_API_KEY = "sk-…"
   node scripts/check-openai-models.mjs --live
   ```
3. 실패면 기준 코드 규칙 수정 또는 목록에서 제외. 결과 파일·HANDOFF 줄 커밋은 **그 줄만**(아래 4번 주의).

---

## 4. 주의사항 (이 세션에서 실제로 겪은 것)

1. **공유 스테이징 섞임**: 같은 저장소에서 여러 세션이 동시에 커밋함. 미리 `git update-index`로 올려 둔 파일이 1초 뒤 다른 세션 커밋에 들어간 사례(`d06dc024`). → 스테이징은 커밋과 **같은 명령 줄**에서, 커밋 직전 `git diff --cached --name-only`가 비었는지 확인.
2. **HANDOFF 전체 커밋 금지**: `git add docs/HANDOFF.md`로 다른 세션 미커밋 기록 8줄이 섞인 사례(`542b1948`). 반대로 다른 세션이 내 자동 기록 줄을 되돌린 사례(`71f87d44`)도 있음. → `git diff --stat` 줄 수 확인, 다르면 `git show HEAD:docs/HANDOFF.md` + 내 줄만 `git hash-object -w` → `git update-index --cacheinfo`.
3. **`threads-affiliate-poster/AGENTS.md`**에는 다른 CLI의 줄바꿈 형식만 바뀐 미커밋 변경이 남아 있음 → 이 파일에 기록할 때도 위 2번 방식으로 내 줄만.
4. **키 노출**: 주인님이 결과를 붙여 넣으며 OpenAI 키가 대화에 노출됨 → 키 폐기·재발급을 권장해 둠. 결과 공유 시 `$env:` 줄은 빼도록 안내.
5. **`--sync` 주의**: `check-shared-modules.mjs --sync`는 모든 공용 모듈을 덮어씀. 다른 세션이 기준을 고치는 중이면 그 사본까지 바뀌니, 한 모듈만 바꿀 때는 직접 복사.
6. **Node로 직접 불러오는 테스트**: 테스트가 `.ts` 파일을 변환해 실행하는 프로그램(naver-blog-agent `scripts/test-model-selection.cjs`)은 새 import를 모의 불러오기에 추가해야 함(이번에 추가함).

교훈 원문: `docs/ERROR_LESSONS.md` 2026-10-20 「GPT-5·GPT-6(추론 모델)은 temperature 지정과 max_tokens를 거부(400)한다…」 항목.

---

## 5. 관련 문서

- 공용 모듈: `docs/SHARED_MODULES.md`(표 + 미배포 사본) · `docs/SHARED_FEATURE_MAP.md` §8
- 프로그램: `naver-blog-seo-studio/AGENTS.md` · `naver-blog-seo-studio/docs/IMPROVEMENT_HANDOFF_20261020.md` · `threads-affiliate-poster/AGENTS.md` · `threads-affiliate-poster/docs/IMPROVEMENT_HANDOFF_20261020.md`
- 아이디어 표: `docs/PROGRAM_IDEA_BACKLOG.md` I-22 · 역량 지도: `docs/PROGRAM_CAPABILITY_MAP.md`
