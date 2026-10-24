# 유튜브 자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 유튜브 카테고리는 아직 전담 역할이 없다([카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「유튜브」 줄). 담당이 정해져 이 문서를 확인·수정하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「유튜브」 카테고리 — `youtube-viral-studio`(YOUTUBE 트렌드 분석), `shorts-viral-studio`(쇼츠 떡상 분석·대본), `playlist-channel-studio`(YOUTUBE 플레이리스트 자동화), `auto-shorts-posting`(폴더 `shots/`, YOUTUBE Shots 이미지 스토리), `shorts-onestop-studio`(AI 쇼츠 원스톱), `thumbnail-master`(AI 썸네일·SEO), `youtube-auto-reply`(유튜브 댓글자동화). 병합됨 `youtube-channel-consultant`·`seo-thumbnail-pro`·`yt-playlist-studio`는 이동 안내만 남았다(새 기능 넣지 않음). 앞으로 만드는 유튜브 발굴·제작·업로드·응대 프로그램에도 적용한다.
- 관계 문서: [유튜브 기능 상세 비교표](YOUTUBE_FEATURE_MATRIX.md) · [유튜브 통합 작업표](YOUTUBE_CONSOLIDATION_TASKS.md) · [유튜브 통합 분석 보고서](analysis-youtube-consolidation-20261020/REPORT.md) · [유튜브 로드맵](YOUTUBE_AUTOMATION_ROADMAP.md) · [카드형 쇼츠 참고 분석](CARD_SHORTS_REFERENCE_ANALYSIS.md) · [회원 연동 정보](MEMBER_INTEGRATIONS.md) · [예약 기능 지침](SCHEDULER_POLICY.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md) · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md).
- **영상 렌더링·영상 모델 연동은 「영상」 카테고리(역할 `video`, [`roles/video.md`](roles/video.md)) 소관**이다. 이 문서는 유튜브 프로그램이 영상 엔진을 「가져다 쓰는 연결」만 다룬다(공용 `browser-mp4-encoder`·`ai-video-*` 사본은 직접 고치지 않음). 음악 부분(Suno·AI 음악 스튜디오 곡 가져오기)은 역할 `music` 소관이다.

## 1. 완성 흐름 (목표)

유튜브 자동화의 완성 목표는 아래 흐름이 **회원 본인 키·본인 Google 앱·본인 채널로 끊기지 않고** 이어지는 것이다.

**발굴(떡상 쇼츠·황금 채널·키워드 진단) → 공식 분석·대본 → 장면·음성·자막·음악 → 영상 완성(MP4) → 썸네일·업로드 문구(SEO) → 회원이 고른 방식으로 업로드(보관만 / 즉시 / 예약) → 결과 기록 → 댓글 응대 → 생성 자료 30일 정리**

