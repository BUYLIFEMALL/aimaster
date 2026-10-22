# 🎬 AIMaster — 58번 YOUTUBE Shots 자동화 (AGENTS.md)

> **프로그램 정보**
> - **프로그램 번호**: 58번
> - **프로그램명**: YOUTUBE Shots(이미지 스토리) 자동화 (`auto-shorts-posting`, `shots/`)
> - **공식 배포 주소**: https://shots.buylife.xyz
> - **버전**: `v1.31` (`package.json` 1.31.0, `version.ts` v1.31, DB `programs` v1.31 — 2026-10-21)
> - **적용 디자인 템플릿**: **유튜브 다크 콘솔 스타일 (YouTube Dark Console — Shorts Studio Edition)**

---

## 1. 개요 및 설계 철학
바이럴 토픽 수집(HTTP/RSS/Perplexity)부터 OpenAI 6장면 시나리오, Gemini Nano-Banana 2.1 9:16 비주얼 에셋, Suno AI 테마 BGM 작곡, Remotion 모션 렌더링 및 유튜브/인스타그램 원클릭 배포까지 원스톱으로 지원하는 전문가용 숏폼 제작 자동화 스튜디오입니다.

사용자의 명시적 지시(**"58번 유투브 느낌을 살려줘"**)에 따라 유튜브 스튜디오 공식 콘솔의 다크 감성(옵시디언 블랙 `#0f0f0f`, 스튜디오 다크 서피스 `#181818`, 유튜브 공식 레드 `#ff0000`, 알약형 칩)을 전면 적용하였습니다.

---

## 2. 주요 UI/UX 개편 내역 (v1.20)
1. **유튜브 다크 콘솔 토큰 시스템 구축 (`globals.css`)**:
   - 옵시디언 다크 테마 배경 및 붉은색 네온 백라이트(`.studio-hero`) 탑재.
   - 스튜디오 서피스 카드(`.stat-card`) 및 유튜브 레드 알약형 탭 버튼 시스템 완성.
