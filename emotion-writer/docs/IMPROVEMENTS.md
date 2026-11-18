# 감성 글귀 이미지 (emotion-writer) — 개선사항 및 고도화 제안 (IMPROVEMENTS)

> **⏸ 미배포 — 무료 엔진 Cloudflare 본인 키 서버 구현(ECOM-20261118-05, 2026-11-18, `claude-win-sdp`, 주인님 「진행해」·Master 승인, 모의 시험만·실생성 0)**: `services.ts` 무료 경로 Pollinations(키 없음) 제거 → Cloudflare Workers AI `@cf/black-forest-labs/flux-1-schnell` REST(본인 계정 ID+토큰, 프롬프트는 본문만, steps 4, redirect error, 110초 예산, JSON 스트림 상한, 응답은 공식 근거 형태 `result.image`·`image`만, 엄격 base64·서명 검사). `cloudflareCredentials()` 두 값 필수·계정 ID 32자리 검사(compatible-chat 기준). `api/image/route.ts`는 공용 키 이름 `cloudflare_workers_ai_token`·`cloudflare_account_id`를 회원 본인 행에서만 읽음(다른 키 대체 0). 오류 안내 401/403 토큰·권한, 429 요청 한도·무료 사용량, 그 밖 502 — 무과금·무제한 보증 문구 없음. `FREE_IMAGE_ENGINE_ENABLED=false` 유지, UI 파일(KeySettings·Workspace·guide) 변경 0(AGY 담당). 시험 65(이미지 19). **실검증 차단**: 시험 계정에 등록된 Cloudflare 토큰이 읽기 확인에서 인증 실패(401, code 1000)·계정 조회 권한 부족(403, 9109) — 원인(만료·삭제·권한·토큰 종류) 미확정, 새 토큰 등록 뒤 실호출 1회로 출력 크기·응답 모양 확정 예정. **Mac 지정 모의 PASS(서비스 21+실제 route/guard 5) — 서버 소스 `ab693ba39` 수락(11-18)**. 미검수: 실제 Cloudflare 응답·토큰 유효·잔여 무료량·운영·UI(Cloudflare 키 카드, AGY 담당)·실DB RLS. FREE OFF·미배포 유지. 다음 사람 조치: 시험 계정 새 토큰(Workers AI Read·Edit) 화면 직접 등록(요청함 a2c0632b) → 읽기 확인 → 승인 시 실호출 1회.
>
> **⏸ 미배포 — 무료(Cloudflare) 실호출 1회 결과와 프롬프트 보완(ECOM-20261118-05 후속, 2026-11-18, `claude-win-sdp`, 주인님 생성 1회 승인·Master 배정)**: 시험 계정 새 사용자 토큰 읽기 확인(/user/tokens/verify 200 active, 계정 ai/models/search 200·75개). 실생성 1회(flux-1-schnell, steps 4, 기존 프롬프트): HTTP 200 JSON 약 0.93MB·3.2초, 최상위 `result`·`success`·`errors`·`messages`, `result`는 `image`·`usage` → 코드의 `result.image` 경로와 일치. 이미지 JPEG 약 0.68MB, 1024×1024(요청에 크기 지정 없음). 샘플은 저장소 밖 scratchpad `cf-flux-sample.jpg`(미커밋). **품질 보류**: 무문자 지시에도 화면 중앙에 뜻 없는 한글 모양 글자 1줄이 그려짐(원인 미확정, 무문자를 보장한다고 주장하지 않음). 보완(이 커밋): 무료 프롬프트에 회원 주제·글귀 원문을 넣지 않고, 주제 낱말 → 고정 영문 분위기 표(8개)·없으면 중립 기본값, 무문자 지시 강화. 외부 번역 호출 0, 유료 OpenAI·Gemini 프롬프트·모델·요청 수·FREE OFF 그대로. 크롭: 기존 `render.ts` `coverRect`가 꽉 채워 가운데를 자름(9:16이면 약 1.9배 확대·좌우 잘림 — 화질 제안은 UI 범위라 AGY와 별도). **Mac 지정 독립검수 PASS(실제 서비스 모의 10경계) — 소스 `9ccfc8dfa` 수락(11-18)**. 실제 무문자 품질 PASS는 아님(추가 생성 0). FREE OFF·미배포 유지, 배포는 Master 순번·승인 뒤.