- 프로그램별 담당 구간: 발굴 = 트렌드 분석, 공식 분석·대본 = 쇼츠 대본, 쇼츠 제작·업로드 = Shots(이미지 스토리)·원스톱(정보 카드), 플레이리스트 영상·업로드 = 플레이리스트, 썸네일·SEO = 썸네일, 응대 = 댓글.
- 프로그램끼리 서로 호출하지 않는다. 넘기기는 주소·`#` 뒤 데이터·공용 연결 계정만 쓴다(예: 트렌드 분석·쇼츠 대본 → 원스톱 `/topic`, 쇼츠 대본·원스톱 → 썸네일 `/seo`).

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **회원 본인 키·본인 OAuth 앱으로 동작**: YouTube Data API 키(`youtube_api_key`), Google OAuth 앱(`google_client_id`·`google_client_secret`), AI(OpenAI·Gemini·Claude)·음성(ElevenLabs)·음악(Suno)·스톡(Pexels·Pixabay)·영상 AI(fal·Replicate)·cron-job.org 키는 모두 회원 `user_api_keys`의 본인 값만 쓴다. **운영자 공용 Google 앱으로 회원 채널을 연결하지 않는다**(핵심 원칙 4 — 심사 전 앱은 테스터 외 인증 거부). 키가 없으면 실행하지 않고 등록 안내를 띄운다.
2. **유튜브 연결은 공용 연결 계정을 재사용**: 한 프로그램에서 연결한 채널은 `member_platform_accounts`(공용 `lib/memberIntegrations.ts`)로 다른 유튜브 프로그램이 그대로 쓴다. 갱신 토큰은 발급한 앱이 같을 때(`app_ref`)만 쓰고, 권한(업로드·읽기·댓글 `force-ssl`)이 모자라면 「다시 연결」을 안내한다([MEMBER_INTEGRATIONS.md](MEMBER_INTEGRATIONS.md) ⑤단계).
3. **업로드 방식은 회원이 고른다**: §3의 세 방식(보관만 / 즉시 / 예약) 중 회원이 고른 것만 실행하고, 고르지 않은 공개 범위로 올리지 않는다. 공개 범위 기본값은 「비공개」다.
4. **결과가 불확실하면 자동으로 다시 올리지 않는다**: 업로드·답글 게시가 시간 초과·네트워크 오류로 끝나 성공 여부를 모르면 「실패(확인 필요)」로 두고 자동 재시도하지 않는다. 회원이 유튜브 스튜디오에서 확인한 뒤 직접 다시 누르게 하고, 이미 올린 횟수를 화면에 보여 준다(기준: `shorts-onestop-studio/src/components/views/YoutubeUploadCard.tsx` 「이미 n번 올렸습니다」).
5. **중복 게시 방지**: 같은 영상·같은 댓글이 두 화면·두 탭·예약 실행에서 동시에 처리돼도 한 번만 올라가야 한다. 답글은 조건부 선점이 기준이다(`youtube-auto-reply/lib/comments/post.ts`). 서버 쪽 선점 없이 화면 버튼 잠금만 있는 곳은 「△」로 적는다.
6. **회원 데이터 격리·30일 자동 정리**: 대본·프로젝트·프롬프트·장면 이미지·음성·배경음악·완성 영상·답글 기록은 회원별로 두고(`user_id` + RLS), **생성일 기준 30일 뒤 예약 작업으로 자동 삭제**하며 지운 건수를 회원별로 기록한다(`usage_logs` `cleanup_expired`, 공용 `cleanup-usage-log`). 「목록을 열 때만 지움」이나 「일부 표는 제외」는 완료로 보지 않는다.
7. **비공개 저장 우선**: 회원 생성 파일은 비공개 버킷 + 서명 주소를 기본으로 한다(기준: `thumbnail-master/src/lib/images.ts`, `shorts-onestop-studio/src/lib/media.ts`). 외부 게시(인스타 릴스 등)가 공개 주소를 꼭 요구하면 그 이유와 만료 방법을 문서에 적는다.
8. **당해 연도 기준 프롬프트**: 주제·대본·제목·설명·트렌드를 만드는 프롬프트는 `new Date().getFullYear()`를 넣어 당해 연도 기준으로 쓴다(기준: `playlist-channel-studio/src/lib/playlist/prompts.ts` 7행, `shorts-onestop-studio/src/lib/prompts.ts`).
9. **YouTube API 할당량 안내**: 읽기 호출은 공용 `youtube-data-client`(기준 `youtube-viral-studio/src/lib/youtube/youtubeData.ts`) 사본으로 하고, 할당량 초과를 「키 오류」와 구분해 안내한다.
10. **검수 증거**: 로컬 검사(tsc·시험) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 실제 화면 확인을 각각 기록한다. 실제 업로드 시험은 **본인 채널 비공개**로만 하고, 시험 영상은 결과 보고에 영상 ID와 함께 적는다. 누르지 않은 버튼은 「미검수」.
11. **문서 갱신**: 같은 작업에서 [유튜브 기능 상세 비교표](YOUTUBE_FEATURE_MATRIX.md)의 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전을 고친다.

## 3. 회원이 고르는 항목

회원이 고르지 않은 값으로 생성·업로드·게시·과금하지 않는다.