2. **사이드바 표준화 & 브랜딩 강화 (`Sidebar.tsx`)**:
   - 상단 유튜브 레드 플레이 버튼(▶), `v1.20 SHORTS LAB` 네온 뱃지 탑재.
   - 5단계 쇼츠 제작 스텝퍼(주제수집 ➔ 스크립트 ➔ 이미지 ➔ BGM ➔ 영상합성) 직관적 번호 표기.
   - `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설 및 모바일 햄버거 토글 드로어 완비.
3. **메인 워크스페이스 고도화 (`candidates/page.tsx`)**:
   - 유튜브 레드 발광 테두리의 `.studio-hero` 웰컴 배너 및 가이드북 바로가기 버튼.
   - 3대 핵심 KPI 카드: ① 바이럴 트렌드 수집 ② 9:16 비주얼 스토리보드 ③ Suno AI BGM & Full HD 렌더링.
   - 수집 도구(CandidateCollector) 및 후보 목록(CandidateList) 다크 스튜디오 테마 일체화.
4. **독립 비주얼 가이드북 전면 신설 (`/guide/page.tsx`)**:
   - 5단계 쇼츠 제작 파이프라인 프로세스 다이어그램.
   - 9:16 세로 씬 구성 및 떡상 연출 공식 매트릭스 표 (구간/시간/연출/비주얼/사운드).
   - 3대 오디오 팁 (0초 훅 비트 드롭, 1.8초 컷 전환, 고대비 볼드 자막 바).
   - 100% BYOK 보안 원칙 안내 배너 & FAQ 5종 레드 아코디언.

---

## 3. 핵심 규칙 준수 (100% BYOK & Edge 검수)
- **100% BYOK(Bring Your Own Key)**: OpenAI, Perplexity, Suno AI, Google Gemini, YouTube/Instagram API 키는 회원 본인의 것만 사용하며 타 회원이나 관리자 키로 폴백하지 않습니다.
- **Edge 브라우저 전용 실세션 검수 (headless: false)**:
  - Microsoft Edge 최전면 포그라운드 모드로 6종 스크린샷 캡처 수집 완료.
  - 주인님께서 실시간으로 확인하실 수 있도록 화면에 10분간(600초) 창 유지 완료.

---

## 4. 서브문서 목록
- `shots/README.md`: 프로그램 기능 및 아키텍처 안내
- `shots/docs/DESIGN_HANDOFF.md`: 유튜브 다크 콘솔 디자인 시스템 및 토큰 명세
- `shots/docs/IMPROVEMENTS.md`: 3대 필수 관점 개선 및 발전 아이디어
- `shots/docs/IMPROVEMENT_BACKLOG.md`: 향후 업그레이드 백로그
- `shots/docs/PLAN_20261019_DESIGN_RENEWAL.md`: v1.20 리뉴얼 상세 실행 플랜

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.21 — 회원 연동 정보 공용 저장 ④단계 Instagram (Claude Code 윈도우)
- 연결 콜백이 `instagram_accounts`와 공용 표 `member_platform_accounts`(platform `instagram`, `auth_method=facebook_login`, `extra.page_id`)에 함께 저장. 게시(`postToInstagramAction`)·영상 포스팅·스크립트 화면은 `src/lib/instagram/memberAccount.ts` `getShotsInstagramAccount` — Facebook 로그인 + 게시 권한 + 재연결 필요 아님 공용 계정 → 없으면 `instagram_accounts`. 해제는 공용 행도 삭제.
- 함께 고침: 화면 컴포넌트(`PostingSection`)에 계정 전체(토큰 포함)를 넘기던 것을 표시용 `ig_username`만 넘기도록 줄임.
- 남은 점: INSTA는 Facebook 로그인에 `facebook_app_id`(없으면 `meta_app_id`)를 쓰는데 이 프로그램은 `meta_app_id`만 쓴다 — 기존 동작이라 그대로 두고 `docs/IMPROVEMENTS.md`에 기록.
- 공용 부품 사본 `src/lib/memberIntegrations.ts`. 백필 `supabase/migrations/20261020180000_member_integrations_v1_21.sql`. 플랜 루트 `docs/PLAN_20261020_MEMBER_INTEGRATIONS_STEP4_INSTAGRAM.md`.

## 2026-10-20 v1.22 — 회원 연동 정보 공용 저장 ⑤단계 YouTube (Claude Code 윈도우)
- YouTube 연결 콜백이 `youtube_accounts`와 공용 표(platform `youtube`, 권한 `youtube.upload`+`youtube.readonly`, 갱신 토큰, `app_ref`=회원 `google_client_id`)에 함께 저장. 업로드·연결 상태 확인은 `src/lib/youtube/memberAccount.ts` `getShotsYoutubeAccount` — 업로드 권한 + 갱신 토큰 + 재연결 필요 아님 + 공용 계정의 앱이 지금 Client ID와 같음 → 없으면 `youtube_accounts`. 접근 토큰 갱신은 읽은 곳에, 갱신 실패 시 공용이면 「다시 연결 필요」 표시(자기 표엔 그 칸이 없음), 해제는 공용 행도 삭제.
- 유튜브 댓글 자동화(채널 관리 권한)와 권한이 달라 서로의 공용 토큰은 쓰지 않는다. 백필 `supabase/migrations/20261020210000_member_integrations_v1_22.sql`.

## 2026-10-20 v1.23 — YouTube 연결 하나로 합치기 + Facebook 앱 키 이름 맞추기 (Claude Code 윈도우)
- ② YouTube: 영상 포스팅 화면 연결 영역에 「다른 YouTube 프로그램 권한도 함께 받기」(연결 전 체크칸, 연결 후 「댓글 권한도 함께 받아 재연동」 버튼). 켜면 `force-ssl`·`upload`·`readonly`를 `include_granted_scopes=true`로 한 번에 요청(`src/lib/youtube/client.ts` 선택 인자, `ALL_YOUTUBE_SCOPES`), 콜백은 공용 표에 Google이 실제로 내준 권한(`scope`)을 기록 → 유튜브 댓글 자동화(v1.16, 같은 기능)와 한 번 연결로 같은 토큰을 쓴다.
- ③ Facebook 앱 키: Instagram(Facebook 로그인) 연결 시작·콜백이 `src/lib/apiKeys.ts` `resolveFacebookLoginApp` — `facebook_app_id`/`secret`(INSTA 포스팅과 같은 공용 칸) 먼저, 없으면 예전 `meta_app_id`/`secret`(기존 연결·회원 그대로 동작). 설정 화면에 Facebook 앱 칸 추가·안내 문구 정정. `docs/IMPROVEMENTS.md` 2026-10-20 항목 처리됨.
- DB 변경 없음(버전만, `supabase/migrations/20261020260000_youtube_scopes_fb_key_v1_23.sql`). 플랜 루트 `docs/PLAN_20261020_YOUTUBE_SCOPES_AND_SHOTS_FB_KEY.md`.

## 2026-10-21 — 유튜브 업로드 코드 공용 기준 등록(코드만, 미배포) (Claude Code 윈도우)
- `src/lib/youtube/client.ts`가 공용 기준 코드 **`youtube-upload-client`** 가 됨(사본: `shorts-onestop-studio/src/lib/youtube/client.ts`). 이 파일을 고치면 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영하고 원스톱도 함께 시험한다.
- 추가: `createYoutubeResumableSession()`(재개 가능 업로드 주소 — 브라우저에서 만든 영상을 직접 올릴 때). Shots는 아직 쓰지 않아 동작 같음 → 버전·배포는 다음 Shots 배포 때(`docs/SHARED_MODULES.md` 미배포 표).

## 2026-10-21 — 엔진 공유 2번 「브라우저에서 만들기」 진행 중(인수인계) (Claude Code 윈도우)
- 플랜(주인님 승인): [`docs/PLAN_20261021_BROWSER_RENDER.md`](docs/PLAN_20261021_BROWSER_RENDER.md). → 아래 v1.24~v1.26에서 완료.

## 2026-10-21 v1.24~v1.26 — 「브라우저에서 만들기(무료)」 (엔진 공유 2번 완료) (Claude Code 윈도우, 부계정)
- 렌더 화면(`src/components/candidates/RenderSection.tsx`)에 방식 선택: **① 브라우저에서 만들기(기본)** / ② 고급 합성(JSON2Video, 예전 그대로). ①은 `BrowserRenderPanel.tsx` — 목소리 6종(`src/lib/render/voices.ts`)·말 빠르기·진행 막대·멈추기·경고.
- 흐름(`src/lib/render/story.ts` `buildStoryMp4`): 장면 이미지 받기 + 본인 OpenAI 음성(`POST /api/render/tts`, `gpt-4o-mini-tts`, 오디오 바이트 바로 응답·저장 없음)을 **장면 동시 준비** → 장면 길이 = 0.3초 + 음성 + 0.5초(최소 3초) → 배경음악(선택 트랙 `audio_url`, 못 받으면 음악 없이 + 경고) → 공용 **`browser-mp4-encoder`**(`src/lib/render/mp4Encoder.ts` 사본 — 직접 고치지 말 것)로 1080×1920·30fps·**4Mbps** MP4. 화면: 이미지 cover + 느린 확대(8%) + 장면 바뀔 때 0.3초 겹침, 자막 = JSON2Video 설정과 같은 모양(Noto Sans KR 900·80px·`#FFD200`·검은 테두리 6·가운데·2어절씩 글자 수 비례).
- 저장(`src/lib/actions/browserRender.ts`): 서버가 버킷 **`shots-videos`**(공개 읽기·50MB·mp4만) 일회용 서명 업로드 주소 발급 → 브라우저가 직접 업로드(Vercel 4.5MB 한도 회피) → 경로 `<회원 id>/<영상 id>/<시각>.mp4` 확인 후 같은 폴더의 이전 파일 삭제·`rendered_video_url`·`render_status=ready` 저장 → 기존 유튜브(서버가 주소에서 받아 업로드)·인스타(공개 주소 전달) 게시 코드 변경 없음.
- 30일 정리: `GET /api/cron/cleanup-videos`(`vercel.json` 매일 18:30 UTC, `CRON_SECRET` — 2026-10-21 주인님 승인으로 Shots 프로젝트에 새로 등록). 30일 지난 파일 삭제 + 그 주소를 쓰던 영상의 완성 상태 비움. `?dry=1` 미리보기.
- 음성 경로 보안: 같은 출처(`Origin` = 호스트)만, `checkProgramAccessApi`, 본인 OpenAI 키만(없으면 400 `no_key`). 운영 확인: 다른 출처 403·비로그인 401·정리 경로 비밀값 없이 401.
- v1.25: 장면 동시 준비(차례로 받으면 장면당 5~10초)·4Mbps(8Mbps는 50초에 31.7MB → 19MB). v1.26: 음성 요청 30초 제한 + 1번 다시 시도(가끔 한 장면만 60~90초 늦음 — 실측 89초), 서버는 브라우저가 끊으면 OpenAI 요청도 중단(60초 제한).
- 매뉴얼 5단계·FAQ(JSON2Video 없이 만들기) 갱신, 스크립트 화면 「키 등록 필요」 목록에서 JSON2Video 제외. 메인 상세 소개 🎞️·🔑 단락·특징 4번 갱신(453자).
- 검수: tsc·build·공용 점검, 운영 Ready(v1.24·v1.25·v1.26). 크롬 관리자 영상 「마케팅, AI 없인 못 살겠더라」 3회: 49.4초·31.7MB(v1.24) → 46.4초·19.0MB(v1.25, 이전 파일 자동 삭제 확인) → 50.7초(v1.26, 40초 안에 완성). 자막 위치·모양, 소리(음성 구간만 소리·여백 무음) 확인. 시험 비용: OpenAI TTS 18회(약 30원, 관리자 본인 키).
- 시험 계정(`buylifemall@naver.com`) 확인(2026-10-21): Shots v1.26 접근 정상, 관리자 영상 주소 404(제목 노출 없음), `/api/render/tts` 권한 통과(빈 대사 400). 남은 일: 실제 유튜브·인스타 게시는 외부 게시라 미시험(관리자 Shots 유튜브 연결은 「재연동」 필요 상태). SQL: `supabase/migrations/20261021120000_shots_videos_bucket_v1_24.sql`·`20261021130000_version_v1_25.sql`·`20261021140000_version_v1_26.sql`.

