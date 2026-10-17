# GEMINI.md

> **★★★ 개발 대화 규칙 (최상단 고정, 모든 CLI 공통) — 진행 과정·현재 진행 중인 내용은 반드시 한글로 표시 (2026-10-17 주인님 지시 — 개발 핵심 지침 맨 위 고정, 모든 규칙보다 먼저 읽는다)**
> **최종 보고뿐 아니라 작업 도중 보여 주는 모든 문장 — "지금 하고 있는 일·다음 단계" 안내, 도구 호출 사이의 짧은 설명, 명령 실행 설명(description) — 을 쉬운 한글 존댓말로 쓴다.** 영어는 전문 용어(파일 경로·함수명·API·라이브러리명·프로그램 링크 등 영어로만 표현되는 것)에만 쓴다. 영어 문장으로 진행 상황을 보여 주지 않는다(주인님이 읽기 어려움). **단, 실행 명령어·소스 코드·프로그램 실행 결과(출력)·로그는 원래대로 영어 그대로 둔다** — 한글로 쓰는 대상은 에이전트가 쓰는 설명 문장뿐이다(2026-10-17 주인님 보충 지시). 긴 작업 중간에 영어로 흐트러지기 쉬우니 매 안내 문장을 보내기 전에 한글인지 확인한다. 예: "다음은 문서 정리와 커밋입니다.", "배포했습니다. 이제 크롬에서 화면을 확인하겠습니다."

> **★★★ 코딩 행동 원칙 — karpathy 4원칙 (2026-10-17 주인님 지시, Claude Code·Codex·Antigravity 세 CLI 공통)**
> 아래 4원칙(Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution)은 `CLAUDE.md` 「불변의 핵심 원칙」 맨 앞과 같은 내용이며, Claude Code에는 `andrej-karpathy-skills` 플러그인으로도 설치돼 있다. Codex(`AGENTS.md`)·Antigravity(`GEMINI.md`)는 플러그인을 읽지 못하므로 이 블록으로 같은 원칙을 적용한다. 원문을 고칠 때는 세 파일(`CLAUDE.md`·`AGENTS.md`·`GEMINI.md`)을 함께 고친다.

<!-- KARPATHY_GUIDELINES_20261017 -->
## 코딩 행동 원칙 (karpathy guidelines)

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
<!-- /KARPATHY_GUIDELINES_20261017 -->

> **테스트 비용 규칙(2026-10-17 주인님 지시):** 테스트할 때는 진행 가능한 가장 저렴한 모델로 최소 호출만 한다. 퀄리티(품질) 테스트나 특정 기능 구현에 꼭 필요하면 상위 모델을 써도 되며, 이유·모델·횟수를 기록한다. 상세: [`docs/TEST_COST_POLICY.md`](docs/TEST_COST_POLICY.md)

> **생성 데이터도 회원 본인 소유로 격리하며 다른 회원과 공유·복사·재사용하지 않는다.** 분석 결과·회사 조사 정보·수집 결과·본문·이미지·임시 캐시는 회원별로 저장하고 생성일 기준 **30일 후 자동 삭제**한다. 비용 절감·공개 회사정보라는 이유로 전역 생성 캐시나 관리자 공용 생성 데이터 예외를 만들지 않는다. DB 기반 시설은 기존 AIMaster 공통 Supabase를 유지하되 모든 회원 데이터에 소유자 조건·RLS·회원별 저장 경로를 적용한다. 계정·API 키·회원 권한·결제·환경설정은 생성 콘텐츠와 구분한다.

