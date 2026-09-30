# 이미지 생성 로직 비교 — SEO 스튜디오 ↔ BLOG(원문)생성 자동화

> **⚠️ 방향 정정 (2026-09-30)**: 주인님 의도는 반대 방향이었다 — "BLOG 원문 자동화의 이미지 퀄리티가 떨어지니 **SEO 스튜디오의 로직·프롬프트를 BLOG에 반영**". BLOG 쪽 개편은 완료됐고(`blog/AGENTS.md` "이미지 생성 로직"), SEO 스튜디오 코드는 바꾸지 않았다. 아래는 두 프로그램 비교 자료로만 보존한다.

> 작성: 2026-09-30 (Claude Code) / 기준: SEO 스튜디오 v1.43, BLOG(원문)생성 자동화(`blog/`, slug `ai-auto-blog`)
> 목적: SEO 스튜디오의 대표·본문 이미지 품질을 BLOG 프로그램의 "마스터 사진 프롬프트" 방식으로 끌어올린다.
> 상태: **분석·계획만 완료, 코드 변경 없음.** 아래 §5 결정 사항을 주인님이 정하면 §6 순서로 구현한다.

---

## 1. 현재 SEO 스튜디오 이미지 로직 (v1.43)

| 단계 | 파일 | 동작 |
|---|---|---|
| 대표 이미지 1장 | `app/api/images/generate/route.ts` → `lib/ai/nanoBanana.ts` | **주제·제목·키워드만으로** 짧은 영어 문장 1개를 만들어 나노바나나 호출. 본문 내용은 반영하지 않음 |
| 본문 이미지 2~3장 | `app/api/images/generate-content/route.ts` → `lib/ai/contentVisuals.ts` | ① **OpenAI**(회원이 고른 콘텐츠 모델, temperature 0.25)가 본문에서 서로 다른 핵심 문장 2~3개를 **원문 그대로** 고르고 문장마다 짧은 영어 프롬프트 작성 ② 문장마다 나노바나나 1장 생성 |
| 1장 다시 만들기 | `app/api/images/regenerate-content/route.ts` | 저장된 그 문장의 프롬프트로 다시 생성 |
| 실패 대비 | `contentVisuals.ts` `fallbackVisuals()` | OpenAI 실패 시 본문 문장을 고르게 뽑아 고정 틀 프롬프트 사용 |
| 이미지 모델 | `lib/ai/geminiModels.ts`, `nanoBananaConfig.ts` | NanoBanana 표준(2.5 flash image 1K) / 2(3.1 flash image 2K·4K) / Pro(3 pro image 4K), 기본 2K |
| 저장 | Supabase Storage `naver-blog-seo-images`, 초안 `image_path` / `seo_report.contentImages[{slot, sentence, prompt, path}]` | 플랫폼 규칙(§12, Cloudinary 안 씀)에 맞음 |
| 필요한 회원 키 | — | 대표: Gemini / 본문: **OpenAI + Gemini 둘 다** |

**약점**
- 프롬프트가 한두 줄로 짧아 카메라·렌즈·조명·구도·금지 요소 지시가 거의 없음 → 사진 품질·일관성이 BLOG보다 낮음.
- 대표 이미지가 본문과 무관한 "주제 일반 사진".
- 본문 이미지에 OpenAI 키까지 필요(회원 부담).

## 2. BLOG(원문)생성 자동화 이미지 로직

| 단계 | 파일 | 동작 |
|---|---|---|
| 프롬프트 설계 | `blog/utils/news/imageGenerator.ts` `generateArticleBasedImagePrompts()` | **Gemini `gemini-2.5-flash`**(JSON 응답, temperature 0.3)가 생성된 본문 문단 3개를 읽고 문단마다 **"마스터 사진 프롬프트"** 1개씩 작성 |
| 이미지 생성 | 같은 파일 `fetchNanoBananaSingleImage()` | 나노바나나(같은 모델 설정표)로 대표 1 + 본문 2장, 섹션 소제목 바로 아래에 배치(`utils/news/generator.ts`) |
| 프롬프트 공개 | `generator.ts` "🎨 생성 이미지 AI 프롬프트" 섹션, `utils/stripImageSchema.ts` | 글 아래에 사용한 프롬프트를 박스로 보여주고 복사 버튼 제공 |
| 편집기 즉석 생성 | `blog/utils/ai/editorImage.ts` | 편집기 툴바에서 프롬프트 1줄로 1장 생성 |