## 2026-10-21 v1.27 — 배경음악 파일 확실히 보관 + 음성 다시 쓰기 (Claude Code 윈도우, 부계정)
- 플랜(주인님 승인 「1·2번 진행, 3번 제외」): [`docs/PLAN_20261021_BGM_VOICE_YOUTUBE.md`](docs/PLAN_20261021_BGM_VOICE_YOUTUBE.md).
- 배경음악(`src/lib/actions/music.ts`): `persistBgmAudio`를 서버 관리자 키 저장(경로 `<회원 id>/<영상 id>-<uuid>.mp3`)·1회 재시도로 바꾸고, **실패하면 Suno 임시 주소를 저장하지 않는다**(예전엔 조용히 임시 주소 저장 → 며칠 뒤 404, 운영 2건). 일부만 저장되면 저장분을 지우고 `processing`으로 둬 10초 자동 확인이 다시 시도. 트랙 삭제도 관리자 키로 본인 폴더 파일만.
- 음성 다시 쓰기(`src/app/api/render/tts/route.ts`): 요청에 `videoId`를 받아 본인 영상인지 확인 → (모델·목소리·빠르기·대사) 해시로 `shots-bgm/<회원>/<영상>/voice/<해시>.mp3`를 먼저 찾고 있으면 OpenAI 없이 돌려줌(`X-Voice-Cache: hit`), 없으면 만들고 보관(`miss`). 30일 정리(`/api/cron/cleanup-videos`)가 보관 음성도 지움.
- 검수: tsc·build, 운영 Ready, DB v1.27. 크롬 관리자 같은 영상 2회: 1회째 `miss`×6·67초 → 2회째 `hit`×6(OpenAI 0회)·34초, 길이 46.8초 같음, 보관 음성 6개·영상 파일 최신 1개. 배경음악 보관은 Suno 유료 생성이 필요해 실시험 안 함(코드·빌드만). 시험 비용 TTS 6회(약 10원).

