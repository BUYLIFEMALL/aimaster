# 이미지 자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션(ecommerce-image) 확인 전.** 담당 세션이 확인·수정하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「이미지」 카테고리 — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「이미지」 줄의 `image-convert-studio`(이미지 변환 스튜디오), `style-dna-analyzer`(이미지 스타일 분석기), `banana-canvas`(AI 바나나 캔버스), `ai-image-studio`(AI 이미지 스튜디오), `portrait-photo`(AI 인물사진), `four-cut-comics`(AI 4컷 만화), `fashion-style`(AI 패션스타일), `emotion-writer`(감성 글귀 이미지)와 병합됨 `photo-remake-studio`·`allinone-graphic`(이동 안내만). 앞으로 만드는 이미지 생성·편집·변환 프로그램에도 적용한다.
- 다른 카테고리 프로그램이 이미지를 만들 때는 **모델 연동 부분만** 이 기준 §5를 따르고, 나머지는 그 카테고리 기준을 따른다(예: [이커머스 완성 기준](ECOMMERCE_COMPLETION_POLICY.md)).
- `cinematic-storyboard-studio`(시네마틱 스토리보드)는 2026-10-24 카테고리 지도에서 「디자인」 줄로 옮겨져 이 문서 대상에서 뺐다. 바나나 캔버스·4컷·인물사진에서 보내는 연결(받는 쪽)만 관계로 남는다.
- 관계 문서: [이미지 기능 상세 비교표](IMAGE_FEATURE_MATRIX.md) · [이미지 통합 작업표](IMAGE_CONSOLIDATION_TASKS.md) · [이미지 통합 분석 보고서](analysis-image-consolidation-20261021/REPORT.md) · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md) · [이미지 모델 점검](IMAGE_MODEL_AUDIT_20261017.md) · [공용 모듈 등록부](SHARED_MODULES.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md) · [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-IMG-01~05.

## 1. 완성 흐름 (목표)

이미지 자동화의 완성 목표는 아래 흐름이 **회원 본인 키·본인 데이터로 끊기지 않고** 이어지는 것이다.

**아이디어·원본 넣기(글·사진·참고 이미지) → (필요하면) 프롬프트 다듬기 → 회원이 모델·화질·비율·장수 고르기(비용 표시) → 생성·편집 → 결과 확인·비교(원본 대비) → 부분 수정·다시 만들기 → 받기(형식·크기·ZIP) 또는 다른 프로그램으로 보내기 → 회원별 비공개 보관(30일)과 정리 기록**

- 프로그램마다 맡는 구간이 다르다. 생성 중심(이미지 스튜디오), 편집·합성 작업대(바나나 캔버스), 분석 → 프롬프트(스타일 분석기), AI 없는 변환(변환 스튜디오), 규격 사진(인물사진), 만화·연재 + 인스타 게시(4컷), 코디·가상 피팅(패션스타일), 글귀 카드(감성 글귀). 자기 구간만 끝까지 완성하면 되고, 나머지 구간은 **보내기 연결**로 잇는다(§2-6).
- 인스타 게시까지 하는 프로그램(현재 4컷 만화)은 [인스타 프로그램 자동 게시 원칙](../CLAUDE.md)과 [예약 기능 지침](SCHEDULER_POLICY.md)을 함께 따른다. 감성 글귀처럼 INSTA 포스팅 자동화로 넘기는 프로그램은 게시를 받는 쪽에서 회원이 한다.

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **회원 본인 키로 동작**: 유료 AI(Gemini·OpenAI·Replicate·Claude)와 외부 사진 API(Pixabay·Pexels), 예약용 cron-job.org는 모두 회원 `user_api_keys`의 본인 값만 쓴다. 키가 없으면 실행하지 않고 등록 안내를 띄운다. 2026-10-24 코드 검색에서 8개 프로그램 모두 운영자 환경변수 AI 키를 읽는 곳이 없었다(`process.env.(GEMINI|OPENAI|REPLICATE|PIXABAY|PEXELS…)` 검색 0건).
2. **회원 데이터 격리·비공개**: 생성·편집 결과와 올린 원본은 회원 본인 폴더(`{user_id}/…`)의 **비공개 버킷**에 두고 서명 주소로만 보여 준다(기준: `ai-image-studio/lib/imageStorage.ts`, `banana-canvas/src/lib/files.ts`, `style-dna-analyzer/src/lib/dna/records.ts`). 공개 버킷은 **외부 플랫폼이 공개 주소를 요구하는 게시 단계에서만** 쓴다(Instagram — `four-cut-comics/src/lib/instagram/posting.ts`의 `insta-post-images`). 그 경우에도 게시 뒤·실패 뒤 지우는 규칙과 30일 정리가 있어야 한다.
3. **30일 자동 정리와 기록**: 서버에 남는 생성 자료는 생성일 기준 30일 뒤 매일 정리(예약 작업 `/api/cron/cleanup`, `CRON_SECRET`)되고, 지운 건수를 회원별 정리 기록(공용 `cleanup-usage-log`, `usage_logs` action `cleanup_expired`)으로 남긴다. 보관 기간을 회원이 고르게 할 때도 **최대 30일**이다(7·30일 — `portrait-photo/src/lib/retention.ts`, `four-cut-comics/src/lib/comic/savedIndex.ts`). 브라우저에만 두는 자료(IndexedDB·localStorage)도 날짜 기한을 둔다(`fashion-style/src/lib/look/retention.ts`). 접속할 때만 지우는 방식은 완료로 보지 않는다(2026-10-22 W5·W7에서 고친 문제).
4. **이중 과금 방지**: 유료 이미지 생성은 **시간 초과 때 자동으로 다시 보내지 않는다**(공용 `gemini-image-client` — `ai-image-studio/lib/providers/geminiImage.ts`, 2026-10-18). 서버에 저장된 한 기록을 여러 요청이 고칠 수 있으면 생성 전에 선점한다(기준: `banana-canvas/src/app/api/run/recut/route.ts` `busy_until` → 409). 화면은 생성 중 버튼을 잠근다. 서버 오류·혼잡에 대한 1회 재시도를 남겨 둘지는 프로그램별로 판단하고 근거를 적는다(현황: [작업표](IMAGE_CONSOLIDATION_TASKS.md) 「우선 처리」 IM-U3).
5. **모델 연동은 기준 프로그램과 같게**: 나노바나나 모델 이름·화질·온도는 공용 `gemini-image-models` 사본(`nanoBananaModels.ts`, 기준 `ai-image-studio`), 호출·대기·이미지 받기는 공용 `gemini-image-client` 사본(`geminiImage.ts`)을 쓴다. 미리보기(`-preview`)·별칭(`-latest`)·종료 예정 모델은 쓰지 않는다([이미지 모델 점검](IMAGE_MODEL_AUDIT_20261017.md)).
6. **보내기 연결은 정해진 방식으로**: 프로그램 사이 이미지 넘기기는 이미 쓰는 방식(`?src=`·`?import=`·「다시 저장」)만 쓴다 — 받는 쪽은 우리 Supabase 호스트의 **허용한 버킷 서명 주소만** 받고(`image-convert-studio/src/lib/importSource.ts`), 처음 넘김·처음 받기를 1회 기록한다(공용 `link-mark`, `resave-receiver`, `banana-idea-link`). 다른 회원의 결과를 받을 수 없어야 한다.
7. **검수 증거**: 로컬 검사(tsc·시험) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 실제 화면 확인을 각각 기록한다. 유료 생성 시험은 승인된 횟수만, 가장 싼 모델(`gemini-3.1-flash-lite-image`)로 하고, 누르지 않은 버튼은 「미검수」로 적는다. 모델 교체 등 **연동만 바꾼 경우에는 일괄 생성 시험을 하지 않는다**(이미지 레퍼런스 규칙).
8. **문서 갱신**: 같은 작업에서 [이미지 기능 상세 비교표](IMAGE_FEATURE_MATRIX.md)의 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전을 고친다.

## 3. 회원이 고르는 항목

회원이 고르지 않은 값으로 생성·과금·게시하지 않는다.

| 항목 | 선택지 | 프로그램 | 근거 |
|---|---|---|---|
| 이미지 엔진·모델 | OpenAI(gpt-image 계열)·Gemini(나노바나나)·Replicate(Flux·Ideogram·Recraft 등) | 이미지 스튜디오 | `ai-image-studio/lib/providers/registry.ts`, `lib/providers/index.ts` |
| 나노바나나 등급·화질 | 빠름(Lite 1K)·표준(nano-banana-2.1, 1K~4K)·Pro | 바나나 캔버스·4컷·인물사진·패션·감성 글귀·스타일 분석기 | 각 폴더 `nanoBananaModels.ts`(공용 사본), `banana-canvas/src/lib/imageModelChain.ts` |
| 분석 AI 제공사 | Gemini·OpenAI·Claude(회원 등록 키) | 스타일 분석기 | `style-dna-analyzer/src/lib/ai/models.ts`, `lib/ai/llm.ts` |
| 작업 종류 | 생성·편집·합성·배경 제거·부분 수정·증명사진·평면도·인생 앨범·만화·8컷 스토리·레시피·옛 사진 복원·템플릿 그래픽·비율 확장 | 바나나 캔버스 | `banana-canvas/src/lib/bnc/types.ts` `Kind`, `lib/bnc/tasks.ts` |
| 복제·변형 강도 | 0~100% | 스타일 분석기 | `style-dna-analyzer/src/lib/dna/types.ts` `DnaMode` |
| 출력 형식·크기 | WebP·AVIF·PNG·JPEG, 품질, 배율, 게시처 규격 6종, 회전·반전·비율 자르기 | 변환 스튜디오 | `image-convert-studio/src/lib/imageTools/formats.ts`·`sizeChange.ts`·`geometry.ts`·`postPresets.ts` |
| 사진 목적·국가 규격 | 목적 프리셋, 국가별 규격, 규격 묶음 | 인물사진 | `portrait-photo/src/lib/portrait/purposes.ts`·`post.ts`·`bundles.ts` |
| 서버 보관 여부·기간 | 브라우저만 / 서버 보관함 7·30일 | 인물사진·4컷 | `portrait-photo/src/lib/retention.ts`, `four-cut-comics/src/lib/comic/savedIndex.ts` |
| 컷 수·화풍·비율 | 3·4·6컷, 스타일, 컷별 비율 | 4컷 | `four-cut-comics/src/lib/comic/options.ts` |
| 인스타 게시 방식 | 즉시 게시 / 예약(운영 예약 또는 내 cron-job.org) | 4컷 | `four-cut-comics/src/app/api/instagram/publish/route.ts`·`scheduler/route.ts` |
| 배경 방식 | AI 생성 / Pixabay·Pexels 무료 사진(회원 키) | 감성 글귀 | `emotion-writer/src/lib/studio/services.ts`·`photoSearch.ts` |
| 채널 크기 | 9:16·1:1·3:4 등 「다른 크기로 받기」(AI 재호출 없음) | 감성 글귀 | `emotion-writer/src/lib/studio/channels.ts`·`postPresets.ts` |

## 4. 하지 않을 것

- **운영자·다른 회원의 키나 계정으로 대신 처리하지 않는다.** 무료 사진 API(Pixabay·Pexels)도 회원 본인 키다.
- **이미지 생성 프롬프트를 다른 프로그램과 공유·복사하지 않는다.** 공용으로 쓰는 것은 모델·주소·호출·대기 시간·이미지 받기까지다([IMAGE_PROMPT_RULES.md](IMAGE_PROMPT_RULES.md) §0). 공용 사본(`geminiImage.ts`·`nanoBananaModels.ts`·`cleanupUsageLog.ts`·`linkMark.ts`·`resaveReceiver.ts`·`bananaIdeaLink.ts`·`zip.ts`·`postPresets.ts`·`photoSearch.ts` 등)은 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- **유료 이미지 생성을 시간 초과 때 자동 재시도하지 않는다.**
- **AI 생성물 표시(워터마크)를 지우는 기능을 만들거나 홍보하지 않는다** — 제미나이 ✦ 워터마크 자동 제거는 2026-10-24 제외 확정(EXT-IMG-01, IDEA-CLEARPIC-04). 남의 워터마크 제거도 홍보하지 않는다.
- **실존 인물 사칭·특정 일반인 닮게 만들기·허위 장면을 만들지 않는다**([IMAGE_PROMPT_RULES.md](IMAGE_PROMPT_RULES.md) 2-2·2-5). 인물사진은 본인·동의 사진만 쓰게 안내한다.
- **「정부24 100% 통과」처럼 규격 통과를 단정하지 않는다** — 제출 기관 규정 확인 안내(EXT-IMG-03 보강 ④).
- **회원 키 원문을 브라우저 저장소에 두지 않는다**(2026-10-22 웹툰 W2에서 고친 문제와 같은 패턴 금지).
- **회원 확인 없이 외부에 게시하지 않는다.** 예약 게시는 회원이 고른 시각·방식으로만 한다.
- 병합된 원본(`photo-remake-studio`·`allinone-graphic`)에 새 기능을 넣지 않는다. 생성 API는 410으로 막혀 있고 옛 주소는 이동 안내로 둔다.

## 5. 모델 연동 규칙 (이미지 레퍼런스 규칙 적용)

- **기준 프로그램은 `ai-image-studio`다**(루트 `CLAUDE.md` 「이미지 생성 레퍼런스 규칙」). 새 모델·종료 모델 교체는 여기를 먼저 고치고, 같은 모델을 쓰는 프로그램은 **연동 부분만** 함께 바꾼다.
- 다른 프로그램이 참고하는 범위는 모델·엔드포인트·호출 방식·대기 시간·이미지 받기(`ai-image-studio/lib/providers/adapters/*.ts`, `lib/providers/geminiImage.ts`, `lib/providers/nanoBananaModels.ts`)뿐이다. 프롬프트·화풍·결과 내용은 프로그램마다 고유하다.
- Vercel 함수 300초 안에 `timeoutMs × (retries+1)` + 앞뒤 작업이 들어가는지 계산한다([공용 모듈 점검표](SHARED_MODULE_CHECKPOINTS.md) ⑤).
- 공용 오류(`GeminiImageError`)는 각 프로그램의 기존 오류 형식으로 바꿔 던진다(예: `banana-canvas/src/lib/gemini.ts` `fromImageError`).

## 6. 회원 본인 키 규칙 (이미지 적용)

- 키 원문은 브라우저로 보내지 않는다. 서버가 `user_api_keys`에서 읽어 머리글(`x-goog-api-key` 등)로만 보낸다. 화면에는 「등록됨 여부」만 보인다.
- 새 외부 키가 필요하면 프로그램 전용 저장소를 만들지 않고 공용 `user_api_keys`·[회원 연동 정보](MEMBER_INTEGRATIONS.md) 구조에 항목을 추가한다. Pixabay·Pexels 키는 감성 글귀·INSTA·쓰레드가 같은 항목을 함께 쓴다.
- 키가 없거나 한도가 소진되면 다른 키로 폴백하지 않고 「본인 키를 등록해 주세요」로 안내한다.
- AI 없는 처리(변환 스튜디오, 인물사진의 브라우저 얼굴 인식 `portrait-photo/src/lib/portrait/faceLocal.ts`)는 키 없이 동작해야 한다.

## 7. 한국인 인물 묘사 원칙

- 사람이 나오는 이미지를 **새로 만들 때** 기본은 한국인(동아시아인)이다. 특정 외국 유명인·외국 배경이 꼭 필요한 경우만 예외다([IMAGE_PROMPT_RULES.md](IMAGE_PROMPT_RULES.md) 규칙 3).
- 현재 구현 위치(2026-10-24 코드 검색): `ai-image-studio/lib/providers/adapters/gemini.ts` `KOREAN_DEFAULT_PEOPLE_INSTRUCTION`·`app/api/enhance-prompt/route.ts`, `banana-canvas/src/lib/bnc/prompts.ts` `KOREAN_PEOPLE_RULE`, `style-dna-analyzer/src/lib/ai/dnaPrompts.ts`, `four-cut-comics/src/lib/comic/prompt.ts`·`options.ts`, `fashion-style/src/lib/look/prompts.ts`, `emotion-writer/src/lib/studio/services.ts`.
- **회원이 올린 본인 사진을 편집하는 경우**(인물사진·패션 가상 피팅·옛 사진 복원)는 원래 인물을 바꾸지 않는 것이 우선이다 — 이 경우 「한국인으로 묘사」 지시는 새로 그려 넣는 인물에만 적용한다.
- 알려진 빈틈: 이미지 스튜디오에서 OpenAI·Replicate 엔진으로 2단계에 직접 프롬프트를 넣으면 한국인 지시가 붙지 않는다([작업표](IMAGE_CONSOLIDATION_TASKS.md) IM-U5).

## 8. 당해 연도 원칙

- 프롬프트에 날짜·계절·시기가 들어가면 `new Date().getFullYear()`와 한국 시간 기준 현재 월을 넣는다(핵심 원칙 8). 현재 주입 위치: `banana-canvas/src/lib/bnc/prompts.ts`, `style-dna-analyzer/src/app/api/analyze/route.ts`·`refine/route.ts`, `four-cut-comics/src/app/api/script/route.ts`·`insta/route.ts`, `fashion-style/src/lib/gemini.ts`, `emotion-writer/src/lib/studio/services.ts`.
- 시기와 무관한 순수 묘사 프롬프트(예: 이미지 스튜디오 1단계 다듬기)는 넣지 않아도 되지만, 그 판단을 프로그램 `AGENTS.md`에 적는다.

## 9. 완성 보고 양식(이미지)

완성 보고에는 아래를 따로 적는다: 생성·편집 확인 여부(작업 종류별, 실제 생성 장수) / 받기·보내기 연결 확인 여부(보낸 곳 → 받은 곳) / 비공개 저장·30일 정리·정리 기록 영향 / 이중 과금 방지(시간 초과·동시 요청) / 회원 본인 키 확인 / 모델 연동이 기준과 같은지 / 비용 리포트(빌드·AI 호출 장수·누구 키·대략 금액).
