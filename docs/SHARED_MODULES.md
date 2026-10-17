# 공용 기준 코드 목록 (SHARED_MODULES.md)

> 2026-10-17 주인님 지시로 만든 기준 문서다. 모든 CLI(Claude Code·Codex·Antigravity)가 따른다.
> **비슷한 프로그램끼리 같은 기능이 있으면, 자동화가 가장 쉽고 결과물 품질이 높은 쪽 코드를 「기준」으로 정한다. 다른 프로그램은 그 기준 코드의 사본을 그대로 가져다 쓰고, 기준이 바뀌면 함께 업데이트한다.**

## 1. 원칙

1. **기준 하나, 사본 여러 개.** 같은 기능의 계산·처리 코드는 기준 파일 하나만 고친다. 다른 프로그램의 사본은 직접 고치지 않는다.
2. **프로그램끼리 서로 부르지 않는다.** 각 프로그램은 사본을 자기 폴더 안에 갖고 독립적으로 빌드·배포한다(핵심 원칙 1번 — 서브폴더 자기완결). 공용 서버나 다른 프로그램의 API를 호출하는 구조는 만들지 않는다. 한쪽 장애가 다른 쪽으로 번지지 않게 하고, 로그인·권한 연계를 늘리지 않기 위해서다.
3. **기준 코드에는 프로그램 고유 내용을 넣지 않는다.** 회원 키 읽기, 오류 문구, `server-only`, 화면 표시는 각 프로그램이 맡는다. 외부 호출 함수는 프로그램이 넘겨주는 방식(주입)으로 받는다. 회원 본인 키 원칙은 그대로다.
4. **기준을 고르는 기준(주인님 확정 순서, 2026-10-17)**: **① 자동화 프로그램의 안정성**(시간 제한·일시 오류 재시도·정확한 오류 안내·키 노출 방지·예외 처리·테스트) → **② 유지보수 용이성**(한곳만 고치면 되는 구조, 프로그램 고유 코드와 분리, 읽기 쉬움). 그다음이 결과물 품질·기능 범위다. 한 프로그램이 다 갖추지 못했으면 각 후보의 검증된 장점을 모아 새 기준 파일을 만든다(예: `youtube-data-client`). 고른 이유를 기준 파일 머리말과 아래 표에 적는다.
5. **화면·결과 표시는 각자 유지해도 된다.** 공용으로 맞추는 것은 "안쪽 엔진"이다. 메뉴와 회원 사용 방식은 바꾸지 않는다(따로 구독하는 별개 상품이라 메뉴를 없애지 않는다).
6. **이미지 생성 프롬프트의 내용·스타일은 공용으로 맞추지 않는다**(`docs/IMAGE_PROMPT_RULES.md` §0). 프롬프트 쪽에서 공용으로 맞출 수 있는 것은 "만드는 틀"(연도 주입, 한국인 기본 규칙 같은 공통 규칙 문장)까지다.

## 2. 고치는 절차

1. 기준 파일만 고친다 → 기준 프로그램의 테스트를 실행한다.
2. `node scripts/check-shared-modules.mjs --sync`로 사본에 반영한다(기준 내용으로 덮어씀).
3. `node scripts/check-shared-modules.mjs`로 전부 `OK`인지 확인한다(이미지 호출의 최악 시간이 300초 안인지도 함께 검사 — `OVER`면 실패).
4. 사본을 쓰는 **모든 프로그램**을 함께 고쳐 정상 동작하게 한다 — 기준의 함수 이름·반환 형식이 바뀌면 각 프로그램의 연결 코드도 같이 고친다. 프로그램마다 테스트·빌드·배포하고 버전을 각각 +0.01 올린다(코드 + DB `programs.version`).
   - **재배포 등급(2026-10-18 비용 절감)**: 회원에게 바로 영향이 있는 버그·이중 과금·보안 수정 → 사본 전체 즉시 배포. 문구·주석·내부 정리 → 사본은 `--sync`로 저장소에만 반영하고 그 프로그램을 다음에 배포할 때 함께 내보낸다(버전 +0.01도 그때). 아래 「미배포 사본」 표에 남긴다.
   - **완료 보고서에 프로그램별 과정과 결과를 표로 남긴다**(프로그램 · 바꾼 연결 파일 · 테스트/빌드 · 배포 · 버전 · 화면 확인). 하나라도 실패하면 완료로 보고하지 않는다.