> **🔎 조사(코드 변경 0) — 무료 이미지(Pollinations) 공식 지원·대안 (2026-11-18, `claude-win-sdp`, Master 배정, 공식 웹 문서만·실호출 0)**: ① `image.pollinations.ai/prompt` = 공식 「Classic API」, 「kept stable for existing apps」(폐기 공지 없음), 신규 앱은 `gen.pollinations.ai` + `sk_` 키 권장(APIDOCS.md·gen.pollinations.ai/docs). ② 익명 무료는 **IP 단위 한도 「One at a time, at least 45 seconds apart」**, 초과 402 — 우리 서버 한 IP로 여러 회원이 부르는 구조에는 부적합. ③ Classic은 모델 1개·「JPEG with a small Pollinations logo」, `model=flux`·`nologo` 파라미터는 문서에 없음(동작 미확인). ④ 「same URL returns the same result, to anyone who has the URL」(URL 캐시 공유) — 글귀가 URL에 실림. ⑤ 약관·개인정보(/terms·/privacy) 본문 확인 불가 → 상업 사용·프롬프트 보관 기간 미확인, 「no uptime guarantee」. ⑥ 키 방식(gen)은 선불 크레딧(무료 쿼터 아님). **대안**: Cloudflare Workers AI FLUX.1-schnell — 회원 본인 계정 ID+API 토큰, 무료 하루 10,000 Neurons(UTC 0시 리셋), base64 응답, 「Zero data retention: Yes」, 모델 약관 bfl.ai(미열람)·1장당 소모량 계산식 미확인. Hugging Face는 무료 계정 월 크레딧 「None」(대안 부적합). → 「100% 무료·키 없이」 단정 근거 없음, 본인 키 규칙과 맞는 무료 쿼터 경로는 Cloudflare가 유력(결정·실시험은 승인 뒤).

> **본인 키 무료 이미지 플랫폼 비교(보완, 2026-11-18 확인, 공식 웹 문서만·생성 호출 0)** — 결론 범위: **이번 조사 범위(아래 18곳)에서 「매일 반복 무료 쿼터」가 공식 문구로 확인된 후보는 Cloudflare Workers AI**뿐이다(전 세계 유일이라는 단정 아님).
>
> | 공급자 | 무료 유형 | 공식 근거(URL) | 회원 본인 키 | 카드 | 라이선스·약관 메모 |
> |---|---|---|---|---|---|
> | Cloudflare Workers AI | 반복(10,000 Neurons/일, UTC 0시 리셋) | developers.cloudflare.com/workers-ai/platform/pricing/ (11-12 갱신)·/models/flux-1-schnell/·/get-started/rest-api/·/platform/limits/ | 본인 계정 ID + API 토큰(Workers AI Read·Edit) | 공식 문구 없음(미확인) | FLUX.1-schnell Apache-2.0(huggingface.co/black-forest-labs/FLUX.1-schnell), 모델 페이지 약관 링크 bfl.ai/legal/terms-of-service(입출력 모델 개선 사용·실존 인물 동의·출력으로 타 모델 학습 금지) — Cloudflare 경로 적용 범위 미확인 |
> | Pollinations(sk_ 키) | 조건부(Quest 무료 잔액, 금액·반복 미확인) | gen.pollinations.ai/docs·/image/models·github APIDOCS.md | 본인 sk_ 키 | 미확인 | flux.1-schnell `paid_only:false` 0.002 pollen(=USD, 단위 미확인), /terms·/privacy 본문 확인 불가 |
> | Pollinations(키 없음 Classic) | 익명 무료, IP당 「One at a time, at least 45 seconds apart」 | github APIDOCS.md | 키 없음(본인 키 규칙 불일치) | — | 로고 포함 JPEG, URL 결과 공유 캐시 |
> | SiliconFlow | 일회성 $1 | siliconflow.com/pricing | 본인 키 | 미확인 | 무료 이미지 모델 미확인 |
> | Runware | 일회성 $2(사업자 이메일 가입) | runware.ai/pricing | 본인 키 | 미확인 | — |
> | Stability AI | 일회성 「25 free credits」(일회성 여부는 문맥 추정) | docs.stability.ai/pricing | 본인 키 | 미확인 | — |
> | Google Gemini API | 이미지 모델 무료 티어 전부 「Not available」(Imagen 행 없음) | aistudio.google.com/docs/pricing | — | — | — |
> | OpenAI·Together·fal·Replicate·DeepInfra(카드 필수)·Black Forest Labs·getimg·Segmind·Hugging Face(무료 월 크레딧 None) | 무료 이미지 없음 | 각 공식 pricing 페이지 | — | — | — |
> | Leonardo(403)·Ideogram(가격 페이지 못 찾음)·Novita(금액 없음) | 미확인 | — | — | — | — |
>
> 파생 참고치(실사용 가능량·권장값 아님): Cloudflare 표 단가로 계산하면 flux-1-schnell 1024²·4step ≈ 57.6 뉴런(≈173장/일), flux-2-klein-4b ≈ 95장/일. 단 flux-1-schnell 입력 스키마에 width/height가 없어 실제 해상도·step·REST 응답 래퍼(`result.image` 여부)는 실호출 전 미확인. 다음 단계(채택·시험)는 주인님/Master 결정 뒤.

