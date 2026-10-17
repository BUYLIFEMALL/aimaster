# 구형 이미지 모델 사용 프로그램 점검 목록 (2026-10-17, Claude Code 윈도우)

> 기준: 이미지 레퍼런스 프로그램 **ai-image-studio v1.11**(`ai-image-studio/lib/providers/adapters/gemini.ts`). 루트 `CLAUDE.md` 「이미지 생성 레퍼런스 규칙」.
> **아직 아무것도 고치지 않은 목록이다.** 프로그램마다 따로(한 번에 하나) 점검·교체하고, 실제 생성 시험은 비용 규칙(진행 가능한 가장 저렴한 설정, 최소 1장)과 주인님 승인 범위를 따른다.

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