## 2026-10-21 v1.28 — 유튜브 올리기 공개 범위·예약 공개 (Claude Code 윈도우, 부계정)
- 예전엔 항상 「공개」로 바로 올라갔다. 업로드 화면(`src/components/candidates/PostingSection.tsx`)에 공개 범위(**비공개 기본**·일부 공개·공개) + 「정한 시각에 자동 공개(예약)」 체크·날짜 시각 입력, 버튼 문구 「유튜브에 예약 올리기」.
- 서버(`src/lib/actions/youtube.ts` `postToYoutubeAction`): 값 검사(예약은 15분 뒤~6개월 안), 업로드 방식은 그대로 서버가 저장소 영상을 받아 올림(영상이 저장소에 있어 4.5MB 한도 문제 없음 — 브라우저 직접 업로드는 이득이 적어 하지 않음).
- 공용 기준 `youtube-upload-client`(`src/lib/youtube/client.ts`) `uploadYoutubeVideo`에 선택값 `publishAt` 추가(있으면 privacy를 private로) → `--sync`로 원스톱 사본 반영(원스톱은 이 함수를 안 써서 동작 같음, 미배포).
- 검수: tsc(두 프로그램)·build·공용 점검, 운영 Ready, DB v1.28, 크롬 화면에서 선택 칸·예약 입력·버튼 문구 확인. **실업로드 성공(2026-10-21, 주인님 재연동 후)**: 관리자 채널에 비공개 + 예약(2027-03-15 09:00 KST) — 영상 `2EgI3UR8eOw`, 카테고리 교육(27), DB `youtube_status=posted`, 유튜브 스튜디오 「예약됨 · 공개로 예약 2027.3.15 오전 9:00 · 게시 때까지 비공개」 확인. **시험 영상은 주인님이 삭제**: https://studio.youtube.com/video/2EgI3UR8eOw/edit