> **⏸ 미배포 — 이미지 엔진 보안 보완(ECOM-20261118-03, 2026-11-18, `claude-win-sdp`, Master 승인)**: AGY `d21eb96d7` 위 QA049 P2 4건. I-F01 엔진별 허용 모델(`config.ts` `OPENAI_IMAGE_MODELS`=`gpt-image-2.5-flare`만 — 공식 확인 2026-11-18 developers.openai.com/api/docs/models·/api/reference/resources/images: b64_json 전용·url 미지원·response_format 미지원·표준 크기 1024x1024/1536x1024/1024x1536), 문자열·64자·목록 밖·타사·객체 → 호출 전 400. I-F02 새 경로 공통 검사(엄격 base64·빈/패딩 오류·3MiB 상한·PNG/JPEG/WEBP 서명, Content-Type 불신, 스트림 누적 상한) — **이미지처럼 보이는지까지만, 완전한 해석·안전성 보증 아님**. I-F03 OpenAI url 분기 삭제(2차 요청 0). I-F04 OpenAI·무료 전체 110초 예산(생성+본문 읽기, 부모 취소 결합, Abort/Timeout 그대로→guard 408, 재시도 0, 시험은 20ms 주입). 무료(FLUX, 키 없음)는 `FREE_IMAGE_ENGINE_ENABLED=false` — 서버 「준비 중」 거절·카드 비활성·「100% 무료」 문구 제거, 저장 초안은 선택만 해제. 기존 Gemini 경로 변경 0. OpenAI 세로 비율은 1024x1536(공식 표준)으로. 시험 56(이미지 10). 실호출·빌드·배포 0. 잔여 `3cb7c147e`(OpenAI JSON 스트림 상한·redirect error, Mac PASS). **ECOM-20261118-04**: 기존 Gemini 반환 지점도 같은 엄격 검사 + 선언 MIME=서명 일치(공용 geminiImage.ts 변경 0, 기존 hello fixture는 PNG 바이트로만 교체), 시험 63. **배포 후보 SHA `1a1f64dba`(선행 `b34cba02b`·`3cb7c147e`, Mac 지정 경계 PASS) — 운영 v1.30 미포함, 다음 배포 승인 때만 묶음 포함.** free=false 유지. 미검수: Gemini 응답 JSON 전체 상한(공용 클라이언트 쪽), 완전 이미지 디코드, OpenAI 이미지 실지원·실생성.
> **✅ v1.30 배포(2026-11-18 `dpl_7XjTSJkDk6Ftzt9Lv3EVvo52HpdT`, 검수 SHA `59cb81d8e`, 실호출 3사 각 1회 성공·375 넘침 없음, AGY `d21eb96d7` 제외) — 글귀 생성 AI 3사 선택(ECOM-20261118-01, 2026-11-18, Claud(ecommerce) `claude-win-sdp`, 주인님 직접 지시·Master 승인)**: 5단계 「글귀 생성 AI 모델」을 Google Gemini·OpenAI·Claude 9개 모델(등급별 3개, `docs/AI_MODEL_CATALOG.md` 11-03 기준)로 확장, 기본값은 그대로 Gemini 3.8 Flash. 새 파일 `src/lib/studio/textModels.ts`(목록·플랫폼 판정, 기준 `kakao_auto_poster/src/lib/textModels.ts`)·`textLlm.ts`(3사 호출, 기준 `kakao_auto_poster/src/lib/ai/textLlm.ts` — 본인 키만·재시도 0·취소 신호 연결)·`openaiRequestParams.ts`(공용 `openai-request-params` 기준 원본 그대로 복사 — **공용 사본 등록은 Master 조율 필요**). 수정: `services.ts` generateCopy(옛 `geminiRequest` 제거), `api/copy` 고른 플랫폼 본인 키, `api/keys` OpenAI·Claude 키 확인(모델 목록 조회, 요금 없음), `config.ts` PROVIDERS+openai·anthropic, `KeySettings.tsx` 두 키 카드, `Workspace.tsx` 플랫폼별 묶음 선택 칸·키 등록 표시·고른 플랫폼 키 창, `/guide` FAQ 1개. 검사: 시험 44(새 9: 모의 응답 3사 요청 모양·오류·취소), tsc 0. QA046 반례 보완 `59cb81d8e`(OpenAI `message.refusal` 거절 400·취소/시간초과 408 전파, 시험 46) — Mac 소스 검수 PASS(11-18), 모델 9개 실제 지원·요금·실호출·운영·375 화면은 미검수. **남은 일(승인 대기)**: 시험 계정 본인 키 실호출 3회(플랫폼별 가성비 1회), 배포 빌드 1회(v1.30, AGY Pexels 삭제·a11y 묶음과 함께), 배포 뒤 ego 화면 검수.

