# 유튜브 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 유튜브 카테고리는 아직 전담 역할이 없다. 담당 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **유튜브 프로그램(발굴·대본·쇼츠 제작·플레이리스트·썸네일·업로드·댓글)을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「유튜브」 줄의 7개 운영 프로그램과 병합됨 3개.
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 `src/lib/version.ts`·`lib/version.ts`의 `APP_VERSION`) 트렌드 v1.24 · 대본 v1.16 · 플레이리스트 v1.31 · Shots v1.43 · 원스톱 v1.41 · 썸네일 v1.20 · 댓글 v1.32. 병합됨 3개 폴더에는 버전 파일이 없어 **코드 버전 미확인**(프로그램 비교표 기록: 컨설턴트 v1.11 · 썸네일 프로 v1.12 · 플레이리스트 영상 v1.15).
> - 근거: 각 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [유튜브 통합 분석 보고서](analysis-youtube-consolidation-20261020/REPORT.md) §1·§3·§6, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, [외부 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-YT-01~03, [카드형 쇼츠 참고 분석](CARD_SHORTS_REFERENCE_ANALYSIS.md). **운영 DB는 이번에 조회하지 않았다**(권한 회원 수·배지·공개 여부는 보고서 기록 기준).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 둔다. ○는 근거 파일을 찾은 칸만 표시했다.
> - 영상 렌더링·영상 모델 연동은 「영상」 카테고리(역할 `video`) 소관이다. 여기서는 유튜브 프로그램이 그 엔진을 쓰는지만 적는다.
> - 관계 문서: [유튜브 자동화 완성 기준](YOUTUBE_COMPLETION_POLICY.md) · [유튜브 통합 작업표](YOUTUBE_CONSOLIDATION_TASKS.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md) · [회원 연동 정보](MEMBER_INTEGRATIONS.md) · [예약 기능 지침](SCHEDULER_POLICY.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 「무엇이 뜨나·내 채널은 어떤가」= 트렌드, 「왜 터졌나 → 내 대본」= 대본, 「이미지 스토리+음악 쇼츠 → 쇼츠·릴스 업로드」= Shots, 「정보 카드형 쇼츠 → 업로드」= 원스톱, 「플레이리스트 채널」= 플레이리스트, 「썸네일·업로드 문구」= 썸네일, 「댓글 응대」= 댓글. 병합된 원본 세 곳에는 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/YOUTUBE_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/YOUTUBE_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 폴더 · 코드 버전) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 트렌드 | YOUTUBE 트렌드 분석 (`youtube-viral-studio` · v1.24) | 발굴·진단 **기준**, 공용 `youtube-data-client`·`youtube-golden-engine` **기준** 위치 | 떡상 쇼츠 → 황금·공략 채널 → 한국 급상승 → 쇼츠 원본 찾기 → 채널·키워드 진단 → AI 리포트 → 즐겨찾기·CSV → 원스톱으로 넘기기 | 즐겨찾기만 저장(30일 DB 예약 삭제) / OpenAI·Gemini·Claude 선택 / `youtube_api_key` | 떡상 지표가 가장 풍부, 진단·발굴 한 곳(병합 C) | 할당량, 분석 결과는 저장 안 함, 자막은 서버가 유튜브 화면을 직접 읽음(`lib/youtube/transcript.ts`) | 독립(기준) |
| 대본 | 쇼츠 떡상 분석·대본 자동화 (`shorts-viral-studio` · v1.16) | 공식 분석 → 대본·제작 프롬프트 | 떡상 등급 검색 → Gemini 영상 분석(GPT·Claude는 지표 추정) → 새 소재 6개 → 씬별 대본·이미지/영상/Suno 프롬프트 → .md 내보내기·프롬프트 보관함 → 원스톱·썸네일로 넘기기 | `svs_projects`(목록 열 때 30일 지난 것 삭제)·`svs_saved_prompts`(삭제 안 함) / 3사 AI / `youtube_api_key` | 「왜 터졌나 → 내 대본」 유일한 흐름 | 저장 데이터 30일 정리 불완전(§2-6), 당해 연도 주입 없음 | 독립 |
| 플레이리스트 | YOUTUBE 플레이리스트 자동화 (`playlist-channel-studio` · v1.31) | 플레이리스트 채널 기획 + 영상 + 업로드 | 장르 → 제목 10 → Suno 프롬프트·가사·설명·태그 → 글자 썸네일 → (외부에서 곡) → 곡 가져오기(Suno·AI 음악 스튜디오) → 스펙트럼·가사·GIF → 브라우저 MP4 → 유튜브 업로드(비공개·예약·챕터·썸네일) | `playlist_projects`(30개 제한)·비공개 `playlist-thumbs` / 3사 AI / Google OAuth(공용 연결 계정) | 기획~영상~업로드 한 곳(병합 E) | 곡은 직접 안 만듦, 30일 정리 없음(§2-6), 연결 화면 없음 | 독립 |
| Shots | YOUTUBE Shots 이미지 스토리 (`auto-shorts-posting` · 폴더 `shots/` · v1.43) | 수집~업로드 완전 자동 쇼츠 | 뉴스·RSS·트렌드 수집 → 6장면 대본 → 나노바나나 이미지 → (선택) 장면 AI 영상 → Suno 배경음악 → 브라우저 MP4(기본) 또는 JSON2Video → 유튜브 쇼츠·인스타 릴스 | `shorts_candidates`·`shorts_videos`·`shorts_video_segments` + **공개 버킷** `shots-videos`·`shorts-images`·`shots-bgm` / 키 가장 많음 / Google·Meta OAuth(회원 앱) | 수집부터 2개 플랫폼 업로드까지 | 키·계정이 많음, 6장면 고정, 공개 버킷, 대본·후보 행·배경음악 30일 정리 없음 | 독립(보류 F) |
| 원스톱 | AI 쇼츠 원스톱 제작 자동화 (`shorts-onestop-studio` · v1.41) | 정보 카드형 쇼츠 + 업로드, 공용 `browser-mp4-encoder` **기준** | 분야 14 → 주제 8 → 대본(톤5×구성5) → 장면 디자인(테마 8·레이아웃 6) → 배경(스톡·AI 이미지·AI 영상) → TTS·단어 자막·배경음악 → 브라우저 MP4 → 업로드 문구 → 유튜브 업로드 · 발행 계획·일괄 제작 | `shorts_onestop_items`(대본 행 정리 제외) + 비공개 버킷·서명 주소(파일 30일 정리) / 3사 AI·TTS·스톡·영상 AI / Google OAuth(공용 연결 계정) | 합성 비용 0, 외부 참고 2건(EXT-YT-01·02) 흡수 | 연결 화면 없음, 렌더 중 탭 유지, 일괄 제작 결과 자동 업로드 없음 | 독립(보류 F) |
| 썸네일 | AI 썸네일·SEO 자동화 (`thumbnail-master` · v1.20) | 썸네일·업로드 문구 **기준** | (SEO) 대본 → 3전략 제목·설명·태그·고정 댓글 → (썸네일) 주제·타겟·피사체 → A/B 문구 → 16:9·9:16 썸네일 2종 → 지시문 수정·되돌리기 → JPG | `thumbnail_master_projects`(30개, 30일 예약 삭제) + 비공개 버킷·서명 주소 / Gemini 하나 | 타겟별 A/B·SEO 한 곳(병합 D), 키 서버 보관 | 이미지 속 글자 맞춤법, 유튜브 업로드 기능은 없음(문구 복사·이미지 내려받기) | 독립(기준) |
| 댓글 | 유튜브 댓글자동화 (`youtube-auto-reply` · v1.32) | 유튜브 응대 유일 | 회원 Google 앱 OAuth → 영상 동기화 → 5분마다 새 댓글(영상별 20개) → AI 답글 초안 → 웹·텔레그램 승인(또는 자동 게시) → 게시 → 7일 그래프 | `ytreply_*`(댓글 30일 예약 삭제·정리 기록) / 3사 AI / Google OAuth·텔레그램·cron-job.org | 이중 게시 방지 선점, 실행 방식 회원 선택 | 할당량, Google Cloud 앱 준비 | 독립 |
| (병합) 컨설턴트 | YOUTUBE CHANNEL CONSULTANT (`youtube-channel-consultant`) | 병합 원본 | **현재 이동 안내만**(`src/app/page.tsx`) | – | – | – | 병합됨 → 트렌드(2026-10-20) |
| (병합) 썸네일 프로 | AI 유튜브 썸네일 프로 (`seo-thumbnail-pro`) | 병합 원본 | **현재 이동 안내만**, 옛 키 API 410(`src/app/api/user/key/route.ts`) | – | – | – | 병합됨 → 썸네일(2026-10-20) |
| (병합) 플레이리스트 영상 | Youtube Playlist 자동화 (`yt-playlist-studio`) | 병합 원본 | **현재 이동 안내만**(`src/app/page.tsx`) | – | – | – | 병합됨 → 플레이리스트(2026-10-20) |

공통: 7개 운영 앱 모두 로그인 + 공통 권한 판정(`lib/access.ts`·`lib/programAccess.ts`), 회원 본인 키(`user_api_keys`)를 쓴다. 이번 점검에서 운영자 AI·YouTube 키 환경변수 사용은 찾지 못했다.

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · – 해당 없음 · 「미확인」은 코드를 확인하지 못한 칸. 경로는 각 폴더 `src/` 기준(댓글은 폴더 루트 기준).

### 2-1. 발굴·분석

| 기능 | 트렌드 | 대본 | Shots | 원스톱 | 플레이리스트 | 썸네일 | 댓글 |
|---|---|---|---|---|---|---|---|
| 키워드 떡상 쇼츠 검색(구독자 대비 배수·VPH) | ○ `lib/youtube/viralShorts.ts`, `app/api/youtube/search-shorts/route.ts` | ○ 떡상 등급 `lib/youtube/metrics.ts`, `lib/youtube/api.ts` | × | × | × | × | × |
| 황금·공략 채널 찾기 | ○ `lib/youtube/goldenEngine.ts`(공용 기준), `app/api/youtube/golden-channels/route.ts` | × | × | × | × | × | × |
| 한국 급상승 영상 | ○ `lib/youtube/trendingVideos.ts` | × | × | × | × | × | × |
| 쇼츠 → 원본 롱폼 찾기 | ○ `lib/youtube/sourceFinder.ts` | × | × | × | × | × | × |
| 채널 진단(인기 점수·업로드 주기 차트) | ○ `lib/consultant/youtube/analysis.ts`, `app/(dashboard)/channel-analysis/page.tsx` | × | × | × | × | × | × |
| 키워드 시장(점유율·게시 시기) | ○ `app/api/youtube/keyword/route.ts`, `app/(dashboard)/keyword-analysis/page.tsx` | × | × | × | × | × | × |
| AI 리포트·대본 후킹 분석 | ○ `app/api/ai/analyze/route.ts`, `lib/ai/scriptAnalyzer.ts` | ○ `lib/ai/pipeline.ts` | × | × | × | × | × |
| Gemini가 영상을 직접 보고 분석 | 미확인 | ○ `lib/ai/llm.ts`(영상 입력) | × | × | × | × | × |
| 영상 자막 가져오기 | ○ `lib/youtube/transcript.ts`(서버가 유튜브 화면을 직접 읽음 — 공식 API 아님) | 미확인 | × | △ 받아쓰기 `app/api/ai/transcribe/route.ts`(회원이 올린 소리) | × | × | × |
| 즐겨찾기·CSV 내보내기 | ○ `lib/favorites.ts`, `lib/export.ts` | ○ .md 내보내기 `lib/export.ts` | × | × | × | × | × |
| 뉴스·RSS·트렌드 주제 수집 | × | × | ○ `lib/ai/collector.ts`(Perplexity·RSS) | ○ 분야별 주제 추천 `app/api/ai/topics/route.ts` | × | × | × |

### 2-2. 대본·장면·음성·음악

| 기능 | 대본 | Shots | 원스톱 | 플레이리스트 |
|---|---|---|---|---|
| 새 소재 제안 → 씬별 대본 | ○ `components/studio/IdeaSteps.tsx`, `ScriptStep.tsx` | ○ 6장면 `lib/ai/script.ts` | ○ 톤5×구성5·3~8장 `lib/script.ts`, `app/api/ai/script/route.ts` | – |
| 이미지·영상·Suno 제작 프롬프트 | ○ `components/studio/PromptsStep.tsx`, 보관함 `lib/actions/savedPrompts.ts` | △ 이미지 프롬프트는 대본에 포함 | △ 배경 묘사 `app/api/ai/visuals/route.ts` | ○ Suno 프롬프트·가사 `lib/playlist/prompts.ts` |
| 장면 이미지 생성(나노바나나 공용 사본) | × | ○ `lib/ai/geminiImage.ts`, `lib/ai/nanoBananaModels.ts` | ○ `lib/geminiImage.ts`, `app/api/ai/image/route.ts` | ○ AI 배경 `app/api/generate-bg/route.ts` |
| 스톡 영상·이미지 배경(Pexels·Pixabay) | × | × | ○ `lib/stock.ts`, `app/api/stock/*` | × |
| 장면 AI 영상(공용 `ai-video-*` 사본, 영상 역할 소관) | × | ○ v1.32 `lib/video/sceneVideo.ts`, `lib/video/videoProviders.ts` | ○ v1.23 `lib/videoGen.ts`, `app/api/ai/video/route.ts` | × |
| 같은 인물 유지(캐릭터 일관성) | × | 미확인 | ○ `lib/prompts.ts` 71행 | × |
| TTS 내레이션 | × | ○ OpenAI `app/api/render/tts/route.ts`, 보관·재사용 | ○ OpenAI·Gemini `lib/tts.ts` | × |
| 본인 목소리 복제(ElevenLabs) | × | × | ○ v1.26 `app/api/voice/elevenlabs/route.ts`, `lib/voice.ts` | × |
| 단어 단위 자막 싱크 | × | △ 노란 자막(단어 시각 맞춤은 미확인) | ○ v1.27 `lib/render/scene.ts` 81~83행 | ○ 곡별 시간 가사 `lib/render/lyrics-layer.ts`, 공용 `lyric-timing` 사본 |
| 배경음악 | × | ○ Suno `lib/ai/suno.ts`, `lib/actions/music.ts` | ○ 업로드·자동 볼륨, AI 음악 스튜디오 곡 `app/api/ams/*` | ○ Suno·AI 음악 스튜디오 곡 `lib/sunoTracks.ts`, `lib/amsTracks.ts` |
| 인물 기본 한국인 묘사 | ○ `lib/ai/pipeline.ts` 316행 | ○ `lib/ai/script.ts` 133~134행 | ○ `lib/prompts.ts` 69행 | 미확인(인물 지시 문장 못 찾음) |

### 2-3. 영상 완성·썸네일·업로드 문구

| 기능 | Shots | 원스톱 | 플레이리스트 | 썸네일 |
|---|---|---|---|---|
| 브라우저 MP4(서버 비용 0) | ○ v1.24 `lib/render/mp4Encoder.ts`(공용 사본), `components/candidates/BrowserRenderPanel.tsx` | ○ `lib/render/mp4Encoder.ts`(공용 **기준**), `lib/render/export.ts` | ○ `lib/render/video-exporter.ts` | – |
| 서버 합성(JSON2Video, 회원 키) | ○ 선택 `lib/ai/render.ts` | × | × | – |
| 실제 소리 반응 스펙트럼·파티클·GIF 스티커 | × | × | ○ `lib/render/audio-spectrum.ts`, `particle-system.ts`, `gif-frames.ts` | – |
| MP4 내려받기(보관만) | ○ `components/candidates/RenderSection.tsx` | ○ `components/views/RenderView.tsx` | ○ `components/video/ExportStudio.tsx` | – |
| 썸네일 A/B 2종 동시 | × | × | △ 글자 썸네일 1종 `components/studio/ThumbnailTab.tsx` | ○ `lib/tmb/strategy.ts`, `app/api/generate/route.ts` |
| 세로 9:16 표지 | △ 릴스 표지 올리기 `lib/instagram/reelCover.ts` | × | × | ○ v1.13 `lib/tmb/types.ts` 6행 |
| 지시문 수정·되돌리기 | × | × | × | ○ `app/api/edit/route.ts`, `components/studio/Studio.tsx` |
| SEO(제목·설명·해시태그·태그) | △ 설명·카테고리 `lib/ai/posting.ts` | ○ `app/api/ai/seo/route.ts` | ○ 설명·해시태그·키워드 `lib/playlist/prompts.ts` | ○ 3전략·고정 댓글 `lib/seo/seoStrategy.ts`, `app/api/seo/strategy/route.ts` |
| 발행 계획(채널 단계·날짜별 일정)·일괄 제작 | × | ○ `lib/plan.ts`, `components/views/PlanView.tsx` | × | × |

### 2-4. 업로드 (회원이 고르는 방식)

| 기능 | Shots | 원스톱 | 플레이리스트 | 썸네일 |
|---|---|---|---|---|
| ⓐ 보관만(올리지 않고 MP4 보관·내려받기) | ○ (§2-3 내려받기) | ○ | ○ | – |
| ⓑ 즉시 업로드 — 공개 범위 선택(비공개 기본) | ○ v1.28 `lib/actions/youtube.ts` 242~243행 | ○ v1.19 `app/api/youtube/upload-session/route.ts` 31행 | ○ v1.22 `app/api/youtube/upload-session/route.ts` 33행 | × (업로드 기능 없음) |
| ⓒ 예약 업로드(유튜브 예약 공개 `publishAt`) | ○ 15분 뒤~6개월 검사 `lib/actions/youtube.ts` 244~252행 | ○ `upload-session/route.ts` 35~40행, 발행 계획 시각 채우기 `components/views/YoutubeUploadCard.tsx` 47행 | ○ `upload-session/route.ts` 37~42행 | × |
| 업로드 방식 | 서버가 저장소 영상을 받아 올림 | 브라우저가 유튜브로 직접(재개 가능 주소) `lib/youtube/browserUpload.ts` | 브라우저 직접 | – |
| 올린 기록·「이미 n번 올렸습니다」 경고 | ○ `youtube_uploads` 최근 10개, `components/candidates/PostingSection.tsx` 244행 | ○ `YoutubeUploadCard.tsx` 104행 | ○ `components/video/YoutubeUploadCard.tsx` 224행(버튼 문구) — 기록 보관 위치 미확인 | – |
| 올리는 중 버튼 잠금 | ○ `PostingSection.tsx` 273~282행 | ○ `YoutubeUploadCard.tsx` 103행 | ○ 224행 | – |
| 서버 쪽 중복 업로드 선점 | △ 「올리는 중」 표시는 하지만 그 상태를 확인해 막는 조건 없음(`lib/actions/youtube.ts` 277~280행) | – (브라우저 직접, 서버 기록 없음) | – | – |
| 결과 불확실 시 자동 재업로드 없음 | ○ 실패 표시만(`youtube_status: failed`, 319행) | ○ 자동 재시도 코드 못 찾음 | ○ 자동 재시도 코드 못 찾음 | – |
| 썸네일 함께 지정 | × (쇼츠는 스튜디오에서만 — 썸네일 앱 안내) | × | ○ `lib/youtube/thumbnail.ts` | – |
| 챕터(곡별 타임스탬프) 설명 | – | – | ○ `components/video/YoutubeUploadCard.tsx` | – |
| 인스타 릴스 업로드 | ○ `lib/instagram/client.ts`, `lib/actions/instagram.ts` | × | × | × |
| AI 생성 콘텐츠 표시(`containsSyntheticMedia`) | × 공용 업로드 코드에 없음 | × | × | – |
| 아동용 여부 회원 선택 | × `selfDeclaredMadeForKids: false` 고정(공용 `lib/youtube/client.ts` 147·209행) | × 같음 | × 같음 | – |
| 유튜브 연결 화면 | ○ `app/api/youtube/callback/route.ts`, `components/youtube/YoutubeConnectCard.tsx` | × 공용 연결 계정만(`lib/youtube/account.ts`) | × 공용 연결 계정만 | – |

### 2-5. 댓글 응대

| 기능 | 댓글 |
|---|---|
| 회원 Google 앱 OAuth·연결 상태 확인 | ○ `app/api/youtube/callback/route.ts`, `app/api/cron/check-connection/route.ts` |
| 영상 동기화·영상별 끄기 | ○ `lib/actions/videos.ts`, `components/videos/*` |
| 5분마다 새 댓글 수집(영상별 20개) | ○ `app/api/cron/sync-comments/route.ts`, `lib/comments/sync.ts` |
| 댓글 중복 저장 방지 | ○ `unique (user_id, youtube_comment_id)`(`supabase/migrations/0001_youtube_auto_reply_tables.sql` 54행) + 이미 있는 댓글 제외(`lib/comments/sync.ts` 96~105행) |
| AI 답글 초안(링크·말투 프리셋) | ○ `lib/ai/reply.ts`, `lib/tonePresets.ts` |
| 승인 후 게시(웹·텔레그램 버튼) | ○ `lib/actions/comments.ts`, `app/api/telegram/webhook/[userId]/route.ts` |
| 이중 게시 방지(조건부 선점, 2분 넘은 표시 재선점) | ○ v1.2x `lib/comments/post.ts` 46~59행 |
| 자동 게시(선택, 기본 꺼짐·새 댓글 1회만) | ○ `lib/comments/sync.ts` 142~145행 |
| 예약 실행 방식 회원 선택·일시정지 | ○ `lib/schedulerMember/`, `app/api/cron/dispatch-member/route.ts` |
| 7일 응대 그래프 | ○ `lib/weekChart/bucket.ts`, `components/weekChart/*` |
| 여러 개 한 번에 승인 | × (제안, `docs/IMPROVEMENTS.md` 10행) |

### 2-6. 공통·보안·정리

| 기능 | 트렌드 | 대본 | Shots | 원스톱 | 플레이리스트 | 썸네일 | 댓글 |
|---|---|---|---|---|---|---|---|
| 로그인 + 공통 권한 판정 | ○ `lib/access.ts` | ○ | ○ | ○ | ○ | ○ | ○ |
| 회원 본인 키만(운영자 키 환경변수 없음) | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 회원 본인 Google 앱(`google_client_id`) | – | – | ○ `lib/actions/youtube.ts` 269~270행 | ○ | ○ | – | ○ `lib/comments/post.ts` 40~41행 |
| 공용 연결 계정(`member_platform_accounts`) | – | – | ○ `lib/memberIntegrations.ts`, `lib/youtube/memberAccount.ts` | ○ `lib/memberIntegrations.ts` | ○ `lib/memberIntegrations.ts` | – | ○ `lib/memberIntegrations.ts` |
| 회원 생성 파일 비공개 버킷·서명 주소 | – | – | × **공개 버킷**(`supabase/migrations/20261021120000_shots_videos_bucket_v1_24.sql` `public=true`, `getPublicUrl` 다수) | ○ `lib/media.ts` | ○ `lib/projects.ts` 57행 | ○ `lib/images.ts` | – |
| 30일 자동 정리 — 예약 작업 | ○ 즐겨찾기 DB 예약(`supabase/migrations/20261017025253_yvs_member_favorites.sql` 28~35행) | △ 목록 열 때만 프로젝트 삭제(`lib/actions/projects.ts` 57~64행), 프롬프트 보관함은 제외(`0004_svs_saved_prompts.sql` 4행) | △ 영상·음성·표지·장면 이미지 파일만(`app/api/cron/cleanup-videos/route.ts`) — 대본·후보 행·배경음악 트랙 제외 | △ 파일만(`app/api/cron/cleanup-media/route.ts` 12행 「대본 행은 지우지 않음」) | × 예약 작업·삭제 코드 못 찾음(`vercel.json` crons 없음) | ○ 행+이미지(`app/api/cron/cleanup/route.ts`) | ○ 댓글(`app/api/cron/cleanup-comments/route.ts`) |
| 정리 건수 회원별 기록 | × | × | ○ v1.37 `cleanup-videos` 162~167행 | ○ v1.37 `cleanup-media` 25행 | × | ○ `cleanup/route.ts` 49~52행 | ○ 공용 `lib/cleanupUsageLog.ts` |
| 사용 기록(`usage_logs`) 남기기 | × 정의만(`lib/programAccess.ts`) | × 정의만 | ○ `youtube_uploaded` 등 | ○ `lib/usage.ts` | × 정의만 | △ 정리 기록만 | ○ |
| 당해 연도 프롬프트 주입 | ○ `lib/ai/prompts.ts`, `lib/ai/scriptAnalyzer.ts` | × `lib/ai/pipeline.ts`에 없음 | × `lib/ai/script.ts`·`collector.ts`·`posting.ts`에 없음 | ○ `lib/prompts.ts` | ○ `lib/playlist/prompts.ts` 7행 | ○ `lib/tmb/prompts.ts`, `lib/seo/seoStrategy.ts` | × `lib/ai/reply.ts`에 없음(답글이라 영향 낮음) |
| YouTube 읽기 공용 사본(`youtube-data-client`) | ○ **기준** `lib/youtube/youtubeData.ts` | ○ 사본 `lib/youtube/youtubeData.ts` | – | – | – | – | 미확인(자체 `lib/youtube/client.ts`) |
| 휴대폰 폭 메뉴 | 미확인 | 미확인(계정 위치 미배포 대기 `22c6cda35`) | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 |

## 3. 병합 원본 기능 이관 대조 (출처)

| 원본 기능 | 출처 | 이관 위치 | 상태 |
|---|---|---|---|
| 채널 진단·키워드 시장·AI 리포트·JSON/CSV | 컨설턴트 | 트렌드 v1.21 `lib/consultant/youtube/`, `channel-analysis`·`keyword-analysis` | ✅ 병합 C |
| 공략 채널(황금 엔진 기준) | 컨설턴트 | 트렌드 `lib/youtube/goldenEngine.ts`(기준 위치 이동, 「황금·공략 채널 발굴」 하나로) | ✅ |
| 3전략 제목·설명·태그·고정 댓글 | 썸네일 프로 | 썸네일 v1.09 `/seo`, `lib/seo/seoStrategy.ts`(키 원문 브라우저 전달 폐기) | ✅ 병합 D |
| 올린 영상 역분석 | 썸네일 프로 | × | 미이식(보고서·카드 기록) |
| 대화로 수정 | 썸네일 프로 | △ 썸네일 지시문 수정(`app/api/edit/route.ts`) — SEO 문구 대화 수정은 미확인 | △ |
| 스펙트럼·파티클·필터·오버레이·AI 배경·브라우저 MP4·챕터 | 플레이리스트 영상 | 플레이리스트 v1.16 `/video`, `lib/render/` | ✅ 병합 E(기준 앱을 보고서와 반대로 정정) |
| 유튜브 업로드 엔진 | Shots | 공용 `youtube-upload-client` → 원스톱 v1.19·플레이리스트 v1.22 | ✅ 보류 F 엔진 공유 1번 |
| 브라우저 MP4 인코더 | 원스톱 | 공용 `browser-mp4-encoder` → Shots v1.24 | ✅ 보류 F 엔진 공유 2번 |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| YouTube 읽기 호출·오류·할당량 | `youtube-viral-studio/src/lib/youtube/youtubeData.ts` | 공용 `youtube-data-client` **기준**, 사본 대본·블로그 3종·쓰레드 운영·상품소싱 |
| 황금·공략 채널 엔진 | `youtube-viral-studio/src/lib/youtube/goldenEngine.ts` | 공용 `youtube-golden-engine` **기준**(사본 없음) |
| 떡상 지표(VPH·구독자 대비) | `youtube-viral-studio/src/lib/youtube/metrics.ts`, `shorts-viral-studio/src/lib/youtube/metrics.ts` | 두 곳에 따로 있음(공용화 안 됨) |
| 유튜브 업로드(토큰·한 번에 올리기·재개 가능 주소·예약 공개) | `shots/src/lib/youtube/client.ts` | 공용 `youtube-upload-client` **기준**, 사본 원스톱·플레이리스트·`lyric-video-studio` |
| 브라우저 직접 업로드 순서 | `shorts-onestop-studio/src/lib/youtube/browserUpload.ts`, `src/app/api/youtube/upload-session/route.ts` | 서버는 주소만, 영상은 브라우저 → 유튜브 |
| 공용 연결 계정 읽기·쓰기 | 각 폴더 `lib/memberIntegrations.ts` | 공용 `member-integrations` 사본, 설명 [MEMBER_INTEGRATIONS.md](MEMBER_INTEGRATIONS.md) |
| 브라우저 MP4 만들기 | `shorts-onestop-studio/src/lib/render/mp4Encoder.ts` | 공용 `browser-mp4-encoder` **기준** — 그리기 함수는 프로그램별, 영상 역할과 협의 |
| 답글 이중 게시 방지(조건부 선점) | `youtube-auto-reply/lib/comments/post.ts` | 업로드 선점을 새로 만들 때도 이 방식을 기준으로 |
| 회원 예약 실행 방식 | `youtube-auto-reply/lib/schedulerMember/` | 공용 `member-scheduler` 사본 |
| 30일 정리 + 회원별 기록 | `thumbnail-master/src/app/api/cron/cleanup/route.ts`(행+파일), `youtube-auto-reply/lib/cleanupUsageLog.ts`(공용 `cleanup-usage-log` 사본) | 행과 파일을 함께 지우는 예는 썸네일 |
| DB 예약 30일 삭제(pg_cron) | `youtube-viral-studio/supabase/migrations/20261017025253_yvs_member_favorites.sql` | 읽기 정책에서도 30일 경계 차단 |
| 썸네일 A/B 문구·타겟 | `thumbnail-master/src/lib/tmb/strategy.ts`, `lib/tmb/audience.ts` | 프롬프트 내용은 공유하지 않음 |
| SEO 전략 | `thumbnail-master/src/lib/seo/seoStrategy.ts` | 당해 연도 주입 |
| 카드형 쇼츠 장면·단어 자막 | `shorts-onestop-studio/src/lib/render/scene.ts` | EXT-YT-02 흡수 |
| 발행 계획 | `shorts-onestop-studio/src/lib/plan.ts` | |
| 다른 프로그램으로 넘기기(주소 # 데이터) | `shorts-onestop-studio/src/lib/refHandoff.ts`(받는 쪽), `shorts-viral-studio/src/lib/reference.ts`(보내는 쪽 `refHandoffHash`) | 프로그램끼리 서로 호출하지 않음 |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 합칠 프로그램 → 기준 | 가져온 기능 | 상태 |
|---|---|---|---|
| C 분석 | 컨설턴트 → 트렌드 | 채널·키워드 진단·AI 리포트, 공용 기준 2개 위치 이동 | ✅ 2026-10-20 트렌드 v1.21 |
| D 썸네일 | 썸네일 프로 → 썸네일 | SEO 3전략(서버 API) | ✅ 2026-10-20 썸네일 v1.09 |
| E 플레이리스트 | 플레이리스트 영상 → 플레이리스트 | 영상 만들기 `/video` | ✅ 2026-10-20 플레이리스트 v1.16 |
| F 쇼츠 제작 | Shots ↔ 원스톱 | 합치지 않고 엔진 공유(업로드·MP4) | 보류 — 재판단 2026-11-18 무렵(보고서 §6, `usage_logs` 집계) |
| 독립 | 대본·댓글 | 연결(넘기기)만 | – |

원칙: 「병합」은 좋은 기능만 기준 프로그램에 더하는 것이다. 원본은 비공개·이동 안내로 두고 주소는 지우지 않는다.

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | 생성 데이터 30일 예약 정리 보완(플레이리스트 전체, 대본 두 표, Shots 행·배경음악, 원스톱 대본 행) | 4개 | §2-6, 최상위 규칙 | 빌드 각 1 | 후보(작업표 우선 처리) |
| 1차 | 당해 연도 주입(Shots 대본·수집·문구, 대본 파이프라인) | Shots·대본 | 핵심 원칙 8 | 빌드 각 1 | 후보 |
| 1차 | Shots 업로드·인스타 게시 서버 선점 | Shots | 댓글 `post.ts` 방식 | 빌드 1 | 후보 |
| 2차 | AI 생성 콘텐츠 표시·아동용 여부 회원 선택 | 공용 `youtube-upload-client` 기준 → 사본 3개 | 유튜브 정책(공식 문서 확인 필요) | 빌드 3 | 확인 필요 |
| 2차 | Shots 공개 버킷 → 비공개+서명 주소(인스타 게시용 주소만 긴 만료) | Shots | §2-6 | 빌드 1 | 확인 필요 |
| 2차 | 트렌드 → 대본 「이 쇼츠로 분석·대본」 넘기기 | 트렌드 → 대본 | 보고서 §3 「남김」 제안(현재는 원스톱으로만 넘김) | 빌드 1~2 | 후보 |
| 2차 | 대본 A/B를 대본 → 원스톱으로 넘기기 | 대본 → 원스톱 | EXT-YT-01 「못 옮긴 것」 | 빌드 1~2 | 후보 |
| 2차 | 사용 기록 추가(트렌드·대본·플레이리스트) | 3개 | 보류 F처럼 판단 근거 | 빌드 각 1 | 후보 |
| 3차 | 원스톱·플레이리스트 자체 유튜브 연결 화면 | 2개 | 카드 「단점」 | 빌드 2 | 후보 |
| 3차 | 일괄 제작 결과 자동 예약 업로드 | 원스톱 | 카드 「단점」 | 빌드 1 | 후보 |
| 3차 | 썸네일 프로의 「올린 영상 역분석」 | 썸네일 | 병합 D 미이식 | 회원 키 | 보류(회원 요청 시) |
| 보류 | 쇼츠 제작 스튜디오 합치기(F) | Shots+원스톱 | 보고서 §6 | 큼 | 2026-11-18 무렵 재판단 |

### 미배포 대기 (유튜브)

| 프로그램 | 내용 | 나갈 때 |
|---|---|---|
| 대본 | 좌측 메뉴 계정·로그아웃 위치 `22c6cda35` | 다음 대본 배포(`docs/PENDING_DEPLOYS.md` 44행) |
| 댓글 | 「모니터링 중지」 즉시 화면 반영, 자동 수집 상태 보기 | 다음 댓글 배포(`youtube-auto-reply/docs/IMPROVEMENTS.md` 43·48행) |
| 플레이리스트 | 음악(SUNO) 리믹스 결과 받기 `?remix=` | 다음 플레이리스트 작업 때(`playlist-channel-studio/docs/IMPROVEMENTS.md` 50행 — 코드 반영 여부 미확인) |

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 운영 7개 코드 버전 기준, 병합 C·D·E와 보류 F 엔진 공유 반영, 30일 정리·당해 연도·업로드 방식 칸 코드 대조 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