5. 각 프로그램 `AGENTS.md`와 이 문서 §3 표의 「최근 변경」을 갱신한다.
6. 새 모듈을 추가하면 이 문서 §3 표, `scripts/check-shared-modules.mjs`의 `MODULES` 목록, [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md)(기능별 프로그램 지도)에 함께 넣는다.
7. **프로그램을 수정하거나 새로 만들 때는 먼저** [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md)에서 그 기능의 기준 코드가 있는지 확인하고, 있으면 사본으로 가져다 쓴다(새로 짜지 않는다).
8. **놓치기 쉬운 점검 항목**(시간 제한×재시도와 300초 한도, 이중 과금, 오류 감싸기, 테스트 기대값, 확장 버전, 배포 로그 오탐)은 [`SHARED_MODULE_CHECKPOINTS.md`](SHARED_MODULE_CHECKPOINTS.md)(공용 모듈 작업 필수 점검표)를 따른다.

## 3. 등록된 공용 기준 코드

| 모듈 id | 기능 | 기준(여기만 고침) | 사본 | 기준으로 고른 이유 | 최근 변경 |
|---|---|---|---|---|---|
| `youtube-data-client` | YouTube Data API 읽기 호출 — 15초 시간 제한, 서버 오류·네트워크만 1회 재시도, 키 가리기, 일일 한도/분당 제한/키 사용 제한 구분 안내(초기화 시각 서머타임 반영), 할당량 계산, 같은 요청 재사용 시간(선택) | `youtube-channel-consultant/src/lib/youtube/youtubeData.ts` (+ 테스트 `tests/youtubeData.test.mjs`) | `youtube-viral-studio/src/lib/youtube/youtubeData.ts`, `shorts-viral-studio/src/lib/youtube/youtubeData.ts` (+ 같은 테스트) | 단일 후보가 다 갖추지 못해 장점을 모아 새로 작성 — 오류 안내 범위(shorts 계열)+할당량 계산(consultant)+재시도·시간 제한·키 가리기 신규 | 2026-10-17 1단계 — consultant v1.09, viral-studio v1.18, shorts-viral-studio v1.10 / 2단계 — ai-auto-blog v1.68, tistory-auto-blog v1.75, naver-blog-agent v1.88, threads-content-ops v1.99, trending-product-finder v1.14 (2단계는 폴더 구조가 달라 공용 테스트 파일 없이 각 프로그램 기존 테스트로 확인) |
| `gemini-image-models` | 나노바나나 등급별 모델 이름·기본 화질·받는 화질·생성 온도·화면 이름(`getNanoBananaConfig`, `resolveImageSize`, `NANO_BANANA_MODEL_OPTIONS`) | `ai-image-studio/lib/providers/nanoBananaModels.ts` (+ 테스트 `tests/nanoBananaModels.test.mjs`) | 파일 이름은 프로그램마다 다르고 내용은 같음: ai-auto-blog·tistory-auto-blog `utils/news/nanoBananaConfig.ts`, naver-blog-seo-studio `lib/ai/nanoBananaConfig.ts`, naver-blog-auto-poster_app·_web `web/lib/naverBlogAutoPoster/nanoBananaConfig.ts`, shots `src/lib/ai/nanoBananaModels.ts`, blog_auto_poster `src/nanoBananaConfig.ts` | 주인님 지시로 통합(2026-10-17). 값은 이미지 레퍼런스 ai-image-studio v1.11 검증값. 프로그램별로 결과가 달라야 하면 그 프로그램에서 덮어써 보완 | 2026-10-17 — ai-image-studio v1.14, ai-auto-blog v1.70, tistory v1.77, seo-studio v1.68, shots v1.12, poster_app v1.08, poster-web v1.09 / 2단계 SNS 묶음 7곳(위와 같음) |
| `gemini-image-client` | Gemini(나노바나나) 이미지 생성 호출 — 키 머리글 전송, 120초 시간 제한, 서버 오류·혼잡·연결 실패만 1회 재시도(시간 초과는 이중 과금 방지로 재시도 안 함, 2026-10-18), 모든 조각에서 이미지 탐색, 안전 차단·이미지 없음·한도·키 오류 구분 안내, 키 가리기. **프롬프트·모델·화질·온도는 각 프로그램이 넘김(공용화하지 않음)** | `ai-image-studio/lib/providers/geminiImage.ts` (+ 테스트 `tests/geminiImage.test.mjs`) | `ai-auto-blog/utils/ai/`, `tistory-auto-blog/utils/ai/`, `naver-blog-seo-studio/lib/ai/`, `naver-blog-auto-poster_app/web/lib/naverBlogAutoPoster/`, `naver-blog-auto-poster_web/web/lib/naverBlogAutoPoster/`, `shots/src/lib/ai/`, `blog_auto_poster/src/` (각 `geminiImage.ts`) | 레퍼런스 어댑터 포함 후보 모두 재시도·안전 차단 안내가 없어 새로 작성. 이미지 레퍼런스 프로그램(ai-image-studio)에 둠 | 2026-10-17 1단계 — ai-image-studio v1.13, ai-auto-blog v1.69, tistory v1.76, seo-studio v1.67, poster_app v1.07, poster-web v1.08, shots v1.11, blog_auto_poster(배포 없음) / 2단계 SNS 묶음 — insta v1.18, threads v1.12, threads-affiliate-poster v1.57, naver-cafe-poster v1.11, naver-blog-agent v1.89, naver-blog-allinone v1.44 · threads-content-ops v2.00 / 3묶음 단일 주소형 — kakao v1.12, stepmail v1.12, auto-detail-page v1.09, tarot v1.09, mbti-character v1.10, music v1.12 / 4묶음 A 직접 호출형 — cardnews v1.11, style-dna v1.18, shop-detail v1.11, blog-content-maker v1.06, blog-workroom v1.08, music-video v1.07, emotion-writer v1.11, photo-remake v1.05, shorts-onestop v1.15, seo-thumbnail-pro v1.06 / 기준 갱신(최종 이미지 선택·사용량·취소 신호 `signal`) — 기존 사본 20곳 +0.01 재배포 / 시간 초과 안내 통일(「이미 만들어졌을 수 있으니 결과 확인 뒤 다시 시도」, 이중 과금 방지) — 사본 30곳 +0.01 재배포 / 2026-10-18 시간 초과 자동 재시도 중단(서버 오류·혼잡·연결 실패만 재시도) — 사본 30곳 +0.01 재배포 / 2026-10-18 시간 초과 안내를 「Google AI Studio 사용량 확인」으로 정정(결과는 저장되지 않으므로) — 사본 30곳 +0.01 재배포 / 2026-10-18 4묶음 B SDK 사용형 — playlist-channel-studio v1.14 · four-cut-comics v1.10 · thumbnail-master v1.06 · portrait-photo v1.21 · banana-canvas v1.07 · fashion-style v1.08 · allinone-graphic v1.07 · cinematic-storyboard-studio v1.09 · ai-influencer-studio v1.11 |
| `youtube-golden-engine` | 키워드로 최근 인기 영상을 찾아, 구독자는 적은데 평균 조회수가 높은 채널(황금·공략 채널)을 고름 | `youtube-channel-consultant/src/lib/youtube/goldenEngine.ts` (+ 테스트 `tests/goldenEngine.test.mjs`) | `youtube-viral-studio/src/lib/youtube/goldenEngine.ts` (+ 같은 테스트) | 조건이 더 많음(기간·영상 길이·국가·검색 깊이), 할당량 계산, 구독자 비공개 채널 제외(0명 취급 안 함), 테스트 있음 | 2026-10-17 통합 — consultant v1.08, viral-studio v1.17 |