## 2026-10-21 v1.29 — 유튜브 연결 카드 (Claude Code 윈도우, 부계정)
- 플랜(주인님 승인): [`docs/PLAN_20261021_YOUTUBE_CONNECT_HISTORY.md`](docs/PLAN_20261021_YOUTUBE_CONNECT_HISTORY.md). 계기: 「유투브 연동 버튼이 없어 어디서 하는거야」.
- 공용 화면 조각 `src/components/youtube/YoutubeConnectCard.tsx`: 상태(✅ 연결됨·채널 이름 / ⚠️ 만료 / ⚪ 미연결) + 「채널 연결하기」·「다시 연결하기」·「연결 해제」 + 「댓글 자동화 권한도 함께 받기」. 넣은 곳: 설정 「📺 YouTube 연동」 맨 위(돌아올 곳 `/settings`), 영상 화면 업로드 칸(알약 버튼·만료 안내·미연결 폼을 대체), 영상 포스팅 `/videos` 맨 위 1번(영상별 칸은 `showConnectCard={false}`). 연결 해제는 `/settings`도 새로 고침. `/videos` 빈 목록 안내의 옛 버튼 이름 「쇼츠생성하기」 → 「최종 영상 만들기」.
- 검수: tsc·build, 운영 Ready, DB v1.29. 크롬 관리자: 세 화면 카드 「✅ 연결됨 — BUYLIFE ACADEMY…」, 설정의 「다시 연결하기」 → 구글 계정 선택 화면(state에 `/settings`), 계정은 고르지 않고 돌아와 연결 유지 확인.

## 2026-10-21 v1.30 — 유튜브 업로드 기록·한 번 더 올리기 (Claude Code 윈도우, 부계정)
- DB(주인님 승인, 크롬 Supabase SQL 편집기에서 실행): `shorts_videos.youtube_uploads jsonb not null default '[]'` + 이미 올린 2건을 첫 기록으로 옮김(`supabase/migrations/20261021180000_youtube_uploads_v1_30.sql`). 옮긴 기록의 시각은 비움 — **이 표의 `updated_at`은 수정해도 갱신되지 않아**(트리거 없음) 실제 업로드 시각이 아님. 오늘 시험 영상 `2EgI3UR8eOw`는 알려진 값(비공개·예약 2027-03-15 09:00)으로 채움.
- 업로드(`postToYoutubeAction`)가 {videoId, url, privacy, publishAt, at}를 앞에 붙여 최근 10개 저장. `youtube_video_id`·`youtube_video_url`은 「가장 최근 업로드」로 유지(인스타·다른 화면 호환).
- 화면(`PostingSection`): 예전엔 한 번 올리면 「업로드 영상보기」 링크만 남아 다시 올릴 수 없었음 → 「올린 기록 (N)」 목록(영상 링크·공개 범위 또는 예약 시각·올린 시각) + 「이미 N번 올렸습니다」 경고 + 「유튜브에 한 번 더 (예약) 올리기」.
- 검수: tsc·build, 운영 Ready, DB v1.30, 크롬 관리자 화면에서 기록 1건·경고·버튼 확인. 실제 재업로드는 외부 게시라 미시험.

## 2026-10-21 — `updated_at` 자동 갱신 장치(DB만, 코드·버전 변경 없음) (Claude Code 윈도우, 부계정)
- 주인님 승인. 운영 DB(ref `esgxyikcnnvmlhygjkth`)의 Shots 표 5개(`shorts_videos`·`shorts_video_segments`·`shorts_candidates`·`user_render_settings`·`youtube_accounts`)에 `before update` 장치 `<표>_updated_at` → 기존 공용 함수 `public.update_updated_at()`(`programs`와 같음). 원스톱 `shorts_onestop_items`는 코드가 직접 넣어 제외. 크롬 SQL 편집기 실행, 파일 `supabase/migrations/20261021190000_updated_at_triggers.sql`.
- 확인: 장치 5개 조회, `shorts_videos` 1행 설명을 같은 값으로 다시 저장 → `updated_at` 2026-09-11 → 지금 시각, 내용 같음.

## 2026-10-21 v1.31 — 사용 기록 `usage_logs` (보류 F 재판단용) (Claude Code 윈도우, 부계정)
- 기존 `logProgramUsage`(`src/lib/access.ts`, 관리자 키·실패해도 계속)를 성공 지점 5곳에서 부름: `script_created`(스크립트 생성) · `video_browser`(브라우저 만들기 저장) · `video_j2v`(JSON2Video 합성 요청) · `youtube_uploaded`(+ `youtubeVideoId`·`scheduled`) · `instagram_posted`. 메타데이터는 ID만.
- 검수: tsc·build, 운영 Ready, DB v1.31. 크롬 관리자 브라우저 만들기 1회(보관 음성 hit×6, 비용 0원) → `usage_logs` `video_browser` 1행 확인.

