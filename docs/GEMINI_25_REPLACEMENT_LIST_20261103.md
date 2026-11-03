# gemini-2.5 교체 목록 — 회원 프로그램 (2026-11-03 조사, 코드 변경 없음)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini] · 주인님 지시 「gemini-2.5 교체 목록 만들기 — 회원 프로그램만 추린 조사, 코드는 고치지 않음」
관련 요청함: `11d623ef`(음악 세션, 「gemini-2.5 사용 프로그램 전체 점검 여부 결정」).
조사 범위: 각 프로그램 폴더의 실제 코드(`.ts/.tsx/.js/.mjs`). 제외: `node_modules`·빌드 결과·`docs`·시험·`scratch`·참고용 사본·배포 키트·`scripts`.

## 0. 결론 요약
- **이미지 모델 `gemini-2.5-flash-image`(2026-10-02 종료)는 2026-10-17에 모두 교체됨.** 남은 곳은 교체 기록 주석과 옛 저장값 → 새 모델 변환뿐이라 할 일 없음.
- **글 모델(`gemini-2.5-flash`·`-pro`·`-flash-lite`)이 남아 있음.** 종료 공지는 저장소에서 확인하지 못함(`docs/ERROR_LESSONS.md`에는 「존재하지 않는 `gemini-2.5-flash`」 기록이 있어 상반됨 — `docs/IMAGE_CONSOLIDATION_TASKS.md` IM-U6). 종료되면 아래 A그룹은 기능이 바로 멈춘다.
- 음성 `gemini-2.5-flash-preview-tts` 3곳은 저장소에 대체 모델 기록이 없음 → 공식 목록 확인 먼저.

## 1. 바꿀 모델 — Google 공식 문서 확인(2026-11-03, aistudio.google.com/docs/models·deprecations·pricing)
| 지금 | 공식 상태 | 공식 권장 대체 | 비고 |
|---|---|---|---|
| `gemini-2.5-flash` | 지원 중단 | `gemini-3.5-flash-lite`(자동 연결 대상) / 품질 유지면 `gemini-3.8-flash` | **2026-12-01부터 요청이 3.5-flash-lite로 자동 연결** |
| `gemini-2.5-pro` | 지원 중단 | `gemini-3.8-flash` | 2026-12-01부터 자동 연결 |
| `gemini-2.5-flash-lite` | 계속 제공(종료일 없음) | 새 작업은 `gemini-3.5-flash-lite` | 급하지 않음 |
| `gemini-2.5-flash-preview-tts` | **2026-11-17 종료** | `gemini-3.8-flash-tts` / `gemini-3.8-flash-lite-tts` | 가장 급함(D그룹 3곳) |

가격(유료, 100만 토큰당 입력/출력): 2.5-flash $0.30/$2.50 · 3.5-flash-lite $0.30/$2.50 · 3.1-flash-lite $0.25/$1.50 · 3.8-flash $0.75/$3.75(2027-01-01 인상 예정) · 2.5-pro $1.25/$10 · 3.1-pro-preview $2/$12(무료 등급 없음). 3.8 계열·3.5-flash-lite 모두 무료 등급 있음.

주의(앞선 후보 정정): `gemini-3.5-flash`는 종료 예정은 아니지만 `gemini-3.6-flash`로 자동 연결되는 이전 모델, `gemini-3.7-flash`는 `gemini-3.8-flash`로 자동 연결. `gemini-3.1-pro` 정식은 목록에 없고 `gemini-3.1-pro-preview`(미리보기)만 있음 → pro 대체로 쓰지 않음. 저장소의 예비 목록 `["gemini-3.5-flash", "gemini-2.5-flash"]`도 함께 `3.8-flash`·`3.5-flash-lite`로 바꾸는 것이 맞다.

## 2. A그룹 — 2.5를 직접 고정 호출 (우선 교체, 종료 시 기능 정지)
| 프로그램(slug) | 위치 | 내용 |
|---|---|---|
| `ai-prompt-studio` | `src/lib/prompt-engine.ts`(6곳), `src/app/api/templates/*`(4곳), `PromptExecuteModal.tsx` | 메타 프롬프트·템플릿 실행이 `gemini-2.5-flash` 고정, 실행 API는 **2.5만 허용**(다른 모델 400) — 가장 시급 |
| `ai-webtoon-studio` | `lib/serverAi.ts`, `api/user/key/route.ts`, `lib/storage.ts`·`types.ts` 기본값 | 서버 호출·키 확인·기본 모델 |
| `allinone-graphic` | `src/lib/gemini.ts` 43·236줄 | 글 호출 2곳 |
| `ui-canvas` | `src/lib/gemini.ts`, `lib/gallery/generateComponent.ts` | 고정 모델 |
| `ai-slide-builder` | `src/lib/gemini.ts` | `MODEL_NAME` |
| `cinematic-storyboard-studio` | `src/lib/storyboard/types.ts` | `TEXT_MODEL` |
| `photo-remake-studio` | `src/lib/remake/types.ts` | `TEXT_MODEL` |
| `portrait-photo` | `src/lib/gemini.ts` | `TEXT_MODEL` |
| `persona-style-studio` | `src/lib/gemini.ts` | `GEMINI_TEXT_MODEL` |
| `fashion-style` | `src/lib/gemini.ts` | 표준 품질 글 모델 |
| `landing-architect` | `src/lib/gemini.ts` | 표준 = 2.5만, 고급 실패 시 2.5 |
| `ebook-studio` | `api/ai/chapter`·`outline` 기본값, `StudioWorkspace.tsx` 기본 선택 | 기본 모델(선택지도 2.5만 — B 참고) |
| `website-scraper`(폴더 `ghost-scraper`) | `src/lib/gemini.ts`, `lib/types.ts` 기본값 | 호출 주소 고정 |
| `vinyl-lp-studio` | `api/suggest-style/route.ts` | 스타일 제안 |
| `youtube-viral-studio` | `src/lib/ai/scriptAnalyzer.ts` | 대본 분석(키를 주소에 넣음 — 교체 때 헤더로) |
| `naver-cafe-poster` | `src/lib/ai/imageGenerator.ts` | 이미지 프롬프트용 글 호출(키를 주소에 넣음) |
| `emotion-writer` | `src/app/api/keys/route.ts` | 키 확인 호출 + 선택지 |
| `ai-auto-blog`·`tistory-auto-blog` | `utils/news/imageGenerator.ts` `VISUAL_DIRECTOR_MODEL` | 뉴스 이미지 연출 글 호출 |