<!-- CLI_COLLABORATION_REVIEW_20261017 -->
> **★★★ 최상위 공통 협업 규칙 — 다른 CLI 작업과 차이가 있을 때 (2026-10-17 주인님 지시)**
> **다른 CLI가 작업한 내용과 내가 작업한 내용이 다르면, 먼저 양쪽의 목적·최신 지시·변경 차이·검수 근거를 비교하고 가장 나은 방향을 선택한다.** 내가 작성했다거나 더 최근이라는 이유만으로 우선하지 않는다. 기존 작업을 대체해야 하거나 양쪽 의도가 충돌해 판단이 어려우면 **기존 작업을 건드리지 않고 보존한 채 주인님께 차이·영향·추천 방향을 설명하고 확인받은 뒤 진행한다.** 합리적 근거로 선택할 수 있는 호환 가능한 보완은 승인된 범위에서 진행하고 비교·선택 이유를 인수인계에 남긴다.
> 같은 폴더 동시 작업 금지와 ACTIVE_WORK 확인을 지킨다. 공유 문서·미커밋 파일·스테이징의 다른 CLI 내용을 덮어쓰거나 전체 reset/stash/checkout으로 정리하지 않는다. 커밋 직전 최신 HEAD·파일 차이·스테이징 목록을 다시 확인하고 본인 변경만 포함한다. 완료·미완료·충돌 여부·판단 근거·다음 첫 단계와 프로그램 링크를 프로그램별 문서와 루트 HANDOFF에 남긴다. 상세: [CLI 공동작업·차이 검토 지침](docs/CLI_COLLABORATION_RULES.md).
<!-- /CLI_COLLABORATION_REVIEW_20261017 -->