## 2026-10-22 v1.32 — 장면 AI 영상(공용 기준 코드 `ai-video-*` 사본) (Claude Code 윈도우)
- 출처: 외부 `shorts-auto` 분석 묶음 ① 「엔진 공유」 — 원스톱 v1.23~v1.25에서 만든 AI 영상 호출을 `ai-image-studio/lib/video/`를 기준으로 공용화하고 이 프로그램에 사본(`src/lib/video/videoModels.ts`·`videoParse.ts`·`videoProviders.ts` — 직접 수정 금지, `--sync`).
- 스크립트 화면 장면 카드 아래 「🎬 장면 AI 영상」(`src/components/candidates/SceneVideoBox.tsx`): 모델(기본 Gemini Omni Flash, Replicate·fal 선택, 단가 표시·키 미등록 표시)·길이(모델 허용 5·8·10초)·「다음 장면과 이어지게」·금액 버튼. 진행 작업 번호는 이 브라우저 `localStorage`(`shots-scene-job:<장면 id>`)에 기억 → 새로고침해도 15초마다 이어서 확인, 자동 다시 보내기 없음. 완성되면 미리보기 + 「영상 지우기(이미지로 되돌리기)」.
- API `POST /api/video/scene`(같은 출처·`checkProgramAccessApi`·본인 키): submit/check/delete. 시작·끝 사진은 화면 값이 아니라 서버가 DB에서 본인 장면·다음 장면 선택 이미지를 읽음. 사용 기록 `video_scene`.
- 저장: **표 구조 변경 없음** — 공개 버킷 `shots-videos`의 `<회원>/<영상>-scenes/<장면 id>.mp4`(`src/lib/video/sceneVideo.ts`, 덮어쓰기). 완성 영상 폴더와 분리돼 「브라우저에서 만들기」 이전 파일 정리에 지워지지 않고, 30일 정리 작업(`/api/cron/cleanup-videos`)은 함께 지움. 화면 주소는 `?v=저장 시각`.
- 「브라우저에서 만들기」(`src/lib/render/story.ts`): 장면에 영상이 있으면 프레임마다 그 시점으로 옮겨 그림(장면이 더 길면 반복), 못 받으면 경고 후 이미지.
- 키: 키 종류에 `fal`·`replicate` 추가(설정 화면 자동 노출, 운영 허용 목록은 원스톱 v1.26 작업에서 추가됨). 매뉴얼 FAQ 「장면을 움직이는 영상으로」.
- 검수: tsc·build·공용 점검, 배포 Ready(빌드 1회, 원스톱·ai-image-studio는 미배포 — 주인님 결정), DB v1.32, 다른 출처 403·비로그인 401. 크롬 시험 회원: 주제 수집(HTTP) → 스크립트 → 장면 1·2 이미지(NanoBanana Lite 1K) → 장면 1 Replicate Seedance 1 Lite 5초: **이어 붙이기(끝 화면=장면 2)는 Replicate가 E006 「입력 거절」(4.6초, 요금 없음으로 판단)**, 끝 화면 없이 다시 보내 성공(약 1분, 10.7MB, 공개 주소 200), 새로고침 뒤 미리보기·지우기 버튼 확인.
- 미확인: 「브라우저에서 만들기」에 영상 장면을 넣은 실제 MP4(장면 6개 이미지가 모두 있어야 함 — 시험 영상은 2개만), Gemini·fal 경로의 Shots 실생성.
- 비용: Vercel 빌드 1회, OpenAI(주제·스크립트) 약 $0.02, Gemini 이미지 2장 약 $0.08, Replicate 성공 1회 약 $0.18(실패 1회는 요금 없음으로 판단) — 시험 회원 본인 키.

