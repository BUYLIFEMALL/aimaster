# 네이버 블로그 SEO 스튜디오 — 최신 CLI 인수인계

최종 갱신: 2026-10-01 / 기준 버전: v1.52

이 문서는 Codex·Claude Code·Gemini CLI가 다음 작업을 바로 이어갈 수 있도록 현재 제품 상태와 변경 주의사항만 정리한 최신 인수인계 문서입니다. 시작 전 루트 `AGENTS.md`, 프로젝트 `AGENTS.md`, `README.md`도 함께 읽습니다.

## 제품 역할과 안전 경계

- 웹 스튜디오가 제목, 완성형 블로그(원문), 대표·본문 이미지를 만들고 사용자가 수정합니다.
- Chrome 확장은 완성된 콘텐츠를 네이버 SmartEditor에 입력하고 카테고리·태그 설정 창을 여는 역할만 합니다.
- 네이버의 **최종 발행 버튼은 절대 자동으로 누르지 않습니다.** 사용자가 직접 확인·발행합니다.
- 모든 AI 호출은 회원이 `API키등록·플랫폼연동`에 직접 등록한 자기 키를 사용합니다. 운영자 키 폴백이나 다른 회원 키 공유는 금지입니다.
- 네이버 공식 API가 없으므로 SmartEditor 자동화는 실제 DOM을 분석한 뒤 CDP의 사람 입력 방식으로 처리합니다. 추측성 선택자 추가, 즉시 값 대입, 대량 자동 행동을 하지 않습니다.

## 최신 구현: 본문 생성 다중 모델

`/dashboard#title`에서 제목을 선택한 뒤 표시되는 **본문 생성 플랫폼 / 본문 생성 모델** 카드에서 다음 제공자를 선택할 수 있습니다.

| 플랫폼 | 모델 예시 | 사용하는 사용자 키 |
| --- | --- | --- |
| OpenAI | GPT-4.1, GPT-5 계열 | `openai` |
| Anthropic Claude | Claude Haiku 4.5, Sonnet 5, Opus 5 | `anthropic` |
| Google Gemini | Gemini Flash, Gemini Pro 계열 | `gemini` |

- 선택한 플랫폼을 바꾸면 해당 플랫폼의 모델 목록과 기본 모델이 함께 바뀝니다.
- 본문 생성 요청은 `provider`, `model`을 `/api/drafts/generate`로 전달하고, 서버는 같은 provider의 키가 없을 때만 해당 키 등록 안내를 반환합니다.
- Claude는 Messages API, Gemini는 `generateContent` API, OpenAI는 Chat Completions API를 사용합니다. 응답은 공통 JSON(`title`, `body`, `seoReport`)으로 파싱합니다.
- 본문이 공백 제외 2,000자 미만이면 같은 선택 모델에 확장 요청을 한 번 더 수행하고, 그래도 기준 미달이면 저장하지 않고 오류를 반환합니다.
- 제목 추천, 기존 글 분석/최적화, 본문 핵심 문장 추출은 기존 OpenAI 경로를 유지합니다. 특히 본문 문장 매칭 이미지 생성에는 OpenAI(문장·프롬프트 분석)와 Gemini(이미지 생성) 키가 모두 필요합니다.

### 관련 파일

- 모델 카탈로그·제공자 판별: `lib/ai/contentModels.ts`
- 제공자별 JSON 생성 API 어댑터: `lib/ai/contentJson.ts`
- SEO 원문 프롬프트·2,000자 보강: `lib/ai/generator.ts`
- 본문 생성 API·권한·키 판별: `app/api/drafts/generate/route.ts`
- 제목 선택 화면 모델 UI: `components/StudioPage.tsx`
- Claude 키 등록 UI: `app/settings/ApiKeySettings.tsx`, `app/settings/page.tsx`, `app/api/settings/api-key/route.ts`
- API 키 조회 허용 타입: `lib/apiKeys.ts`

### UI 유지보수 주의

- 기존 OpenAI 전용 모델 제어부는 `StudioPage.tsx`의 제목 전략 카드 안에 남아 있으나, `app/globals.css`의 `.title-strategy-section .content-generation-models { display: none; }`로 숨겼습니다.
- 실제 사용 제어부는 그 아래의 `.content-model-selection` 카드(`content-provider-selector`, `content-model-selector`)입니다. 레이아웃을 정리할 때는 숨겨진 기존 제어부를 삭제하고 새 카드만 제목 전략 카드 안으로 옮기는 리팩터링을 권장합니다. 이때 브라우저 회귀 테스트의 선택자도 함께 갱신합니다.

