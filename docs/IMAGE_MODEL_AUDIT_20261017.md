# 구형 이미지 모델 사용 프로그램 점검 목록 (2026-10-17, Claude Code 윈도우)

> 기준: 이미지 레퍼런스 프로그램 **ai-image-studio v1.11**(`ai-image-studio/lib/providers/adapters/gemini.ts`). 루트 `CLAUDE.md` 「이미지 생성 레퍼런스 규칙」.
> **2026-10-17 전체 교체 완료(아래 §5).** 원칙(주인님 지시): 구형 모델 제거 → 최신 모델 교체, 그리고 이를 위한 **엔드포인트·대기 시간·생성된 이미지 받아오는 부분만** 수정. 이미지 생성 프롬프트(생성 방식·스타일·내용)와 생성 설정은 기존값 유지. **실제 이미지 생성 시험은 하지 않았다 — 비용 때문에 일괄 검증하지 않고, 프로그램 사용 중 이미지 생성 오류가 나거나 필요할 때 그때 테스트 검증한다.** 각 파일 맨 위(또는 바꾼 줄)에 같은 내용의 주석을 남겼다.

## 1. 왜 점검하나
| 구형 모델 | 상태(Google 공식 문서) | 대체(ai-image-studio v1.11과 동일) |
|---|---|---|
| `imagen-3.0-generate-002` 등 Imagen | 2025-11-10 종료("Imagen models are shut down") | `gemini-nano-banana-2.1` |
| `gemini-2.5-flash-image` | 가격표에 2026-10-02 종료 예정 구형으로 표시 | `gemini-nano-banana-2.1`(1K/2K/4K) 또는 최저가 `gemini-3.1-flash-lite-image`(1K) |
| `gemini-3-pro-image-preview` | 2026-06-25 종료 예정 미리보기판(정식 `gemini-3-pro-image` 출시) | `gemini-3-pro-image` |
| `gemini-3.1-flash-image` | 2026-10-06 지원 종료 예고(종료일 미정) | `gemini-nano-banana-2.1` |

호출 방식: REST `.../v1beta/models/<모델>:generateContent` + `generationConfig.responseModalities: ["IMAGE"]` + `imageConfig: { aspectRatio, imageSize }`. 한국인 기본 인물 지시문(핵심 원칙 3) 포함. 상세 코드는 ai-image-studio 어댑터를 그대로 참고.

## 2. 처리 완료
| 프로그램 | 버전 | 내용 |
|---|---|---|
| `yt-playlist-studio` | v1.10 | Imagen → `gemini-nano-banana-2.1`(16:9 기본 2K), 시험 1K 1장 성공 |
| `ai-image-studio` | v1.11 | 구글 모델 4개 최신 정식 교체, 시험 3장 성공 |

## 3. 점검 대상(구형 모델 이름이 코드에 있는 곳 — 대체 목록·주석·폴백일 수도 있어 파일별 확인 필요)
`shorts-onestop-studio`(DesignView.tsx, media.ts) · `style-dna-analyzer`(dnaPrompts.ts, dna/types.ts, api/refine, api/analyze, ai/imageModels.ts) · `seo-thumbnail-pro` · `allinone-graphic` · `ai-influencer-studio` · `detail-page-12p` · `portrait-photo` · `banana-canvas` · `thumbnail-master` · `fashion-style` · `playlist-channel-studio` · `cinematic-storyboard-studio` · `vinyl-lp-studio` · `ebook-studio` · `naver-blog-allinone` · `naver-blog-agent` · `ai-webtoon-studio` · `cardnews-studio` · `threads-content-ops` · `threads-affiliate-poster`(generator.ts, imageGenerator.ts) · `tistory-auto-blog`(nanoBananaConfig.ts, editorImage.ts) · `ai-auto-blog`(editorImage.ts, news/nanoBananaConfig.ts) · `naver-blog-seo-studio` · `naver-blog-auto-poster_app` · `naver-blog-auto-poster_web` · `tarot` · `threads` · `mbti-character` · `naver-cafe-poster` · `kakao_auto_poster` · `auto-detail-page` · `stepmail` · `shots` · `shop-detail-page` · `insta_auto_poster` · `blog_auto_poster` (`scratch/`는 참고 자료라 제외)

검색 명령(재현): 저장소 루트에서 `node_modules`·`.next`·`.vercel`·`docs`를 빼고 `gemini-2\.5-flash-image|gemini-3-pro-image-preview|imagen-3\.0|imagen-4`를 TypeScript 파일에서 찾음(2026-10-17 결과 44곳 + 처리 완료 2곳).