## 2026-10-22 v1.33 — Seedance 1 Lite 이어 붙이기 끔·「이어지게 끄고 다시 만들기」·다크 선택칸 색 (Claude Code 윈도우)
- E006 재현: 같은 장면 1→2 사진으로 「이어지게」(끝 화면 `last_frame_image`)를 다시 보내자 Replicate가 또 E006(입력 거절, 작업 `69zc1szhe1rmw0d1c56rpqt1pm`). 두 사진은 같은 크기(768×1376 jpeg)라 형식 문제 아님, 끝 화면 없이 같은 사진은 성공 → 공용 기준 `ai-image-studio/lib/video/videoModels.ts`에서 이 모델 `endFrame: false`(사본 원스톱·Shots `--sync`). Kling·fal·Gemini는 그대로.
- `SceneVideoBox`: 이어 붙이기를 지원하지 않는 모델이면 체크칸 꺼짐·잠김 「(이 모델은 미지원)」. 「이어지게」 요청이 거절되면(제출·확인 어느 쪽이든) 「이어지게 끄고 다시 만들기 · 약 $」 버튼 — 회원이 눌러야만 다시 요청(자동 재요청 없음, 이중 과금 없음). 글자·버튼 색을 다크 콘솔 색으로.
- 선택칸 4곳(`SegmentCard` 이미지 모델, `ScriptEditor` 이미지 모델, `PostingSection` 카테고리, `SceneVideoBox`)을 `CandidateCollector`와 같은 다크 선택칸 색(`bg-[#121212]`·`text-[#f1f1f1]`·펼침 목록 `bg-[#181818]`)으로 — 이전엔 글자 거의 검정·배경 투명이라 #0f0f0f 위에서 안 보임(크롬 계산값 확인).
- 영상 장면 MP4 실측(크롬, 시험 회원): 장면 3~6 이미지 생성(NanoBanana 2 · 2K 4장) → 「브라우저에서 만들기」 약 20초 → 46.0초·1080×1920·**17.6MB**(50MB 안) 저장 성공, 경고 없음. 최종 MP4 장면 1 구간 프레임이 장면 AI 영상 원본의 같은 시점과 일치(정지 이미지 아님).
- 검수: tsc·build·원스톱 tsc·시험 13개·공용 점검 일치, 배포 Ready(`shots-fsgqpf5ft`, 빌드 1회), DB v1.33, 화면에서 v1.33·선택칸 색·Seedance 체크칸 잠김 확인. 미확인: 「이어지게 끄고 다시 만들기」 버튼 실제 표시(거절이 나야 보임 — 비용 때문에 다시 거절시키지 않음).
- 비용: Vercel 빌드 1회, Replicate E006 1회(요금 없음으로 판단), Gemini 이미지 4장 약 $0.16, OpenAI 음성 6장면 약 $0.01 — 시험 회원 본인 키, 모두 주인님 승인 범위.

## 2026-10-22 v1.34 — 다크 화면에서 안 보이던 글자 정리 (Claude Code 윈도우, 주인님 지시 「Claude가 진행」)
- 크롬에서 글자색과 실제 바탕색(가장 가까운 칠해진 조상)의 밝기 차이가 0.3 미만인 요소를 8개 화면에서 찾아 고침: 화면 제목·설명 5곳(`scripts`·`images`·`music`·`videos`·`settings` page), 스크립트 화면 「장면별 대사·이미지 프롬프트」 제목·페이지 제목(`scripts/[id]`), 장면 카드 제목·이름표·안내 문구·테두리·입력칸 2개(`SegmentCard`), 주제 수집 URL·RSS 입력칸 4곳(`CandidateCollector`).
- 원인: 공용 `Input`·`Textarea`가 `clsx`로 기본 `text-neutral-900`을 붙이고 화면에서 넘긴 다크 색은 뒤에 이어 붙일 뿐이라(클래스 병합 아님) CSS 순서상 다크 색이 지는 경우가 있었음 → 덮어쓰는 쪽에 Tailwind v4 우선 표기 `text-[#f1f1f1]!` 등 사용(빌드 CSS `color:#f1f1f1!important` 확인). 공용 컴포넌트 자체는 흰 카드에서도 쓰이므로 그대로 둠.
- v1.33에서 다크로 바꾼 선택칸 중 흰 카드 안 2곳(`ScriptEditor` 이미지 전체 생성, `PostingSection` 카테고리)은 흰 카드 색으로 되돌림. 매뉴얼의 빨강·초록 강조와 주제 목록 「영상스크립트 보기」 빨간 배지는 디자인 의도라 그대로.
- 검수: tsc·build, 배포 Ready(`shots-cglzg2fmx`, 빌드 1회 — 주인님 승인), DB v1.34, 라이브 재검사 8개 화면 통과(디자인 강조 2개 제외), 장면 카드 화면 캡처 확인. 비용: 빌드 1회 외 없음.

