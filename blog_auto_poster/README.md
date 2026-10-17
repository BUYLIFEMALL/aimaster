# blog_auto_poster (AIMaster_dev 24h News SEO AI Auto Poster)

> **운영자 전용 도구 — 회원 서비스가 아닙니다 (2026-10-09 주인님 승인).** 사이트·Vercel 배포가 없고 운영자가 명령줄로 직접 실행하며, 환경변수 `GEMINI_API_KEY`는 운영자 본인 실행에만 씁니다. 회원이 쓰는 기능으로 바꿀 때는 회원 본인 키 방식으로 새로 만들어야 합니다(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8).

본 프로그램은 `AIMaster_dev` 프로젝트 지침에 따라 개발된 **독립형 AI 자동 포스팅 프로그램**입니다.
지정된 키워드/주제에 대하여 **최근 24시간 실시간 뉴스**를 수집하고, **4대 신호 지표(트렌드, 노출빈도, 소셜언급, 사회적 파급력)**를 분석하여 구글·네이버 SEO에 최적화된 마크다운 포스트를 자동 작성 후 통합 DB (`AIMaster_dev`)에 저장합니다.

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 특정 주제어 지정 포스팅 실행
npm run start -- --topic "인공지능 AI"
# 또는
npm run start -- --topic "글로벌 증시"

# 3. 주제어 미지정 시 기본 대표 키워드 자동 포스팅
npm run start
```

## 구조

- `src/collector.ts`: 최근 24시간 뉴스 수집 & 4대 신호 랭킹 엔진
- `src/generator.ts`: 구글/네이버 SEO 최적화 마크다운 & FAQ 포스트 생성기
- `src/db.ts`: Supabase 통합 DB (`AIMaster_dev`) `blog_` 테이블 연동 저정기
- `src/index.ts`: 메인 CLI 실행기

## 2026-10-17 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/nanoBananaConfig.ts`: gemini-2.5-flash-image·gemini-3.1-flash-image → `gemini-nano-banana-2.1`, 주소 v1 → v1beta (기준: ai-image-studio v1.11).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시). 운영자 전용 도구라 배포·버전 없음, `tsc --noEmit` 통과.

## 2026-10-17 2026-10-17 — 이미지 생성 호출을 공용 기준 코드 `gemini-image-client`로 (1단계, Claude Code 윈도우)
- `src/geminiImage.ts`(사본) 추가, `src/imageGenerator.ts` `fetchNanoBananaSingleImage()`가 모듈로 위임(첫 조각만 보던 문제 수정). 실패하면 예전처럼 대체 이미지로 넘어감.
- 개선: 키를 주소 대신 요청 머리글(`x-goog-api-key`)로, 120초 시간 제한, 서버 오류·일시 혼잡·시간 초과만 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 필터 차단·이미지 없음·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·모델·화질·비율·생성 온도는 그대로.
- 검수: 운영자 전용 도구라 배포·버전 없음. `tsc` 통과, 실행 파일(dist) 다시 만듦. 실제 이미지 생성 시험은 하지 않음 — 이미지 생성 오류가 나면 그때 테스트 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`는 공용 기준 코드 `gemini-image-client`의 사본이다(기준: `ai-image-studio/lib/providers/geminiImage.ts`). 직접 고치지 않는다. 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync` → 사본을 쓰는 프로그램 모두 테스트·빌드·배포·버전 +0.01. 프롬프트·모델·화질·온도는 각 프로그램 값을 넘기는 구조라 모듈에서 바꾸지 않는다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 2026-10-17 — 이미지 생성 모델 목록 통합(공용 기준 코드 `gemini-image-models`) (Claude Code 윈도우)
- 주인님 지시("이미지 생성 모델 사용 관련 기능은 통합, 프로그램마다 다르게 나와야 하면 그때 프로그램별로 보완"). `src/nanoBananaConfig.ts`를 공용 모델 목록 사본으로 교체, 실행 파일(dist) 갱신.
- 통합 값(ai-image-studio v1.11 검증값):

| 등급 | 모델 | 기본 화질 | 온도 |
|---|---|---|---|
| nanobanana (1K 경량) | gemini-3.1-flash-lite-image | 1K | 0.7 |
| nanobanana-2-2k | gemini-nano-banana-2.1 | 2K | 0.7 |
| nanobanana-2-4k | gemini-nano-banana-2.1 | 4K | 0.7 |
| nanobanana-pro | gemini-3-pro-image | 4K | 0.4 |

- 이 프로그램에서 바뀐 값: 1K 등급 → `gemini-3.1-flash-lite-image`, Pro 온도 0.7 → 0.4.
- 호환: 불러오는 이름(`getNanoBananaConfig`·`NanoBananaModelType`·`NANO_BANANA_MODEL_OPTIONS`)·등급 키·옛 등급 이름(`nanobanana-2` → 기본 2K)은 그대로라 저장된 회원 선택값도 그대로 동작. 타입 검사·기존 테스트·빌드·배포·DB 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: 모델 설정 파일은 공용 기준 코드 `gemini-image-models`의 사본이다(기준: `ai-image-studio/lib/providers/nanoBananaModels.ts`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다(주인님 지시). 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- `src/geminiImage.ts` 사본을 `--sync`로 다시 받고 `npm run build`로 `dist/` 갱신(최종 이미지 선택·사용량·취소 신호 지원). 배포 없는 폴더.