> **✅ v1.26으로 배포됨(2026-10-23) — 옛 표시: 미배포 대기 (2026-10-23, Claude Code 윈도우 — 내부 정리, 동작 같음)** 다음 감성 글귀 배포 때 함께(운영 v1.25, 버전은 그때). 커밋 `428fcdfc3`.
> - 사진 검색·받기를 공용 기준 코드 `free-photo-search` 사본 `src/lib/studio/photoSearch.ts`로(기준 `insta_auto_poster/src/lib/cardnews/photoSearch.ts`, **사본 직접 수정 금지**). `services.ts` `searchPhotos`·`photoDataUrl`과 `validation.ts` `allowedPhotoUrl`은 인자·3MB 한도를 그대로 둔 연결 함수(오류는 `AppError`로 바꿈). 키 오류 문구만 「본인 API 키와 사용 권한을 확인해주세요」(띄어쓰기)·429 문구 「검색 한도에 도달했습니다」로 조금 바뀜.
> - 검수: 기존 시험 35개 그대로 통과(기대값 변경 없음), tsc 0, 로컬 build. **배포 뒤 확인**: 사진 검색(Pixabay) → 사진 선택 → 이미지 만들기.

> **작성 일자**: 2026-10-18  
> **작성자**: Antigravity (윈도우)  
> **기준 버전**: `v1.15`  
> **프로그램 공식 URL**:  
> https://emotion-writer.buylife.xyz

---

## 1. 프로그램 로직 및 기능 개선