**마스터 사진 프롬프트 규칙 (이식 대상의 핵심)** — `generateArticleBasedImagePrompts()`의 지시문 7개 항목
1. 문단의 주체·행동·장소·분위기·시각 요소를 파악해 **하나의 사진 장면**으로 (여러 컷·분할·콜라주 금지)
2. 고정 시작 문구: `Create a sense of adventure, courage, and realism with a single photorealistic scene of …`
3. "one unified scene in a single frame, not a collage, not a split screen, not a storyboard, not multiple panels" 필수 포함
4. 실사 사진만, 인물은 **기본 한국인/동아시아인**(해외 유명인·해외 배경이 명시된 경우만 예외), 손·비율 자연스럽게
5. **카메라·렌즈·노출·조명 지정**: Sony A7R IV / Canon EOS R5 / Nikon Z8 중 1, 35·50·85mm 단렌즈, f/1.8~4, 1/160~1/1000s, ISO 100~800, 5200~6500K, 조명 프리셋 + 긴 실사 품질 문구
6. 구도: 삼등분, 전·중·후경 층, 16:9, 4K, 글자 없음
7. **필수 부정어 블록**(일러스트·3D·콜라주·왜곡된 손·워터마크·과한 HDR 등 금지)을 끝에 부착
- 결과는 `cleanAsciiPrompt()`로 한글·특수문자를 제거한 영어만 사용

**이식하면 안 되는 부분 (플랫폼 규칙 위반)**
| BLOG 코드 | 문제 | 근거 |
|---|---|---|
| `process.env.GEMINI_API_KEY` / `NANOBANANA_API_KEY` 폴백 | 회원 키가 없으면 **운영자 키로 대신 호출** | 핵심 원칙 4번·멀티테넌시 3번(폴백 금지) |
| `image.pollinations.ai` 대체 이미지 | 실패 시 외부 무료 서비스의 임의 그림을 넣음(회원 모르게 품질 저하) | 지어낸 결과 금지 취지 |
| Cloudinary 업로드 / base64 본문 삽입 | 저장 방식이 플랫폼 표준과 다름 | `CLAUDE.md` "AI 이미지는 Supabase Storage" / PLATFORM_PATTERNS §12 |
| 문단 번호 고정(문단 1·2·3) | SEO 스튜디오는 편집기 블록·문장 매칭 구조라 맞지 않음 | — |

## 3. 비교 요약

| 항목 | SEO 스튜디오(현재) | BLOG | 업그레이드 방향 |
|---|---|---|---|
| 프롬프트 품질 | 짧은 1~2줄 | 7개 규칙의 긴 전문 사진 프롬프트 | **BLOG 규칙 이식** |
| 대표 이미지 | 주제 일반 사진 | 본문 1문단 기반 | **본문(도입부) 기반으로** |
| 본문 이미지 위치 | 원문 핵심 문장에 정확히 매칭 | 섹션 소제목 아래 고정 | **SEO 스튜디오 방식 유지**(편집기·확장 전송과 연결돼 있음) |
| 프롬프트 설계 AI | OpenAI(회원 모델) | Gemini 2.5 flash | §5-1 결정 |
| 필요 키 | OpenAI + Gemini | Gemini만 | Gemini로 통일 시 **Gemini 하나** |
| 실패 대비 | 안전한 문장 폴백 | 운영자 키·외부 이미지 폴백 | **SEO 스튜디오 방식 유지** + 폴백 프롬프트도 마스터 규칙으로 |
| 프롬프트 보기 | `seo_report.contentImages[].prompt`에 저장만 | 글 아래 박스+복사 | §5-4 결정 |