## 4. 다음 첫 단계
1. 사용자가 많은 프로그램부터(예: 블로그·쓰레드·인스타 자동화) 한 곳씩: ACTIVE_WORK 확인 → 해당 파일이 실제 호출에 쓰는지(대체 목록·주석인지) 확인 → ai-image-studio 어댑터 방식으로 교체 → 시험 1K 1장(가장 저렴) → 배포·문서.
2. 다른 CLI가 작업 중인 폴더는 건드리지 않는다. 같은 모델 설정 파일을 여러 프로그램이 복사해 쓴 경우(`nanoBananaConfig.ts`)는 프로그램별로 따로 고친다.

## 5. 2026-10-17 교체 결과 (Claude Code 윈도우)

**교체 기준(ai-image-studio v1.11과 같음)**: `gemini-3.1-flash-image`·`gemini-3.1-flash-image-preview` → `gemini-nano-banana-2.1` / `gemini-3-pro-image-preview` → `gemini-3-pro-image` / `gemini-2.5-flash-image` → `gemini-nano-banana-2.1`(단일 모델·2K 이상 가능 위치) 또는 `gemini-3.1-flash-lite-image`(경량 1K 등급이 따로 있는 프로그램 — 등급 중복 방지) / Imagen(`predict`·`generateImages`) → `gemini-nano-banana-2.1` `generateContent` + 응답 `candidates[0].content.parts[].inlineData`로 이미지 받기. 호출 주소는 `v1beta`.

| 묶음 | 프로그램(버전) |
|---|---|
| 블로그·확장 | ai-auto-blog v1.67, tistory-auto-blog v1.74, naver-blog-seo-studio v1.66, naver-blog-agent v1.87, blog-content-maker v1.05, naver-blog-allinone v1.43, naver-blog-auto-poster(_app) v1.06, naver-blog-auto-poster-web v1.07 — 확장 6개 `check-extension-release.mjs` OK |
| SNS·마케팅 | shots v1.10, insta_auto_poster v1.17, threads v1.11, threads-affiliate-poster v1.56, threads-content-ops v1.98, naver-cafe-poster v1.10, kakao_auto_poster v1.11, stepmail v1.11, cardnews-studio v1.10 |
| Imagen 사용(호출·응답 코드 변경) | yt-playlist-studio v1.12, ai-webtoon-studio v1.11, ebook-studio v1.07, detail-page-12p v1.07(기본 경로에 텍스트 모델이 들어가 있던 것도 이미지 모델로), vinyl-lp-studio v1.10 |
| 이미지·디자인 | style-dna-analyzer v1.17, playlist-channel-studio v1.13(예전 저장값 변환표), shop-detail-page v1.10, auto-detail-page v1.08, thumbnail-master v1.05, seo-thumbnail-pro v1.05, portrait-photo v1.20, banana-canvas v1.06, fashion-style v1.07, allinone-graphic v1.06, cinematic-storyboard-studio v1.08, ai-influencer-studio v1.09, photo-remake-studio v1.04 |
| 기타 | tarot v1.08, mbti-character v1.09, music v1.11, blog-workroom v1.07, four-cut-comics v1.09, music-video-studio v1.06, emotion-writer v1.10, shorts-onestop-studio v1.14, blog_auto_poster(운영자 도구, 배포 없음) |

- 검수: 프로그램마다 `npm run build` 통과 → Vercel 프로덕션 배포 → DB `programs.version` 갱신 → 커밋·푸시. 배포 후 43개 주소 응답 정상(200/307). **실제 이미지 생성 시험: 0회(주인님 지시).**
- 남은 위험: ① `mbti-character`는 환경변수 `GEMINI_IMAGE_MODEL`이 있으면 그 값을 쓴다(값은 확인 안 함 — 구형이면 오류 시 이 변수부터 확인). ② 회원이 예전에 고른 모델 값을 DB·브라우저에 저장해 둔 프로그램은 대부분 목록에 없는 값이면 기본값으로 돌아가지만, 그대로 보내는 곳이 있을 수 있다 — 오류가 나면 해당 프로그램의 저장값 처리부터 확인. ③ 프롬프트·화면 문구에 남은 옛 모델 이름(예: naver-blog-allinone 설정 화면 설명)은 "연동 부분만" 원칙으로 그대로 뒀다.
- 이미지 생성 프롬프트 작성 기준: [`docs/IMAGE_PROMPT_RULES.md`](IMAGE_PROMPT_RULES.md)(프로그램별 고유, 공유 금지).