### 1) 문맥 감정(Sentiment) 분석 기반 스마트 컬러 & 폰트 자동 페어링
- **현황**: 현재는 사용자가 감성 테마(위로, 이별, 희망, 새벽 등)를 수동으로 선택하거나 기본 프리셋에 의존합니다.
- **개선안**: 사용자가 입력한 짧은 시나 문장 텍스트를 로컬 또는 경량 AI가 실시간 감정 극성(Sentiment Score)과 분위기를 분석하여, 그에 어울리는 최적의 폰트(부드러운 손글씨체 vs 날카로운 붓글씨체 vs 단정한 명조체)와 배경 블러/오버레이 컬러 톤을 1클릭 추천해 주는 스마트 페어링 엔진 구축.

### 2) 인스타그램 카드뉴스형 다중 페이지(Carousel 슬라이드) 일괄 렌더링
- **현황**: 현재는 단일 이미지 1장 단위로만 텍스트를 배치하고 다운로드할 수 있습니다.
- **개선안**: 긴 에세이나 시 구절을 문단별로 자동 슬라이싱(2~10장)하여, 동일한 배경 톤과 폰트 스타일을 유지한 채 1장부터 10장까지 인스타그램 캐러셀 피드용 연속 이미지를 일괄 렌더링 및 ZIP 압축 파일로 다운로드할 수 있는 다중 슬라이드 모드 추가.

---

## 2. 사용자 인터페이스 (UI) 가독성 및 사용편리성 개선

### 1) 캔버스 위 텍스트 드래그 & 드롭 자유 배치 및 듀얼 텍스트 레이어
- **현황**: 현재 캔버스 중앙 정렬 위주로 텍스트 위치가 고정되어 있어, 배경 이미지의 피사체(인물, 달, 꽃 등)를 피해 텍스트를 배치하기가 어렵습니다.
- **개선안**: HTML5 Canvas 상에서 텍스트 블록을 마우스나 모바일 터치로 자유롭게 드래그하여 원하는 위치에 놓을 수 있도록 하고, '본문 감성 문구' 레이어와 '작가 서명/날짜' 레이어를 독립적으로 크기·투명도·위치를 조작할 수 있는 듀얼 레이어 컨트롤러 도입.

### 2) 소셜 미디어 플랫폼별 규격 원클릭 프리셋 토글
- **현황**: 현재 가로/세로 비율 조절이 제한적으로 제공되고 있습니다.
- **개선안**: 인스타그램 피드(1:1), 인스타 스토리/릴스/틱톡(9:16), 스레드/트위터(4:5), 블로그 썸네일(16:9) 프리셋 버튼을 캔버스 상단에 퀵 토글로 배치하여, 클릭 한 번으로 텍스트 줄바꿈과 폰트 크기가 비율에 맞춰 자동 재계산되도록 UX 강화.

---

## 3. 타 자동화 프로그램과의 연계 가능한 기능

### 1) `threads-insta-viral` (스레드/인스타 바이럴)과의 연계
- **공식 서비스 URL**:  
  https://threads-insta-viral.buylife.xyz
- **연계 방안**: 감성 글귀 이미지에서 완성된 고해상도 캘리그라피 이미지를 스레드/인스타 바이럴 스튜디오로 직접 전송하여, 바이럴 해시태그 및 피드 본문 캡션과 함께 즉시 연동 발행하는 SNS 통합 자동화 파이프라인 구성.

### 2) `ebook-studio` (eBook 스튜디오)와의 연계
- **공식 서비스 URL**:  
  https://ebook-studio.buylife.xyz
- **연계 방안**: eBook 스튜디오에서 감성 시집이나 수필집을 제작할 때, `emotion-writer`의 캘리그라피 캔버스 엔진을 호출하여 각 챕터의 인트로 간지(삽화 표지)와 메인 도서 표지를 일관된 폰트와 감성 이미지로 즉시 삽입할 수 있도록 에셋 브릿지 연동.