## 2026-10-22 v1.35 — 릴스 표지 이미지(cover_url) (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_REEL_COVER.md`(주인님 승인). 출처: 아이디어 `IDEA-THUMB-REELS-01`(AI 썸네일·SEO 자동화 v1.13 세로 9:16 JPG를 릴스 표지로).
- `src/lib/instagram/reelCover.ts`(경로 `<회원>/covers/<영상>.jpg`·JPG·8MB 확인·9:16 안내, 버킷 `shorts-images`), `src/lib/actions/reelCover.ts`(일회용 업로드 주소·확인·삭제, `findReelCoverUrl`), `src/components/candidates/ReelCoverPicker.tsx`(인스타 칸 「표지 이미지 (JPG, 선택)」), `client.ts` `createReelContainer`·`publishInstagramReel`에 `coverUrl` → `cover_url`, `postToInstagramAction`이 표지를 찾아 함께 보냄(없으면 예전 그대로 첫 화면). 30일 정리에 표지 포함(`updated_at` 기준). DB·버킷 설정 변경 없음.
- 시험 파일 `tests/reelCover.test.mjs`(이 프로그램 첫 시험, `node --test tests/reelCover.test.mjs`).
- 검수: tsc·build·시험 통과, 커밋 `c7e442fe7`, 배포 `shots-b2mhjafyw` Ready, DB v1.35, 정리 경로 비밀값 없이 401. 저장소 실제 시험(시험 회원 폴더, 액션과 같은 순서): 썸네일 세로 JPG(219KB) 일회용 주소 업로드 2회(덮어쓰기) 성공, 목록 `image/jpeg`, 공개 주소 200, 삭제 후 열리지 않음.
- 못 한 것: 시험 회원 shots에 **인스타그램이 연결돼 있지 않아** 표지 칸(연동중 영역 안)을 화면으로 보지 못함. 실제 릴스 게시(외부 공개)도 안 함 — 회원이 표지를 넣고 게시할 때 인스타에서 표지 반영 확인 필요.
- 비용: 빌드 1회, AI 0회.
- `browser-mp4-encoder` 사본(2026-10-21 반영)은 v1.33부터 배포에 포함됨(`docs/SHARED_MODULES.md` 갱신).

## 2026-10-22 v1.36 — 장면 이미지 30일 정리 · 인스타 미연결 표지 안내 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_SCENE_IMAGE_CLEANUP.md`(주인님 승인, 삭제 포함).
- `/api/cron/cleanup-videos`: 장면 이미지(`shorts-images/<회원>/<영상>-<장면>-<uuid>.*`) 만든 지 30일 지나면 삭제 + `src/lib/sceneImageCleanup.ts` `pruneSegmentImages`로 `image_urls`에서 빼고 `image_url`이면 비움. 응답에 `expiredImages`·`removedImages`·`clearedSegments`. `SegmentCard` 30일 안내, `PostingSection` 인스타 미연결 때 표지 안내.
- 시험 `tests/sceneImageCleanup.test.mjs`(전체 `node --test tests/*.test.mjs` 2개 통과).
- 검수: tsc·build, 커밋 `44e2522ff`, 배포 `shots-1xxupqapb` Ready, DB v1.36. 배포 전 읽기 전용 미리보기: 30일 지난 19개(59.7MB) → 장면 기록 18개·선택 이미지 18개 비워질 예정. 크롬(시험 회원) 스크립트 화면: 장면 카드 6개에 30일 안내(#aaa), 인스타 칸 표지 안내 확인.
- **첫 실제 삭제는 다음 정리 시각(2026-10-22 18:30 UTC = 10-23 03:30 KST)** — 다음 세션에서 Vercel 로그 `[cleanup-videos] scene images expired … removed … segments …` 확인 필요.
- 비용: 빌드 1회, AI 0회.

## 2026-10-22 v1.37 — 정리 기록(usage_logs) · 정리된 장면 표시 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_CLEANUP_LOG.md`(주인님 승인). DB 칸 추가 없음.
- `src/lib/sceneImageCleanup.ts` `CLEANUP_ACTION="cleanup_expired"`·`countByOwner`·`cleanupByOwner`(순수), `/api/cron/cleanup-videos`가 회원별 `logProgramUsage`(metadata 영상·음성·표지·이미지 개수 + 비워진 장면 id, 응답 `loggedOwners`). `src/lib/cleanupLog.ts` `findExpiredSegments`(관리자 키, 느슨한 타입 — shots DB 타입에 `usage_logs` 없음), 스크립트 화면 → `ScriptEditor` → `SegmentCard` `imageExpired` 안내(호박색 상자).
- 검수: tsc·build·시험 3개, 커밋 `4b35bf994`, 배포 `shots-isvjf6tev` Ready(18:30 UTC 정리 전), DB v1.37, 크롬(시험 회원) 스크립트 화면 오류 없이 장면 6개·30일 안내. 「정리됐습니다」 표시는 기록이 생긴 뒤에만 보임 — **다음 세션: `usage_logs` action `cleanup_expired` 행과 Vercel 로그 확인, 기록 있는 회원 화면에서 표시 확인**.
- 비용: 빌드 1회, AI 0회.