| 항목 | 선택지 | 프로그램 | 근거 |
|---|---|---|---|
| **업로드 방식** | ⓐ **보관만**(MP4 내려받기·보관함, 유튜브에 올리지 않음) ⓑ **즉시 업로드**(공개 범위 비공개·일부 공개·공개 중 선택, 기본 비공개) ⓒ **예약 업로드**(유튜브 예약 공개 `publishAt` — 그때까지 비공개) | Shots·원스톱·플레이리스트 | 공용 `youtube-upload-client` `uploadYoutubeVideo`·`createYoutubeResumableSession`(`shots/src/lib/youtube/client.ts` 126~209행), Shots `lib/actions/youtube.ts` 242~252행(15분 뒤~6개월), 원스톱·플레이리스트 `app/api/youtube/upload-session/route.ts` |
| 올릴 채널 | 연결된 채널 중 선택 | 플레이리스트 | `playlist-channel-studio/src/components/video/YoutubeUploadCard.tsx` |
| 썸네일 지정 | 배경 그림 / 「AI 썸네일·SEO」 그림 | 플레이리스트 | `lib/youtube/thumbnail.ts`, `lib/youtube/thumbnailPicks.ts` |
| 쇼츠 영상 만들기 방식 | 브라우저에서 만들기(무료, 기본) / 고급 합성(JSON2Video, 회원 키) | Shots | `components/candidates/BrowserRenderPanel.tsx`, `lib/ai/render.ts` |
| 장면 AI 영상 | 기본 Gemini / Replicate / fal(장면당 예상 단가 표시) | Shots·원스톱 | `lib/video/videoModels.ts`(Shots), `lib/videoModels.ts`(원스톱) — 공용 `ai-video-*` 사본(영상 역할 소관) |
| 음성 | OpenAI·Gemini TTS / ElevenLabs(본인 목소리 복제 포함) | 원스톱·Shots | `shorts-onestop-studio/src/lib/tts.ts`, `src/app/api/voice/elevenlabs/route.ts`, `shots/src/lib/render/voices.ts` |
| 대본 AI·모델 | OpenAI / Gemini / Claude(회원 등록 키) | 트렌드·대본·원스톱·플레이리스트·댓글 | 각 폴더 `lib/ai/models.ts`·`lib/models.ts`·`lib/llm.ts` |
| 썸네일 해상도·테두리·브랜딩 | 1K·2K, 단색·네온·손그림, 채널명 | 썸네일 | `thumbnail-master/src/lib/tmb/` |
| 답글 게시 방식 | 검토 후 승인(기본) / 자동 게시(선택, 기본 꺼짐) | 댓글 | `youtube-auto-reply/lib/actions/settings.ts` `auto_approve`, `lib/comments/sync.ts` 144행 |
| 예약 모니터링 실행 방식 | AIMaster 기본 실행 / 내 cron-job.org(회원 키) · 일시정지·재개 | 댓글 | `lib/schedulerMember/`, `components/settings/SchedulerModePicker.tsx` |
| 답글 말투 | 말투 프리셋 | 댓글 | `lib/tonePresets.ts` |

- 업로드 방식 세 가지는 **영상을 올리는 모든 유튜브 프로그램에 갖춘다**. 새 프로그램이 업로드를 넣으면 셋 중 빠진 방식을 비교표에 「미구현」으로 적는다.
- 예약 업로드는 유튜브 자체 예약 공개(`status.publishAt`)를 쓰므로 회원 cron-job.org가 필요 없다. 우리 서버가 정해진 시각에 업로드를 시작하는 「예약 실행형」을 새로 만들면 [예약 기능 지침](SCHEDULER_POLICY.md)을 따른다.

## 4. 하지 않을 것

