# AI 가사영상 자동화 (`lyric-video-studio`) — 에이전트 인수인계

> 루트 `CLAUDE.md`·`AGENTS.md`를 먼저 읽는다. 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`).
> 서비스: https://lyric-video-studio.buylife.xyz · Vercel 프로젝트 `lyric-video-studio`(팀 `buylife`) · 현재 **v1.09**
> 출발점: 외부 상용 앱 Lyricbi 1.9.0 분석([`docs/analysis-lyricbi-20261021/REPORT.md`](../docs/analysis-lyricbi-20261021/REPORT.md)) — **코드는 옮기지 않고** 기능·흐름만 참고해 새로 만들었다.

## 1. 사용 목적과 대상
- 음악 파일 + 가사로 「지금 부르는 줄」이 강조되며 흐르는 **가사 영상(리릭 비디오) MP4**를 설치 없이 브라우저에서 만든다.
- 대상: Suno 등 AI로 곡을 만드는 회원, 자작곡·커버곡을 올리는 회원, 음악·플레이리스트 채널 운영자.
- 참고 앱의 가장 큰 불편(가사 시간 파일을 직접 만들어야 함)을 「탭 싱크」로 풀고, 2차에서 음악(SUNO) 자동화 곡의 시간 가사를 자동으로 받아오는 것이 목표.

## 2. 기술 스택·도구
- Next.js 16(App Router) + React 19 + TypeScript, 스타일은 순수 CSS(`src/app/globals.css`), 아이콘 `lucide-react`.
- 로그인·권한: 공용 Supabase(`@supabase/ssr`), `src/lib/access.ts`(루트 판정 사본 `programAccess.ts`), 쿠키 `.buylife.xyz` 공유.
- 영상: Canvas 2D 그리기(`src/lib/render/draw.ts`) + **공용 기준 코드 `browser-mp4-encoder` 사본**(`src/lib/render/mp4Encoder.ts`, 기준 `shorts-onestop-studio`, 직접 수정 금지 → `node scripts/check-shared-modules.mjs --sync`) + `mp4-muxer`.
- 소리 반응: 디코딩한 `AudioBuffer`에서 프레임 시각마다 FFT(`src/lib/render/spectrum.ts`) — 미리보기·내보내기 같은 값.
- 서체: Google Fonts 한글 6종(`src/lib/design.ts` `FONTS`).
- AI·유료 API: 없음(키 불필요). 유튜브 올리기만 회원 본인 Google OAuth 앱 + 공용 연결 계정(다른 유튜브 프로그램에서 연결). Remotion은 라이선스·서버 비용 때문에 쓰지 않는다.

## 3. 기능·구조·장단점
| 화면 | 파일 | 내용 |
|---|---|---|
| 대시보드 | `src/components/views/DashboardView.tsx` | 4단계 흐름, 최근 작업 4개 |
| 1 음악·가사 넣기 | `SourceView.tsx` + `studio/SunoImportCard.tsx` | **음악(SUNO) 자동화 곡 가져오기**(v1.05: 내 완성 보컬 곡 목록 `/api/suno/tracks`, 변주 선택 → 1시간 서명 주소로 음악·커버 받아 `loadAudio`·`loadCover`, 제목, 회원 본인 Suno 키로 시간 가사 `/api/suno/timed-lyrics` → `lib/sunoAlign.ts`가 단어 시각을 줄 시간표로; 실패하면 구간 표시 뺀 가사 글. `/source?suno=<변주 id>`로 자동 실행 — 음악 곡 카드 링크), 음악(디코딩 48kHz)·커버·제목·아티스트, 가사 `.srt`/`.lrc`/`.txt`·붙여넣기(UTF-8 실패 시 EUC-KR 재시도) |
| 2 가사 싱크 | `SyncView.tsx` + `studio/Waveform.tsx` | 곡 파형(전체/20초 확대) 위 줄 구간·번호 표시 — 번호를 끌면 그 줄 시작 이동(`moveStart`, 앞뒤 줄을 넘지 않음), 빈 곳을 누르면 그 위치로 이동.  스페이스바 탭 싱크(엔터 = 지금 줄 끝, 백스페이스 되돌리기), 줄별 끝 시각 칸(비우면 다음 줄 시작까지), 손 반응 보정 0~0.3초, 줄별 ±0.1초·시간 직접 입력·문구 수정·줄 추가/삭제, 전체 ±0.5초, `.srt` 받기 |
| 3 디자인 | `DesignView.tsx` + `studio/PresetThumb.tsx` | 프리셋 카드마다 지금 곡으로 그린 실제 미리보기(`drawFrame`), 가로 6·세로 4 프리셋, 배치 2, 현재 줄 강조 7, 서체 6, 색 4, 스펙트럼 4, 움직이는 빛, 표시 토글 |
| 4 MP4 내보내기 | `ExportView.tsx` | 준비 점검 4개, 24/30fps, 진행률·취소, 결과 재생·내려받기(서버에 남지 않음). 크롬·엣지는 「💾 파일로 바로 저장」(공용 엔진 `encodeMp4ToFile`, 30분까지, 8분 넘는 곡은 기본 켜짐) |
| 유튜브 올리기 | `studio/YoutubeUploadCard.tsx` + `/api/youtube/status`·`/api/youtube/upload-session` + `lib/youtube/*` | MP4를 만든 뒤 내 채널에 올리기(기본 비공개·예약 공개, 제목 「아티스트 - 곡 (Lyrics)」, 설명 = 가사 전문, 세로는 #Shorts, 카테고리 음악). 다른 유튜브 프로그램에서 연결한 공용 계정(`member_platform_accounts`)·회원 본인 Google 앱만 사용, 영상은 브라우저→유튜브 직접. 「파일로 바로 저장」한 경우 저장한 MP4를 골라 올림. 공용 사본: `memberIntegrations.ts`(member-integrations), `youtube/client.ts`(youtube-upload-client) |
| 내 보관함 | `LibraryView.tsx` + `/api/items` | 가사 시간표·디자인·제목만 저장(표 `lyric_video_items`, RLS 본인만, **30일 자동 삭제** `pg_cron` `lyric-video-studio-retention`) |
| 매뉴얼 | `GuideView.tsx` | 8대 매뉴얼 스타일(메타 바·개요·Step 1~4·팁·주의 배너) |

- 확인 상자: 브라우저 `confirm()` 대신 `src/components/ui/Confirm.tsx`(`useConfirm`, 위험 작업은 「취소」에 초점·상자 안 키는 밖으로 안 새게).
- 상태: `src/components/studio/StudioContext.tsx`가 작업 화면 전체를 감싼다. **메뉴는 반드시 `next/link`** — `<a href>`로 바꾸면 페이지가 새로 열려 넣은 음악이 사라진다.
- 가사 처리: `src/lib/lyrics.ts`(형식 오류에 너그러운 `.srt`, 다중 시간표 `.lrc`, `stampLine`·`clearFrom`·`timeline`·`lineAt`·`toSrt`). 시험 `npm test`(6개).
- 장점: 설치·키 불필요, 파일이 서버로 가지 않음, 미리보기 = 결과, 20초 1080p를 약 6초에 생성(이 PC 실측).
- 단점·한계: Suno 곡이 아닌 음악·커버는 저장 안 됨(다시 선택 — Suno 곡은 v1.06부터 다시 열 때 자동으로 받음). Suno 시간 가사는 Suno가 정렬한 결과라 반복 후렴 등에서 한두 줄 어긋날 수 있음(싱크 화면에서 고침). 음악·커버는 저장 안 됨(다시 열면 다시 선택), 기본 방식 12분·파일로 바로 저장 30분 제한(디코딩한 소리가 메모리에 있어야 함), 휴대폰·사파리는 인코딩·파일 저장 미지원일 수 있음, 노래방 발음 표기·LP·플레이리스트 없음.

## 4. 버전·변경 기록
| 버전 | 날짜 | 내용 |
|---|---|---|
| v1.06 | 2026-10-21 | Suno 곡 작업을 저장하면 변주 번호(`sunoVariantId`)도 남겨, 보관함에서 다시 열 때 음악·커버를 자동으로 다시 받음(`lib/sunoClient.ts`, Suno 조회 없음). 곡 목록에 보관함 저장 변주 「✓ 보관함」(누르면 그 작업 열기)·이번 접속에서 받은 변주 「✓ 받음」(재조회 없음). 플랜 `docs/PLAN_20261021_V1_06_SUNO_RESTORE.md` |
| v1.07 | 2026-10-21 | 유튜브 카드: 배경(커버) 그림이 있고 가로 영상이면 1280×720 JPG(가운데 잘라 맞춤, 2MB 이하) 미리보기·「⬇ 썸네일 내려받기」·「🖼 올릴 때 배경 그림을 썸네일로 지정」(기본 켬). 업로드 뒤 `/api/youtube/thumbnail`(`guard`·회원 공용 유튜브 연결 토큰만) → `lib/youtube/thumbnail.ts`(`thumbnails.set`, 플레이리스트 v1.23에서 복사·공용 기준 코드는 그대로). 세로(쇼츠)는 지정 안 함. 검수: 시험 11개·tsc·build·배포 Ready·DB v1.07, 크롬(관리자): 400·400·없는 영상 502 안내, 2초 시험 MP4 만든 뒤 카드에 미리보기 1280×720·32KB·체크·내려받기 표시(실제 업로드는 하지 않음 — 같은 함수는 플레이리스트에서 200 확인). 비용: Vercel 빌드 1회. 플랜 `docs/PLAN_20261021_V1_07_THUMBNAIL.md` |
| v1.08 | 2026-10-21 | 유튜브 「올릴 채널」 선택(개선 제안 C5, 플레이리스트 v1.24 `listYoutubeChannels`·`load(userId, accountId)` 그대로 복사 — 회원 본인 채널만, 연결한 순서 고정). `/api/youtube/status?account=`·업로드 주소·썸네일 API가 `accountId`를 받음. 카드: 채널 2개 이상이면 선택 칸(연결 상태가 나빠도 다른 채널로 바꿀 수 있게 항상 표시). 검수: 시험 11개·tsc·build·배포 Ready·DB v1.08, 크롬(시험 회원·유튜브 미연결): 채널 목록 비어 있고 선택 칸 없이 연결 안내만(다른 회원 채널로 대신하지 않음). 관리자 2채널 선택 확인은 관리자 로그인 뒤 확인 예정. 비용: Vercel 빌드 1회 |
| v1.09 | 2026-10-21 | 유튜브 카드에 「🎨 『AI 썸네일·SEO 자동화』에서 고르기」(플레이리스트 v1.26 `thumbnailPicks.ts` 복사·`/api/youtube/thumbnail-picks`, 회원 본인 행만·서명 주소 1시간). 고르면 1280×720으로 맞춰 미리보기·지정, 「↩ 배경 그림으로 되돌리기」. 검수: tsc·시험 11개·build·배포 Ready·DB v1.09, 크롬(시험 회원) API 200·빈 목록. 그림이 있는 계정 화면 확인은 남음. 비용: Vercel 빌드 1회 |
| v1.05 | 2026-10-21 | 2차: 음악(SUNO) 자동화 곡 가져오기 + Suno 시간 가사 자동(`src/lib/suno.ts`·`sunoAlign.ts`, API 2개, 시험 11개). `music/` v1.22 곡 카드 「🎬 가사 영상 만들기 →」. 플랜 `docs/PLAN_20261021_V1_05_SUNO.md` |
| v1.04 | 2026-10-21 | 추가개선 3-a: 유튜브 바로 올리기(원스톱 v1.19~v1.21 구현을 가져옴, 공용 사본 2개 등록) |
| v1.03 | 2026-10-21 | 추가개선 2: 파형 위 줄 시작 끌기(`Waveform.tsx`·`moveStart`, 시험 8개), 프리셋 카드 실제 미리보기(`PresetThumb.tsx`), 화면 안 확인 상자 6곳(`Confirm.tsx`) |
| v1.02 | 2026-10-21 | 추가개선 1: 줄 끝 시각 따로 정하기(끝 칸·엔터 키·간주), 앞 줄과 맞닿은 끝만 ±0.1초에 따라 움직임. 「파일로 바로 저장」 — 공용 엔진 기준 코드에 `encodeMp4ToFile` 추가(기존 `encodeMp4` 동작 같음), 길이 한도 30분. 플랜 `docs/PLAN_20261021_V1_02_TO_V1_04.md` |
| v1.01 | 2026-10-21 | 첫 공개: 4단계 흐름·탭 싱크·프리셋 10·강조 7·브라우저 MP4·보관함(30일)·매뉴얼. DB 등록(카테고리 음악, NEW, 권한 부여 방식, VIP 자동 부여 체크), 썸네일. 플랜 `docs/PLAN_20261021_V1_01.md` |

## 5. 남은 작업
- 백로그: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) · 개선 제안: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- **2차 남은 것**: 노래방 로마자 발음 표기, LP판(곡 가져오기·시간 가사·곡 카드 링크는 v1.05 완료).
- **주의(시간 가사)**: `music_tracks`↔`music_track_variants` 관계가 2개(연장 원곡)라 조회 때 `music_track_variants!music_track_variants_track_id_fkey`로 지정. 저장소 `music-audio`는 비공개(music v1.20) — 음악·커버는 서버에서 서명 주소로만. 음악 v1.21의 30일 자동 삭제로 지워진 곡은 410 안내.
- 3차: 플레이리스트(여러 곡·앨범 카드·챕터), Pexels(본인 키, 공용 연동 항목), 로고·프레임, 선택 AI(제목·설명).

## 6. 다른 프로그램과의 연계 아이디어
- `music-automation`(`music/`): 곡 표 `music_tracks.task_id`·변형 `suno_audio_id`로 시간 가사를 받아 무입력 가사 영상(2차).
- `playlist-channel-studio`: 플레이리스트 영상에 이 프로그램의 「가사 층」(lyrics.ts + drawLyrics)을 사본으로 얹는 확장 가능.
- `shorts-onestop-studio`·`shots`: 같은 MP4 엔진 사본을 쓰므로 세로 쇼츠 업로드(유튜브 공용 연동)를 가져오기 쉬움.
- `vinyl-lp-studio`: LP 회전 연출을 패널 디자인에 추가.

## 7. UI/UX 개선안
- 미리보기 위에서 가사 줄을 끌어 위치 조정, 줄별 끝 시각 따로 정하기, 파형(waveform) 위에서 시간 끌어 맞추기.
- 프리셋 썸네일을 실제 그리기 함수로 작게 렌더해 카드에 보여 주기.
- 휴대폰에서는 「내보내기는 PC에서」 안내를 맨 위에 띄우기.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