## 4. 공용화 후보 (지금 작업하지 않음 — 2026-10-17 주인님 언급)

여러 프로그램이 같은 기능을 각자 구현하고 있는 대표 영역이다. 착수할 때는 대상 프로그램들의 코드를 비교해 기준을 고르고, 개발 플랜을 먼저 주인님께 보여 드린다.

| 영역 | 현재 상태 | 공용으로 맞출 범위(안) | 참고 |
|---|---|---|---|
| AI 이미지 생성 | 모델·엔드포인트 기준은 이미 ai-image-studio(`lib/providers/adapters/`). 프로그램마다 호출 코드는 따로 있음 | 모델 호출·대기·이미지 받아오기 코드. **프롬프트 내용은 제외** | 루트 `CLAUDE.md` 「이미지 생성 레퍼런스 규칙」, `docs/IMAGE_MODEL_AUDIT_20261017.md` |
| 이미지·글 프롬프트 만드는 틀 | 연도 주입·한국인 기본 규칙 문장이 프로그램마다 복사돼 있음 | 공통 규칙 문장과 조립 함수(틀)만. 프로그램별 컨셉·스타일 문장은 각자 | `docs/IMAGE_PROMPT_RULES.md`, 핵심 원칙 8번 |
| 외부 데이터 수집(스크래핑·RSS·검색) | 블로그·쓰레드·인스타·트렌드 프로그램마다 수집 코드가 따로 있음 | 주소 검사(SSRF 차단)·시간 제한·본문 추출·오류 처리 | `docs/PLATFORM_PATTERNS.md`(AI 3종 수집), `website-scraper` SSRF 교훈(`docs/ERROR_LESSONS.md` 2026-10-16) |
| 유튜브 데이터 조회 | 유튜브 계열 5~6개 프로그램이 각자 YouTube API 호출·할당량 안내 | 호출·한도 소진 안내·할당량 계산 | 이번 `youtube-golden-engine`이 첫 사례 |

## 미배포 사본 (급하지 않은 기준 변경 — 다음 배포 때 함께 나감)

| 기준 변경(날짜·내용) | 아직 배포 안 된 프로그램 | 비고 |
|---|---|---|
| (현재 없음 — 2026-10-18까지의 변경은 모두 배포됨) | | |