## 콘텐츠·이미지·확장 전달 흐름

1. 사용자가 제목·전략·페르소나·본문 생성 플랫폼/모델을 선택합니다.
2. 웹 앱이 블로그(원문)를 생성합니다. 이미지 자동 생성 선택 시 대표 1장과 본문 매칭 이미지 2장(선택 시 3장)을 생성합니다.
3. `블로그(원문) 편집기`에서 문단·이미지 순서·전송 제외 상태를 수정하고 `수정 내용 저장`을 누릅니다.
4. `Chrome 확장으로 전송`은 저장된 동일 콘텐츠 블록을 확장 라이브러리에 전달합니다.
5. 확장은 제목 → 대표 이미지 → 본문 텍스트/이미지 블록 순으로 SmartEditor에 입력하고 DOM으로 결과를 검증합니다.
6. 입력 검증 성공 뒤 카테고리·태그를 자동 입력하고 `최종 발행 준비 완료`로 표시합니다. 마지막 발행만 사용자 직접 클릭입니다.

## 대시보드 좌측 메뉴

- `components/StudioPage.tsx`의 좌측 메뉴는 상단 `← 다른 프로그램 보기`를 `https://www.buylife.xyz/blog/dashboard`로 연결합니다.
- 그 아래 `🏠 대시보드`, 번호형 1~4 작업 흐름, 구분선, `🔑 API키등록·플랫폼연동` 순서로 구성합니다.
- 작업 흐름은 제목 추천, 새 글 만들기, 기존 글 최적화, 생성 기록이며 각 항목은 이모티콘·번호 원형 배지·한 줄 설명을 함께 표시합니다.
- 스타일은 `app/globals.css`의 `.sidebar-back`, `.nav-overview`, `.nav-flow`, `.nav-number`, `.nav-utility`가 담당합니다. 메뉴 순서나 표현을 바꿀 때 이 구조를 유지합니다.

## 버전·배포 불변 규칙

웹 앱과 Chrome 확장은 반드시 같은 공개 버전을 사용합니다. 기능 또는 문서 작업 세트가 끝나면 아래를 모두 수행합니다.

1. `lib/version.ts`의 `APP_VERSION`
2. `extension/manifest.json`의 `version`, `version_name`
3. 공용 Supabase `programs` 테이블의 `naver-blog-seo-studio` 행 `version`
4. `README.md`, `AGENTS.md`, 최신 인수인계 문서의 버전·ZIP 경로
5. `npm.cmd run extension:archive`로 ZIP 생성 및 직전 ZIP 교체
6. lint → 브라우저 회귀 테스트 → build → commit → push → production deploy → ZIP HTTP 200 확인

현재 배포 명령:

```powershell
cd D:/Antigravity/AIMaster/naver-blog-seo-studio
npm.cmd run lint
npm.cmd run test:browser
npm.cmd run build
npm.cmd run extension:archive
git add -- <변경 파일>
git commit -m "<type>(seo-studio): <summary> (vX.XX)"
git push origin master
vercel.cmd deploy --prod --yes --scope buylife
curl.exe -I https://naver-blog-seo-studio.vercel.app/downloads/naver-blog-seo-studio-extension-vX.XX.zip
```

프로젝트 정보: Vercel `buylife/naver-blog-seo-studio`, Supabase project id `esgxyikcnnvmlhygjkth`, branch `master`.

## 검증 상태와 다음 작업 시 주의

- v1.42에서 lint, `npm run test:browser`(20 통과 / 1 skip), Next production build, 확장 ZIP HTTP 200을 확인했습니다.
- 모델 생성은 유료 사용자 API 키를 사용하므로 자동 실호출 테스트를 하지 않았습니다. Claude/Gemini 실사용 점검은 키가 등록된 테스트 계정으로 한 모델씩 수행해야 합니다.
- 로그인 필요 페이지는 curl로 본문 UI까지 검증할 수 없습니다. 배포 후 로그인 세션에서 제목 추천 → 플랫폼 전환 → 모델 선택 → 본문 생성 흐름을 확인합니다.
- DB 스키마 변경이 필요할 때만 새 migration을 만들고 운영 DB 적용 여부를 별도로 검증합니다. 이번 Claude 추가는 공용 `user_api_keys.provider`에 이미 `anthropic`이 허용되어 있어 스키마 변경이 없었습니다.