> **★★★ 이미지 생성 레퍼런스 규칙 — AI 이미지 자동화(ai-image-studio)를 기준으로 개발 (2026-10-17 주인님 지시, 모든 CLI 공통)**
> **AI 이미지 자동화(`ai-image-studio/`, https://ai-image-studio.buylife.xyz)는 이미지 모델 연동의 레퍼런스(기준) 프로그램이다.** 최신 이미지 모델과 연동할 수 있는 다양한 모델은 이 프로그램에 먼저 구현·유지한다. **다른 프로그램을 개발·업그레이드하면서 이미지 생성·편집 기능을 만들거나 고칠 때 참고하는 범위는 모델·엔드포인트·호출 방식·대기 시간·생성된 이미지를 받아오는 부분(`lib/providers/adapters/*.ts` 등)뿐이다** — 새로 짜거나 구형 모델을 쓰지 않는다. **이미지 생성 프롬프트(생성 방식·스타일·내용)는 프로그램마다 컨셉이 다르므로 공유·복사하지 않고 각 프로그램 고유의 것을 유지한다(2026-10-17 주인님 정정).** 프롬프트를 새로 만들거나 고칠 때는 [`docs/IMAGE_PROMPT_RULES.md`](docs/IMAGE_PROMPT_RULES.md)(이미지 생성 프롬프트 생성 규칙)를 따른다. 모델이 종료·교체되면 ai-image-studio를 먼저 갱신하고, 같은 모델을 쓰는 프로그램은 **연동 부분만** 함께 교체한다(예: 2026-10-17 Imagen 3 종료 → `gemini-nano-banana-2.1`, 전체 교체 현황 `docs/IMAGE_MODEL_AUDIT_20261017.md`). 교체 후 실제 이미지 생성 시험은 비용 때문에 일괄로 하지 않고, 프로그램 사용 중 이미지 생성 오류가 나거나 필요할 때 그때 테스트 검증한다. 테스트 비용 규칙과 회원 본인 키 원칙은 그대로 적용한다.

> **★★★ 공용 기준 코드 규칙 — 비슷한 프로그램의 같은 기능은 기준 코드 하나로 맞춘다 (2026-10-17 주인님 지시, 모든 CLI 공통)**
> **비슷한 류의 프로그램끼리 같은 기능이 있으면, 「기준」 코드 하나를 정하고 나머지 프로그램은 그 사본을 그대로 가져다 쓴다. 기준을 고르는 순서는 ① 자동화 프로그램의 안정성 ② 유지보수 용이성이다(2026-10-17 주인님 확정).** **프로그램을 수정하거나 새로 만들기 전에 [`docs/SHARED_FEATURE_MAP.md`](docs/SHARED_FEATURE_MAP.md)(기능별 프로그램 지도)에서 기준 코드가 있는지 먼저 확인하고, 있으면 사본으로 가져다 쓴다.** 기준 파일만 고치고 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영한 뒤, **사본을 쓰는 다른 프로그램도 함께 고쳐 정상 동작하게 하고**(연결 코드 포함) 프로그램마다 테스트·빌드·배포·버전 +0.01. **단, 재배포는 등급을 나눈다(2026-10-18 비용 절감 지시)**: 회원에게 바로 영향이 있는 버그·이중 과금·보안 수정만 사본 전체를 즉시 배포하고, 문구·주석·내부 정리처럼 급하지 않은 변경은 사본을 저장소에 반영만 해 두었다가 그 프로그램을 다음에 배포할 때 함께 내보낸다(미배포 목록은 `docs/SHARED_MODULES.md`). **그 과정과 결과는 완료 보고서에 프로그램별로 항상 남긴다**(하나라도 실패하면 완료 아님). 프로그램끼리 서로 호출하지 않고(각자 폴더 안 사본으로 독립 배포), 메뉴·화면·회원 사용 방식은 바꾸지 않으며 안쪽 엔진만 맞춘다. 회원 본인 키 원칙은 그대로이고, 이미지 프롬프트의 내용·스타일은 공용화하지 않는다. 등록 목록·절차·공용화 후보(이미지 생성·프롬프트 틀·외부 데이터 수집): [`docs/SHARED_MODULES.md`](docs/SHARED_MODULES.md). 첫 사례: `youtube-golden-engine`(채널 컨설턴트 기준 → VIRAL FINDER 사본).

> **★★★ 공용 모듈 작업 필수 점검 (2026-10-17 주인님 지시, 모든 CLI 공통 — 신규 개발·유지보수 때 항상 확인)**
> ① 기능을 만들거나 고치기 전에 [`docs/SHARED_FEATURE_MAP.md`](docs/SHARED_FEATURE_MAP.md)에서 기준 코드를 먼저 찾는다. ② 사본 파일은 직접 고치지 않는다 — 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`, 프로그램만 다르게 해야 하면 호출하는 쪽에서 덮어쓴다. ③ 기준을 고치면 사본을 쓰는 **모든** 프로그램을 테스트하고, 배포는 등급제 — 급한 수정(버그·이중 과금·보안)은 즉시 전체 배포·버전 +0.01(코드+DB), 급하지 않은 변경은 다음 배포 때 함께(완료 보고에 프로그램별 표). ④ 이미지 프롬프트는 공용화하지 않는다(공용은 모델·주소·호출·대기 시간·이미지 받기까지). ⑤ `timeoutMs × (retries+1)` + 앞뒤 작업이 Vercel 300초 안인지 계산하고, 유료 생성은 이중 과금을 막기 위해 `retries: 0`을 검토한다. ⑥ 공용 오류는 각 프로그램의 기존 오류 형식으로 바꿔 던진다. ⑦ 기존 테스트가 요청 본문 모양·모델 이름을 검사할 수 있으니 기대값만 고친다(지우지 않음). ⑧ 확장이 있으면 manifest·ZIP·DB 버전을 함께 맞춘다. ⑨ 연속 배포 로그의 실패 판정은 `vercel inspect`로 재확인한다. ⑩ 버전은 `v1.99 → v2.00`. 전체 점검표·실제 적용값·남은 묶음: [`docs/SHARED_MODULE_CHECKPOINTS.md`](docs/SHARED_MODULE_CHECKPOINTS.md).

> **★★★ 배포 비용 절감 규칙 (2026-10-18 주인님 지시, 모든 CLI 공통 — Vercel 빌드 비용이 크게 나와 작업 방식을 바꿈)**
> **빌드 1번이 곧 비용이다.** ① **같은 날 같은 프로그램은 한 번만 배포** — 연달아 나오는 개선은 모아서 한 번에. ② 배포 전에 로컬에서 먼저 확인(`npx tsc --noEmit`·테스트·필요하면 `npm run build`, 로컬은 무료)해 Vercel 빌드 실패로 다시 배포하는 일을 줄인다. ③ 공용 기준 코드는 **급한 수정만 즉시 전체 재배포**, 나머지는 다음 배포 때 함께(위 공용 기준 코드 규칙). ④ 여러 폴더 연속 배포는 직전 배포 이후 **실제로 바뀐 폴더만**, 폴더마다 배포 직전에 작업 중 표를 다시 확인. ⑤ 루트(`.`) 메인 사이트 배포는 메인 사이트 코드나 루트 `public/downloads` 파일이 바뀐 때만 — 메인 사이트는 GitHub 푸시 자동 빌드가 있지만 `scripts/vercel-ignore-build.sh`가 메인 사이트 파일이 안 바뀐 푸시·`master` 외 브랜치는 건너뛴다. ⑥ 빌드 머신은 팀 전체 **Basic**(주인님 설정, Elastic은 쓰지 않음). 빌드가 `JavaScript heap out of memory`로 실패하면 먼저 그 프로그램 빌드 명령의 Node 메모리 한도를 올리고(`node --max-old-space-size=6144 ./node_modules/next/dist/bin/next build`), 그래도 안 되면 주인님께 알려 그 프로젝트만 상위 등급으로 올린다(Basic·Standard는 메모리가 같은 8GB). 상세·현황: [`docs/VERCEL_COST_REDUCTION_PLAN.md`](docs/VERCEL_COST_REDUCTION_PLAN.md).

> **★★★ 개발작업 최상단 공통 지침 — CLI별 역할 분담 (2026-10-16 주인님 지시)**
> **Antigravity CLI(agy)·Codex·Claude Code는 AIMaster 메인 사이트와 모든 서브 자동화 프로그램의 개발·유지보수에 협업한다. Codex의 주력 역할은 개발 기획·시스템 설계·코드 오류 수정·디버깅·테스트이며, 주인님 요청 시 신규 프로그램 개발도 수행할 수 있다.** **Claude Code의 주력 역할은 복잡한 코드 구현·기능 추가·리팩터링이다.** Antigravity CLI의 세부 주력 역할은 주인님이 별도로 지정하기 전까지 각 요청의 작업 배정에 따른다(임의로 전담 영역을 정하지 않는다). 역할은 주력 업무 구분이며 공통 지침·검수·인수인계·배포 책임을 면제하지 않는다. 같은 서브프로그램 동시 작업 금지와 시작 전 ACTIVE_WORK 확인을 지키고, 변경·발견한 개선사항은 프로그램별 문서에 남겨 다음 CLI가 이어서 작업할 수 있게 한다. 상세: [공통 개발 방식의 CLI 역할 분담](docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md).

> **★★★ 개발작업 최상단 공통 지침 — 작업결과·프로그램 링크·특이사항·개선사항 기록 의무 (2026-10-16 주인님 지시)**
> **모든 작업이 끝날 때마다 채팅 결과 보고와 저장소 인수인계 문서에 작업 결과 및 해당 프로그램의 실제 서비스 링크를 반드시 함께 남긴다.** 완료 내용·검수 결과와 한계·버전·커밋/푸시·배포 결과·남은 작업을 적고, 프로그램 링크는 클릭 가능한 단독 줄로 제공한다. 미배포이면 미배포 상태와 확인 가능한 주소를 구분한다. 작업 중 발견한 특이사항·오류·개선 필요사항은 즉시 프로그램별 문서에 기록하고, 다음 CLI가 읽고 재개할 수 있도록 근거·처리 상태·주의사항·다음 첫 단계를 남긴다.
> **모든 CLI는 작업 중 발견한 특이사항·오류·기능·성능·편의성·디자인 개선사항을 해당 프로그램 서브폴더의 `docs/IMPROVEMENTS.md`에 즉시 기록한다.** 작업 종료·중단·이관 시 같은 폴더에 `docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`를 남기고 `AGENTS.md`/`README.md`에서 연결한다(같은 날짜면 기존 문서에 추가하거나 작업별 접미사 사용). 발견 근거·영향·우선순위·처리 상태·관련 파일·남은 작업·다음 첫 단계·검수 방법을 적어 다른 CLI가 이어서 작업할 수 있게 한다. **미구현 제안을 완료로 표시하거나 기록만으로 구현 승인을 받은 것으로 간주하지 않는다.** 루트 `docs/HANDOFF.md`에는 프로그램별 문서 링크와 요약을 남긴다. 상세·기록 양식: [`docs/IMPROVEMENT_HANDOFF_POLICY.md`](docs/IMPROVEMENT_HANDOFF_POLICY.md). 메인 앱 개선사항은 루트 `docs/`에 기록한다.

> **★★★ Antigravity(Gemini) / Codex 브라우저 작업테스트 지정 — Microsoft Edge(엣지) 전용 및 포그라운드(화면 노출) 필수 (2026-10-16 및 2026-10-17 주인님 지시)**
> **Antigravity(agy)와 Codex는 앞으로 프로그램 개발, 디버깅, 화면 확인, 실제 회원 테스트 등 모든 브라우저 작업테스트 시 Microsoft Edge 브라우저만 전용으로 사용하며, 반드시 주인님이 직접 보실 수 있도록 실제 창이 화면에 열리는 포그라운드(headless: false)로 진행한다.**
> Chrome은 메인 Claude Code 전용이므로 충돌 방지를 위해 사용하지 않는다. 화면 확인이 필요할 때뿐만 아니라 자동 검수 시에도 Edge 실제 창을 화면에 포그라운드로 띄워 검수 과정(접속, 메뉴 이동, 반응형 뷰)을 주인님이 실시간으로 확인하실 수 있게 하고, 검수 완료 후에도 실제 브라우저 창을 띄워 유지한다.
> **두 PC 멀티 작업(2026-10-16)**: 윈도우 PC와 맥미니 모두 Antigravity·Codex·Claude Code가 등록돼 동시에 작업할 수 있다. 맥미니에서 실행 중이면 [`docs/MAC_MINI_WORK_GUIDE.md`](docs/MAC_MINI_WORK_GUIDE.md)를 먼저 읽고, 브라우저는 그 장비의 엣지만 쓴다(크롬은 Claude Code 전용). 규칙 원문: `CLAUDE.md` 원칙 18. **작업 순서·맥미니에서 할 일/윈도우에 요청할 일·커밋 방법은 [`docs/MAC_MINI_AGENT_PLAYBOOK.md`](docs/MAC_MINI_AGENT_PLAYBOOK.md)를 따른다(2026-10-17 주인님 지시). 맥미니 Edge는 2026-10-17 기준 미설치 — 설치 전 화면 검수는 주인님께 설치 요청 또는 맥미니 Claude Code·윈도우에 요청.**
> **★★★ 동시 작업 금지(2026-10-16)**: 같은 서브프로그램을 다른 CLI와 동시에 작업하지 않는다. 시작 전 [`docs/ACTIVE_WORK.md`](docs/ACTIVE_WORK.md)·`git status`·`docs/HANDOFF.md`로 다른 CLI의 작업 중 여부를 확인하고 비어 있을 때만 시작, 끝나면 작업 내용·인수인계 문서를 남긴다. 원문: `CLAUDE.md` 최상단.
> **★★★ 계정 고정(2026-10-16)**: 관리자 계정은 항상 `buylifemall@gmail.com`, 일반 회원 테스트 계정은 항상 `buylifemall@naver.com`. 회원 기능 검수는 테스트 계정으로 실제 로그인해서 한다(비밀번호는 주인님이 직접). 원문: `CLAUDE.md` 최상단.
> **★★★ 디자인 작업 메인지침 및 템플릿화 의무 (2026-10-16 주인님 지시)**: 모든 웹 서브프로그램의 UI/UX 디자인 작업 시 루트 최상단 [`DESIGN.md`](DESIGN.md)와 [`docs/PROGRAM_DESIGN_STANDARD.md`](docs/PROGRAM_DESIGN_STANDARD.md)를 필독하고 준수한다. 작업 내용을 템플릿화하여 "○○○ 스타일 템플릿"으로 고유 명명하고 `DESIGN.md` 카탈로그에 등록하며, 각 프로그램 폴더에 `docs/DESIGN_HANDOFF.md` 및 `docs/IMPROVEMENTS.md`를 필수로 작성해 남긴다. **디자인 리뉴얼 착수 전 프로그램 분석 플랜 및 개선사항 인수인계서 작성을 의무화**하며, **작업 중 매뉴얼 메뉴가 없거나 가이드 페이지가 없는 프로그램을 발견하면 기본적으로 좌측 사이드바에 매뉴얼 메뉴 추가 및 단계별(Step-by-Step) 구조의 비주얼 사용 매뉴얼 구축을 필수 진행**한다. **작업 완료 후에는 항상 결과와 「추가개선 제안」(해당 프로그램 및 타 프로그램 탐색 제안)을 항목별로 정리하고 프로그램 실제 배포 링크를 제공하며 프로그램별 폴더에 인수인계 문서를 반드시 남긴다.** **디자인 리뉴얼 작업완료 보고 시 타 프로그램 탐색 기반 추가개선 제안 리포팅 의무(2026-10-17 주인님 지시)**: 완료된 프로그램 외에도 다른 서브프로그램들을 둘러보며 발견한 개선점과 고도화 제안을 결과 보고 및 해당 프로그램 `docs/IMPROVEMENTS.md`에 필수 기록한다. **「추가개선 제안」 필수 3대 항목**: 1) 프로그램 로직 및 기능 개선, 2) 사용자 인터페이스/UI 가독성, 사용편리성 개선, 3) 현재 만들어져 있는 다른 자동화 프로그램과의 연계가능한 기능. **프로젝트 제안 및 보고 시에는 DB(`programs.app_url`)와 Vercel 공식 도메인을 사전 확인하여 클릭 가능한 단독 줄 마크다운 하이퍼링크로 제공하며, 표 안 <br> 사용으로 찌그러지는 링크를 금지한다.** **작업 종료 즉시 `DESIGN.md` 상태를 반드시 「✅ 1차 작업완료 (`vX.YY`, 템플릿명)」로 갱신하고 `docs/ACTIVE_WORK.md`의 작업 중 행을 삭제한다.** **하나의 자동화 프로그램 안의 모든 페이지(/studio, /projects, /guide 등)는 반드시 동일한 배경색상과 통일된 디자인 템플릿 테마 스타일로 일관되게 구축해야 한다.** 검수는 Edge 전용.
> **★★★ 개발작업 최상단 공통 지침 — 단일 작업 순차 진행 원칙 (2026-10-16 주인님 지시)**: 주인님께서 작업을 보이는 대로 연속해서 올리시더라도, 여러 작업을 섞지 않고 반드시 하나씩 순서대로 [플랜 → 구현 → 빌드/검증 → 배포 → 실세션 엣지 검수 → 인수인계/커밋/푸시] 완료 후 다음 작업으로 넘어간다.

> **★★★ 모든 프로그램별 루트 문서 규격화 및 기능·로직·아이디어·버전 히스토리 기록 의무 (2026-10-17 주인님 지시)**: **각각의 모든 프로그램 폴더 루트(`AGENTS.md` 및 `README.md`)에는 다른 CLI 프로그램이 읽고 언제든지 검토 후 추가 개발·개선작업을 즉시 진행할 수 있도록 아래 7대 핵심 항목을 상세히 정리해서 남겨놓아야 한다**: 1) 프로그램의 사용목적 및 대상, 2) 개발 구현에 사용된 도구/개발기법/플러그인/스킬, 3) 핵심 기능 및 시스템 로직/아키텍처, 장점 및 단점, 4) 현재 버전 및 버전별 변경 히스토리, 5) 남아 있는 추가 프로그램 및 디자인 작업 대기 내용(`docs/IMPROVEMENT_BACKLOG.md`), 6) 기존 다른 프로그램과의 연계/기능 병합 제안 및 기능 보완/확장 아이디어 제안, 7) 사용자 편의성 증대를 위한 디자인 UI개선안과 레이아웃/테마/스타일 변경 제안.
> **★★★ 프로그램 서브폴더별 필수 인수인계 문서 6종 완비 및 타 CLI 연속작업 보장 의무 (2026-10-17 주인님 지시 — 핵심 고정 지침)**: **어떤 서브프로그램이든 개발·디자인·오류수정·리뉴얼 작업이 끝나면, 다른 AI CLI(Antigravity `agy`, Claude Code, Codex)가 언제든 바로 이어서 개발할 수 있도록 해당 프로그램 서브폴더 안에 아래 6종의 규격화된 인수인계 문서를 누락 없이 필수로 남겨야 한다**: 1) `AGENTS.md` (7대 핵심 항목 완벽 규격화), 2) `README.md`, 3) `docs/IMPROVEMENTS.md` (필수 3대 항목 및 타 프로그램 탐색 제안), 4) `docs/IMPROVEMENT_BACKLOG.md` (대기 체크리스트), 5) `docs/DESIGN_HANDOFF.md` (디자인 개발완료 보고서), 6) `docs/PLAN_YYYYMMDD_*.md` (사전 개발 플랜 원본). ※ 루트의 `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 3대 현황판 동시 동기화 필수.

> **★ 호칭 및 수시 작업 확인(2026-10-16 주인님 지시)**: Antigravity CLI는 앞으로 **`agy`**라고 부른다(문서·대화·인수인계에서 같은 뜻). 프로그램별 디자인 리뉴얼 등은 계획표 없이 필요할 때마다 시키므로, **agy는 새 작업을 시작할 때마다** `git pull --rebase` 후 [`docs/ACTIVE_WORK.md`](docs/ACTIVE_WORK.md)·`docs/HANDOFF.md` 맨 위·대상 폴더 `git status`를 직접 확인하고, 다른 CLI가 작업 중이면 시작하지 않고 주인님께 알린다.

Gemini CLI(Antigravity)가 이 저장소(AIMaster)에서 작업할 때 읽는 안내 파일이다. 규칙은 다른 CLI와 똑같다 — 새로 만들지 않고 아래 문서를 그대로 따른다.

1. 루트 [`CLAUDE.md`](CLAUDE.md) — 저장소 불변의 핵심 원칙들과 작업 규칙의 원문(Claude 전용이 아니라 모든 CLI 공통 메인 지침).
2. 루트 [`AGENTS.md`](AGENTS.md) — 같은 규칙의 요약과 프로그램 목록·교훈.
3. **작업 시작 전 반드시**: [`docs/HANDOFF.md`](docs/HANDOFF.md)(멈춘 일·남은 일·다른 CLI가 작업 중인 폴더)와
   [`docs/ERROR_LESSONS.md`](docs/ERROR_LESSONS.md)(에러 해결 기록·작업 전 점검 체크리스트)를 읽는다.
4. 작업 중 에러를 해결했거나 중요 점검 사항을 찾으면 `docs/ERROR_LESSONS.md`에 같은 커밋으로 추가한다(핵심 원칙 7번).
5. 고칠 서브프로젝트의 `<프로그램명>/AGENTS.md`·`README.md`를 먼저 읽는다. 답변은 쉬운 한글 존댓말로 한다. 진행 과정·현재 진행 중인 내용(중간 안내·명령 설명)도 전문 용어 외에는 한글로 표시한다(2026-10-17 주인님 지시).
6. **디자인 업그레이드 및 템플릿화 의무(2026-10-16 주인님 지시, 2026-10-17 제안항목 규격화)**: UI/UX 디자인 작업 시 연동/사용 매뉴얼 비주얼화(이미지, 사진, 캐릭터, 다이어그램, 이모티콘)를 준수하고, 작업한 디자인 내용을 템플릿화하여 고유 명칭(예: `사이버 네온 다크 콘솔 스타일`, `포커스 스튜디오 스타일` 등)을 정해 명시한다. 사용된 프로그램에 어떤 디자인 템플릿이 적용되었는지 `docs/PROGRAM_DESIGN_STANDARD.md` 카탈로그와 해당 프로그램 `AGENTS.md`/`docs/DESIGN_HANDOFF.md`에 기록하여, 나중에 다른 프로그램에서 해당 템플릿 스타일로 변경 요청 시 바로 참고하여 이식할 수 있도록 인수인계 문서(`docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`)를 남긴다. **특히 디자인 리뉴얼 착수 전 프로그램 분석 기반 개발플랜 및 개선사항 인수인계서를 해당 서브프로그램 docs에 반드시 먼저 작성**하고, **매뉴얼 메뉴/가이드 페이지 미구현 발견 시 기본적으로 매뉴얼 메뉴 추가 및 단계별(Step-by-Step, 4~5단계) 사용 매뉴얼 페이지를 전면 구축**하며, **작업 완료 후에는 작업 내용과 「추가개선 제안」(해당 프로그램 및 타 프로그램 탐색 제안)을 항목별로 정리하고 배포 링크를 남기며 프로그램별 인수인계 문서를 필수 저장**하여 다른 CLI가 이어받을 때 흐름이 끊기지 않도록 한다. **디자인 리뉴얼 작업완료 보고 시 완료된 프로그램 외 타 서브프로그램을 탐색하여 발견한 추가개선 제안을 리포팅하고 해당 프로그램 docs/IMPROVEMENTS.md에 선제적으로 기록한다(2026-10-17 주인님 지시).** **「추가개선 제안」 필수 3대 항목**: 1) 프로그램 로직 및 기능 개선, 2) 사용자 인터페이스/UI 가독성, 사용편리성 개선, 3) 현재 만들어져 있는 다른 자동화 프로그램과의 연계가능한 기능. **프로젝트 제안 시 클릭 가능한 정확한 링크를 제공하고, 작업 착수 시에는 즉시 `ACTIVE_WORK.md` 및 `DESIGN.md` 상태를 작업 중으로 갱신하여 다른 CLI와의 충돌을 방지하며, 작업 종료 즉시 상태를 반드시 「✅ 1차 작업완료 (`vX.YY`, 템플릿명)」로 변경하고 `ACTIVE_WORK.md`의 작업 중 행을 삭제한다.**
7. **프로그램별 루트 문서 규격화 및 기능·로직·아이디어·버전 히스토리 기록 의무 (2026-10-17 주인님 지시)**: 모든 프로그램 폴더 루트(`AGENTS.md` 및 `README.md`)에 7대 핵심 항목(사용목적/대상, 개발기법/스킬, 기능/로직/장단점, 현재 버전 및 변경 히스토리, 추가 개발/디자인 대기 내용, 타 프로그램 연계/병합 및 확장 아이디어 제안, UI/레이아웃/스타일 개선안)을 정리하여 남겨 다른 CLI가 즉시 검토/개선할 수 있게 하고, 향후 개선 과제는 **프로그램 개선 대기 목록(백로그) 인수인계 문서(`<프로그램>/docs/IMPROVEMENT_BACKLOG.md` 및 `docs/IMPROVEMENTS.md`)**로 작성해 남긴다.
8. **남은 작업 리스트 및 현황 보고 시 카테고리별 표준 포맷 준수 의무 (2026-10-17 주인님 지시)**: 주인님께서 "남은 작업리스트 보여달라" 또는 "현재 디자인/개발 현황 보여달라"고 요청하실 때, 단순 번호 나열이 아닌 AIMaster 공식 14개 카테고리별로 묶어 [작업 된 것 vs 안 된 것]을 명확히 대조하는 2단계 표준 포맷(1단계: 카테고리별 총괄 진척 현황표, 2단계: 카테고리별 상세 대조표 [완료(✅) vs 예정(⚪)/보류(⏸)])으로 반드시 보고한다. 상세: [`DESIGN.md`](DESIGN.md) 17번 규칙.
9. **프로그램 서브폴더별 필수 인수인계 문서 6종 완비 및 타 CLI 연속작업 보장 의무 (2026-10-17 주인님 지시 — 핵심 고정 지침)**: 서브프로그램 작업 완료 시 1) `AGENTS.md` (7대 핵심 항목), 2) `README.md`, 3) `docs/IMPROVEMENTS.md`, 4) `docs/IMPROVEMENT_BACKLOG.md`, 5) `docs/DESIGN_HANDOFF.md`, 6) `docs/PLAN_YYYYMMDD_*.md` 6종 세트를 누락 없이 남기고, 루트의 `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md`를 즉시 100% 동기화한다.