### 3) `cardnews-studio` (카드뉴스 스튜디오)와의 연계
- **공식 서비스 URL**:  
  https://cardnews-studio.buylife.xyz
- **연계 방안**: 카드뉴스 스튜디오의 마지막 페이지 '공감/엔딩 컷'으로 `emotion-writer`의 감성 글귀 이미지를 바로 가져와 삽입할 수 있도록 템플릿 연계 지원.

---

## 4. 타 서브프로그램 탐색 기반 추가개선 제안 (크로스 플랫폼 분석)

### 1) 20번 `ebook-studio` (eBook 스튜디오)
- **공식 서비스 URL**:  
  https://ebook-studio.buylife.xyz
- **분석 및 개선점**: 전자책 기획, 목차 생성, 챕터별 본문 집필, EPUB/PDF 변환에 이르는 복합 파이프라인을 보유하고 있으나, 모바일 뷰포트에서 에디터의 툴바가 겹치거나 가이드북 메뉴가 부재할 가능성이 큼. 포커스 스튜디오 또는 클래식 퍼블리셔 템플릿을 적용하여 375px 모바일 슬림 헤더와 단계별 출판 가이드북(`/guide`)을 신설하면 전문 출판 플랫폼으로서의 가치가 극대화될 것임.

### 2) 21번 `interview-prep-studio` (AI 모의 면접 스튜디오)
- **공식 서비스 URL**:  
  https://interview-prep-studio.buylife.xyz
- **분석 및 개선점**: AI 면접관 질문 음성과 실시간 답변 녹음 인터랙션이 핵심인 만큼, 타이머와 오디오 볼륨 레벨 미터(VU Meter)가 시각적으로 강조되는 '인텔리전트 콘솔' 테마 적용 및 면접 단계별 비주얼 코칭 매뉴얼 구축이 시급함.

## 2026-10-23 ⚠ 문서-코드 불일치(미처리, 다음에 이 폴더를 손볼 때) — Claude Code 윈도우, 프로그램 비교표 카드 갱신 중 발견
- ✅ (2026-10-23 같은 날 처리 — 8·31·44·47번 줄을 코드 기준으로 고침, 77번 줄은 그때 버전 기록이라 그대로) `AGENTS.md` 7대 항목 1·3절이 옛 설명 그대로였다. 다른 세션이 이 문서를 보고 잘못된 기능 정보로 작업할 수 있다.
  - 사진 출처: 8·31·44·77번 줄 「Unsplash」 → 실제 코드는 **Pixabay·Pexels**(`src/components/Workspace.tsx` `source` 값 `pixabay`·`pexels`, 원본 보기 링크).
  - 비율: 47번 줄 「9:16·1:1·4:5」 → 실제 편집 비율은 **9:16·1:1·3:4**(`Workspace.tsx` 비율 버튼). 4:5는 완성 화면 「받기 크기」(124번 줄 v1.2x 기록)에만 있다.
  - 8번 줄 「Gemini 2.5」 모델 표기도 지금 코드의 모델 이름과 맞는지 함께 확인.
- 고칠 때: 1·3절을 코드 기준으로 고치고(버전 기록 줄은 그대로), README.md 같은 항목도 맞춘다. 문서만 바뀌므로 배포·버전 변경 없음. 프로그램 비교표 카드는 이미 코드 기준(2026-10-23 v1.26).
- **추가 발견(같은 날) — ✅ 화면은 고침(미배포 대기, AGENTS.md 맨 아래)**: 회원이 보는 **사용 매뉴얼 화면도 옛 정보** — `src/app/(studio)/guide/page.tsx` 6곳이 「Unsplash 무료 사진」으로 안내(31·34·35번 자주 묻는 질문, 74번 소개, 128번 3단계, 221·234번 「Unsplash vs 나노바나나」 팁). 실제 사진 검색은 Pixabay·Pexels. 고치면 화면 문구 수정이라 **미배포 대기**로 두고 다음 배포 때 버전 +0.01(비용 없음). 문서(`AGENTS.md`)와 함께 고치는 것이 좋다.