- **운영자·다른 회원의 키·Google 앱·채널로 대신 처리하지 않는다.** YouTube Data API는 무료지만 키당 하루 할당량이 있으므로 회원 본인 키를 쓴다(최상위 규칙 예외 조항의 「무료라도 한도가 있으면 본인 키」).
- **결과가 불확실한 업로드·답글을 자동으로 다시 보내지 않는다**(§2-4). 자동 게시(답글)는 새 댓글에 한 번만 시도하고 실패 건을 다시 올리지 않는다(현재 구현 `lib/comments/sync.ts`).
- **회원이 고르지 않은 공개 범위로 올리지 않는다.** 공개 범위를 비우면 비공개다.
- **조회수·수익을 보장하는 문구를 쓰지 않는다.** 분석·점수는 참고용임을 화면에 밝힌다.
- **남의 영상을 내려받아 다시 올리게 하지 않는다**(`yt-dlp` 원본 다운로드 금지 — [외부 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-YT-01 「하지 않기로 한 것」). 분석은 공식 API·Gemini 영상 이해·자막 정보로 하고, 대본은 새로 쓴다.
- **이미지·영상 생성 프롬프트를 다른 프로그램과 공유·복사하지 않는다.** 공용은 모델·주소·호출·대기 시간·결과 받기까지다([IMAGE_PROMPT_RULES.md](IMAGE_PROMPT_RULES.md)).
- **유료 생성(이미지·영상·음성)을 자동 재시도하지 않는다**(시간 초과 이중 과금 방지, `retries: 0`).
- **공용 사본을 직접 고치지 않는다**(`youtube-data-client`·`youtube-golden-engine`·`youtube-upload-client`·`browser-mp4-encoder`·`member-integrations`·`member-scheduler`·`cleanup-usage-log` 등). 기준을 고치고 `node scripts/check-shared-modules.mjs --sync`.
- **영상 엔진을 유튜브 프로그램 안에서 새로 만들지 않는다.** 렌더링·영상 모델 연동은 영상 역할의 기준 코드를 가져다 쓴다.
- 병합된 원본(`youtube-channel-consultant`·`seo-thumbnail-pro`·`yt-playlist-studio`)에 새 기능을 넣지 않는다. 옛 주소는 지우지 않고 이동 안내로 둔다.

## 5. 회원 본인 키·계정 규칙 (유튜브 적용)

- **YouTube Data API 키**(`youtube_api_key`): 발굴·분석용 읽기(트렌드·대본). 회원이 구글 클라우드에서 무료 발급한다.
- **Google OAuth 앱**(`google_client_id`·`google_client_secret`): 업로드(Shots·원스톱·플레이리스트)·댓글 게시(댓글)용. 회원 본인 Google Cloud 프로젝트의 앱이어야 한다. 원스톱·플레이리스트는 연결 화면이 없고 다른 유튜브 프로그램(댓글·Shots)에서 연결한 공용 계정을 쓴다 — 연결이 없으면 「○○에서 한 번 연결해 주세요」로 안내한다.
- 키 원문은 브라우저로 보내지 않는다. 브라우저 직접 업로드(원스톱·플레이리스트)는 서버가 회원 토큰으로 「재개 가능 업로드 주소」만 만들어 넘긴다(`createYoutubeResumableSession`).
- 새 외부 플랫폼 키가 필요하면 프로그램 전용 저장소를 만들지 않고 공용 `user_api_keys`·[회원 연동 정보](MEMBER_INTEGRATIONS.md) 구조에 항목을 추가한다.
- 키가 없거나 한도가 소진되면 다른 키로 폴백하지 않고 「본인 키를 등록해 주세요」로 안내한다. 이번 점검(2026-10-24)에서 7개 운영 앱 코드에 운영자 AI·YouTube 키 환경변수 사용은 찾지 못했다(`GOOGLE_YOUTUBE_REDIRECT_URI` 콜백 주소만 있음).

## 6. 한국인 인물 묘사·당해 연도 원칙

- 장면 이미지·썸네일·AI 영상 장면에 사람이 나오면 **기본은 한국인(동아시아인)으로 묘사**한다(핵심 원칙 3). 해외 특정 인물·해외 배경이 내용상 꼭 필요할 때만 다르게 묘사한다. 새 화풍·새 템플릿을 넣을 때 이 지시가 붙는지 확인한다. 2026-10-24 점검: 대본·Shots·원스톱·썸네일은 지시 문장 확인, 플레이리스트(AI 배경)는 인물 지시 문장을 못 찾음 — [비교표](YOUTUBE_FEATURE_MATRIX.md) §2-2.
- 주제 추천·뉴스/트렌드 대본·제목·설명은 당해 연도 기준이다. 현재 주입이 확인된 곳과 빠진 곳은 [비교표](YOUTUBE_FEATURE_MATRIX.md) §2-6.

## 7. 완성 보고 양식(유튜브)

완성 보고에는 아래를 따로 적는다: 업로드 방식 3종(보관만·즉시·예약)별 구현·검수 상태 / 중복 업로드·중복 답글 방지 방식 / 결과 불확실 시 처리(자동 재시도 없음 확인) / 공용 연결 계정 재사용·권한 범위 / 30일 정리 영향(어떤 표·어떤 버킷) / 회원 본인 키 확인 / 당해 연도 주입 / 연계(발굴 → 대본 → 제작 → 썸네일 → 업로드 → 댓글) 확인 여부 / 영상 엔진 연결(영상 역할 기준 코드 버전) / 비용 리포트(빌드·AI 호출·누구 키).