모델 확인(2026-09-30, Gemini 모델 목록 무료 조회): `gemini-2.5-flash`, `gemini-2.5-flash-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image` 모두 제공 중.
`gemini-3.5-flash`, `gemini-3.6-flash` 등 최신 텍스트 모델도 있어 프롬프트 설계기를 최신 모델로 바꿀 수 있다.

## 4. 구현 설계 (결정 후 적용)

1. **`lib/ai/imagePromptRules.ts` (신규)** — BLOG의 7개 규칙 지시문, 필수 부정어 블록, 한국인 기본 규칙, `cleanAsciiPrompt()`, 마스터 규칙 폴백 템플릿을 한 곳에 모은다.
2. **`lib/ai/contentVisuals.ts`** — `selectContentVisuals()`는 "원문 문장 정확히 고르기"는 그대로 두고, 문장마다 만드는 프롬프트를 마스터 규칙으로 작성하게 지시문 교체. 선택한 설계 엔진(§5-1)으로 호출. 폴백도 마스터 규칙 템플릿 사용.
3. **대표 이미지** — `/api/images/generate`가 초안 본문의 도입부(첫 문단/요약)를 같은 설계기로 마스터 프롬프트화 후 생성(§5-2).
4. **`lib/ai/nanoBanana.ts`** — `sceneDescription`이 이미 완성된 마스터 프롬프트일 때는 앞뒤 문장을 덧붙이지 않고 그대로 보내도록 분기(중복 지시 방지).
5. **키 안내** — 필요한 키 조합이 바뀌면 `generate-content`의 키 확인·안내 문구와 설정 화면 설명 갱신.
6. **(선택) 프롬프트 보기** — 편집기 이미지 블록에 "사용한 프롬프트 보기/복사" 추가(§5-4).
7. 기존 초안(이미 저장된 `contentImages`)은 그대로 두고 새로 생성·재생성할 때만 새 방식 적용 → DB 스키마 변경 없음.

## 5. 주인님 결정이 필요한 것

1. **프롬프트 설계 AI**: (추천) **Gemini로 통일** — 본문 이미지에 Gemini 키 하나만 있으면 됨, BLOG와 같은 동작 / 또는 지금처럼 OpenAI(회원이 고른 모델) 유지
2. **대표 이미지**: (추천) **본문 도입부 기반**으로 변경 / 또는 지금처럼 주제 기반 유지
3. **고정 시작 문구** `Create a sense of adventure, courage, and realism…`: 모든 주제(요리·육아·재테크 등)에 "모험·용기" 분위기를 강제한다.
   (추천) **문구만 빼고 나머지 규칙은 그대로** / 또는 BLOG와 똑같이 유지
4. **프롬프트 보기/복사**: 편집기에서 이미지별 프롬프트를 보여줄지 (선택 기능)

## 6. 작업 순서·검증 (SEO 스튜디오 배포 규칙 준수)

1. 시작 전 `git status --porcelain -- naver-blog-seo-studio`로 Codex의 커밋 안 된 변경 확인
2. §4 구현 → `npm.cmd run lint` → `npm.cmd run test:browser` → `npm.cmd run build`
3. 앱·확장 버전 함께 +0.01(`lib/version.ts`, `extension/manifest.json` version·version_name, DB `programs.version`), `npm.cmd run extension:archive`
4. 커밋·푸시·`vercel deploy --prod` → ZIP HTTP 200 확인
5. 실제 생성 확인은 회원 키로 비용이 드는 호출이라 **주인님 승인 후** 테스트 계정으로 대표 1 + 본문 2장 1회만 실행
6. 이 문서·`CLI_HANDOFF_2026-09-30.md`·`README.md`에 결과 기록