## 3. B그룹 — 선택지·예비 목록에만 남음 (최신이 기본, 회원이 고르거나 실패 시 예비)
| 프로그램 | 내용 |
|---|---|
| `ai-auto-blog`·`tistory-auto-blog` `utils/ai/contentModels.ts` | 2.5 flash·pro 선택지 |
| `ai-writing-editor`·`banana-canvas`·`blog-keyword`·`personality-suite`·`thumbnail-master` | `TEXT_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"]` 예비 |
| `reverse-prompt` | 예비 체인 끝에 2.5 |
| `blog-content-maker` | 선택지 2.5 pro(+설정 안내 문구) |
| `blog-workroom`·`naver-blog-seo-studio`·`blog-neighbor-care` | 고급 선택지 2.5 pro |
| `instagram-comment-reply`·`threads-comment-reply`·`youtube-auto-reply` | 고급 선택지 2.5 pro(공용 `models.ts` 같은 모양) |
| `ai-mastering-studio`·`playlist-channel-studio` | 「이전 모델」로 표시된 선택지 |
| `ebook-studio`·`ai-webtoon-studio`·`website-scraper`·`emotion-writer` | 설정 화면 선택지가 2.5뿐(A와 함께 교체) |

## 4. C그룹 — 옛 설정 호환 표시 (교체 불필요)
`ai-doc-chatbot`·`ai-prompt-studio` `compatibleChat/ProviderSelect.tsx` — 예전에 저장된 「기존 실행」 표시용(공용 `compatible-chat` 사본, 기준만 고칠 것).

## 5. D그룹 — 음성(미리보기)
`ai-video-studio/lib/edit/voice.ts`, `music-video-studio/src/lib/edit/voice.ts`, `shorts-onestop-studio/src/lib/voice.ts` — `gemini-2.5-flash-preview-tts` 선택지. 공식 음성 모델 확인 뒤 결정.

## 6. 카탈로그 밖 폴더 (참고)
`blog_auto_poster`·`shots`·`web-crawler/webapp`·`insta_auto_poster`·`kakao_auto_poster`·`music`·`tarot`·`threads` — DB `programs` slug와 폴더 이름이 직접 맞지 않음(옛 폴더이거나 다른 slug). `blog_auto_poster`·`shots`·`web-crawler`에 2.5 글 호출 고정이 있으나 운영 여부 확인 필요.

## 8. 진행 현황 (2026-11-03 저녁, 맥미니)
| 구분 | 상태 |
|---|---|
| 코드 교체 | **35개 완료** — 묶음 A·B·C 커밋 해시는 `PLAN_20261103_MODEL_MIGRATION_DEC.md` 7절·`PENDING_DEPLOYS.md` 「12월 모델 교체」 줄. 옛 저장값은 읽는 곳에서 새 값으로 변환 |
| 다시 집계 | 따옴표로 감싼 2.5 이름이 남은 곳은 옛 값 변환표와 `ai-prompt-studio` 호환 검사(받아서 3.8로 실행)뿐. **실제 호출·선택지는 `blog-neighbor-care` 1곳**(윈도우 blog 세션 몫) |
| 배포 | 주인님 결정: 따로 빌드하지 않고 각 프로그램 다음 배포 때 함께. 블로그 8개는 `DEPLOY_REQUEST_20261103_BLOG.md`(빌드 승인 요청함 대기) |
| 실제 생성 시험 | 배포 뒤 대표 1회씩(플랜 4절 4번) — 아직 안 함 |

## 7. 진행 제안
1. 무료 `models.list`로 바꿀 모델 확정(1번 표).
2. A그룹부터 프로그램마다 모델 이름만 교체(프롬프트·온도는 그대로), 키를 주소에 넣는 곳은 헤더로. 공용 사본(`compatible-chat`, 댓글 3종 `models.ts`)은 기준만 고치고 `--sync`.
3. 배포는 「작은 수정 모았다가」 규칙대로 각 프로그램 다음 배포 때. 단 2.5 종료가 확인되면 A그룹은 즉시 배포(회원 피해).
4. 실제 생성 시험은 일괄로 하지 않고, 프로그램 사용 중 오류가 나거나 필요할 때 최소 1회(이미지 교체 때와 같은 방식).
