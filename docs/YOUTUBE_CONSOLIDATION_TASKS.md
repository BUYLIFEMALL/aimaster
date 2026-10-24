# 유튜브 프로그램 부분 통합·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 유튜브 카테고리는 아직 전담 역할이 없다(플레이리스트는 음악 역할 `music`이 맡아 왔고, 영상 엔진은 영상 역할 `video` 소관). 담당이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 맡은 역할: 없음([`roles/README.md`](roles/README.md)) — 플레이리스트는 [`roles/music.md`](roles/music.md) 맡은 폴더에 있고, 영상 렌더링·영상 모델은 [`roles/video.md`](roles/video.md).

## 현재 위치와 읽는 순서

1. [유튜브 자동화 완성 기준](YOUTUBE_COMPLETION_POLICY.md) — 끝났다고 말할 조건·업로드 방식 3종·하지 않을 것.
2. [유튜브 기능 상세 비교표](YOUTUBE_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치. 항목을 시작하기 전에 읽고, 배포한 기능은 그 표의 칸을 고친다.
3. [유튜브 통합 분석 보고서](analysis-youtube-consolidation-20261020/REPORT.md) — 병합 결정의 1차 근거(§3 결론, §6 진행 결과·보류 F 재검토).
4. 프로그램별 기록: 각 폴더 `AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`, 병합 플랜 `youtube-viral-studio/docs/PLAN_20261020_MERGE_C_CONSULTANT.md`·`thumbnail-master/docs/PLAN_20261020_MERGE_D_SEO_PRO.md`·`playlist-channel-studio/docs/PLAN_20261020_MERGE_E_PLAYLIST_VIDEO.md`, 엔진 공유 플랜 `shorts-onestop-studio/docs/PLAN_20261021_YOUTUBE_UPLOAD.md`·`shots/docs/PLAN_20261021_BROWSER_RENDER.md`.

**2026-10-24 요약:** 병합 C·D·E는 2026-10-20 완료, 보류 F(Shots ↔ 원스톱)는 엔진 공유 2건 완료 후 합치지 않고 2026-11-18 무렵 재판단. 카탈로그 유튜브는 운영 7개 + 병합된 원본 3개(이동 안내)다. 이번 점검에서 **회원에게 실제 영향이 갈 수 있는 항목**이 나와 맨 위 「우선 처리」에 모았다.

> **🗣 주인님(관리자) 지시 — 2026-10-24, 절대 지시: 중복 발송·게시를 막는 작업을 작업 목록에 올린다.** 이 문서의 YT-U7(Shots 유튜브·인스타 업로드 중복 방지 서버 조건 없음)는 「중복 방지 묶음(DUP)」으로 우선 처리한다. 완료 기준: ① 결과가 불확실(시간 초과·게이트웨이 오류)하면 자동으로 다시 보내지 않고 「확인 필요」로 남긴다 ② 서버에서 상태를 먼저 잡고(조건부 update `where status in (...)` 또는 고유 제약) 이미 보냈거나 보내는 중이면 거절한다 — 화면 버튼 잠금만으로 끝내지 않는다 ③ 같은 대상 재발송은 회원 확인 창을 거친다 ④ 시험은 실제 발송 없이 모의로 하고, 실발송 시험은 주인님 승인 뒤 1건. 담당: 주인님이 나중에 지정.

## 우선 처리 (회원 영향 — 근거 경로 포함)

담당 세션은 아래부터 확인한다. 「확인 필요」는 코드로 사실은 확인했지만 정책 해석·외부 규칙 확인이 남은 것이다.

| ID | 문제 | 회원 영향 | 근거 경로 | 상태 |
|---|---|---|---|---|
| YT-U1 | **플레이리스트 생성 데이터 30일 자동 삭제 없음** — 프로젝트 행·썸네일 이미지 | 회원 생성 자료가 무기한 남음(최상위 규칙 「생성일 기준 30일 후 자동 삭제」 위반) | `playlist-channel-studio/supabase/migrations/0001_playlist_tables.sql`(30개 제한만), `vercel.json`(crons 없음), `src/app/api/`에 cron 경로 없음, 버킷 `playlist-thumbs`(`src/lib/projects.ts` 6행) | 확인 필요 → 정리 작업 추가 후보 |
| YT-U2 | **쇼츠 대본: 프롬프트 보관함은 30일 삭제 대상에서 명시적 제외, 프로젝트는 목록을 열 때만 삭제** | 다시 오지 않는 회원의 자료는 계속 남음 | `shorts-viral-studio/supabase/migrations/0004_svs_saved_prompts.sql` 4행, `src/lib/actions/projects.ts` 57~64행, `vercel.json` crons 없음 | 확인 필요 |
| YT-U3 | **Shots: 대본·주제 후보 행과 배경음악 트랙은 30일 정리 대상이 아님**(영상·음성·표지·장면 이미지 파일만 지움) | 생성 데이터 일부가 무기한 남음 | `shots/src/app/api/cron/cleanup-videos/route.ts`(`.delete()` 없음, `shots-bgm`은 `voice/`만), `shots/docs/IMPROVEMENTS.md` 39행 | 확인 필요 |
| YT-U4 | **원스톱: 대본 행(`shorts_onestop_items`)은 지우지 않음**(파일만 30일 정리) | 위와 같음(대본 본문) | `shorts-onestop-studio/src/app/api/cron/cleanup-media/route.ts` 12행 | 확인 필요(의도된 제외 — 정책 판단 필요) |
| YT-U5 | **당해 연도 주입 없음 — Shots 뉴스·트렌드 대본·주제 수집·게시 문구, 쇼츠 대본 파이프라인** | 뉴스·트렌드 쇼츠가 과거 연도 기준으로 쓰일 위험(핵심 원칙 8) | `shots/src/lib/ai/script.ts`·`collector.ts`·`posting.ts`, `shorts-viral-studio/src/lib/ai/pipeline.ts`(`getFullYear` 없음) | 후보 |
| YT-U6 | **Shots 회원 생성물 공개 버킷** — 완성 영상·장면 이미지·배경음악이 공개 주소 | 주소를 아는 누구나 회원 영상·이미지를 열 수 있음(경로는 회원·영상 ID라 추측은 어려움). 인스타 릴스 게시가 공개 주소를 쓴다는 이유 기록 있음 | `shots/supabase/migrations/20261021120000_shots_videos_bucket_v1_24.sql`(`public=true`), `src/lib/actions/browserRender.ts` 42행·`scripts.ts` 165행·`music.ts` 112행 `getPublicUrl` | 확인 필요(서명 주소로 바꿀 수 있는지) |
| YT-U7 | **Shots 유튜브 업로드·인스타 게시에 서버 쪽 선점 없음** — 「올리는 중」으로 표시만 하고 그 상태를 확인해 막지 않음 | 두 탭·빠른 두 번 누름에서 같은 영상이 두 번 올라갈 수 있음(화면 버튼 잠금은 있음). 시간 초과로 「실패」 표시된 업로드를 회원이 다시 누르면 중복 위험 | `shots/src/lib/actions/youtube.ts` 277~280·319행, `src/lib/actions/instagram.ts` 149·170행 | 후보(기준: `youtube-auto-reply/lib/comments/post.ts` 조건부 선점) |
| YT-U8 | **AI 생성 콘텐츠 표시·아동용 여부를 회원이 고를 수 없음** — 공용 업로드 코드가 `selfDeclaredMadeForKids: false` 고정, `containsSyntheticMedia` 없음 | AI 영상·음성 쇼츠를 올리는 회원이 유튜브 공개 규칙을 놓칠 수 있음 | 공용 `youtube-upload-client` 기준 `shots/src/lib/youtube/client.ts` 147·209행(사본 원스톱·플레이리스트 같음) | 확인 필요(유튜브 공식 문서·API 필드 확인 후 결정) |
| YT-U9 | 트렌드 분석 자막 가져오기가 서버에서 유튜브 화면을 직접 읽음(공식 API 아님) | 회원 키가 아닌 운영 서버 IP로 요청 — 차단·약관 위험(회원 데이터 피해는 아님) | `youtube-viral-studio/src/lib/youtube/transcript.ts` 20~23·73행 | 확인 필요 |

운영자 키·공용 Google 앱 사용, 다른 회원 데이터 공유, 답글 중복 게시는 **이번 점검에서 문제를 찾지 못했다**: 7개 앱에 운영자 AI·YouTube 키 환경변수 없음, 업로드·댓글은 회원 `google_client_id`·`google_client_secret`, 답글은 조건부 선점(`youtube-auto-reply/lib/comments/post.ts` 46~59행)과 댓글 고유 제약(`supabase/migrations/0001_youtube_auto_reply_tables.sql` 54행), 자동 게시는 새 댓글 1회만(`lib/comments/sync.ts` 142~145행).

## 유지할 역할과 이관 방향

| 유지할 프로그램 | 담당 구간 | 흡수한 장점 | 원본 도구 처리 |
|---|---|---|---|
| YOUTUBE 트렌드 분석 (`youtube-viral-studio`) | 발굴·진단 | 컨설턴트의 채널·키워드 진단·AI 리포트·공략 채널 | 컨설턴트 이동 안내(주소 유지) |
| 쇼츠 떡상 분석·대본 (`shorts-viral-studio`) | 공식 분석 → 대본·프롬프트 | 독립, 원스톱·썸네일로 넘기기 | 독립 |
| YOUTUBE 플레이리스트 자동화 (`playlist-channel-studio`) | 플레이리스트 기획·영상·업로드 | 플레이리스트 영상의 렌더 화면 `/video` | 플레이리스트 영상 이동 안내 |
| YOUTUBE Shots (`auto-shorts-posting`, 폴더 `shots/`) | 이미지 스토리 쇼츠·쇼츠/릴스 업로드 | 원스톱의 브라우저 MP4(공용) | 독립(보류 F) |
| AI 쇼츠 원스톱 (`shorts-onestop-studio`) | 정보 카드형 쇼츠·업로드 | Shots의 업로드(공용), EXT-YT-01·02 기능 | 독립(보류 F) |
| AI 썸네일·SEO (`thumbnail-master`) | 썸네일·업로드 문구 | 썸네일 프로의 SEO 3전략 | 썸네일 프로 이동 안내(옛 키 API 410) |
| 유튜브 댓글자동화 (`youtube-auto-reply`) | 응대 | 독립 | 독립 |

병합된 원본을 닫는 것과 데이터 삭제·이용권 변경은 다르다. 옛 주소(`youtube-channel-consultant.buylife.xyz`, `seo-thumbnail-pro.buylife.xyz`, `youtube-playlist.buylife.xyz` 등)는 지우지 않는다.

## 순차 작업 표 — 1차 병합 (2026-10-20, 보고서 §3·§6)

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**로 구분한다.

| ID / 순서 | 대상과 구현 범위 | 필요한 이유 | 근거·버전 | 현재 상태 |
|---|---|---|---|---|
| YT-C | 컨설턴트 → 트렌드: 채널·키워드 진단, AI 리포트, 공략 채널 하나로, 공용 기준 2개 위치 이동, 권한 148명 그대로 | 같은 키·엔진·디자인, 「소형 고효율 채널」 중복 | 트렌드 v1.21 · 플랜 `youtube-viral-studio/docs/PLAN_20261020_MERGE_C_CONSULTANT.md` | ✅ 완료 |
| YT-D | 썸네일 프로 → 썸네일: SEO 3전략을 서버 API로(키 원문 브라우저 전달 폐기), 프로 전용 5명 권한 부여 | 같은 흐름, 프로의 브라우저 키 보관 문제 | 썸네일 v1.09 · `thumbnail-master/docs/PLAN_20261020_MERGE_D_SEO_PRO.md` | ✅ 완료(역분석 미이식) |
| YT-E | 플레이리스트 영상 → 플레이리스트: `/video` 이식(기준 앱을 보고서와 반대로 정정), 권한 143명 동일 | 같은 사용자가 두 프로그램을 오감 | 플레이리스트 v1.16 · `playlist-channel-studio/docs/PLAN_20261020_MERGE_E_PLAYLIST_VIDEO.md` | ✅ 완료 |
| YT-F1 | 보류 F 엔진 공유 1: 원스톱에 유튜브 바로 올리기(공용 `youtube-upload-client`) | 원스톱에 업로드가 없었음 | 원스톱 v1.19 · `shorts-onestop-studio/docs/PLAN_20261021_YOUTUBE_UPLOAD.md`, 관리자 비공개 실업로드 `hdPuSpoz1eY` | ✅ 완료 |
| YT-F2 | 보류 F 엔진 공유 2: Shots에 브라우저 MP4(공용 `browser-mp4-encoder`) | JSON2Video 키 회원 1명뿐 | Shots v1.24~v1.26 · `shots/docs/PLAN_20261021_BROWSER_RENDER.md` | ✅ 완료 |
| YT-F3 | 사용 기록 추가(Shots·원스톱) | 보류 F 재판단 근거 | Shots v1.31 · 원스톱 v1.22 | ✅ 완료 |

## 대기·후속 (다음에 할 일 후보)

| ID | 대상과 범위 | 선행·기다리는 것 | 현재 상태 |
|---|---|---|---|
| YT-W1 | 보류 F 재판단: `usage_logs`에서 Shots(`518ed2eb-…`)·원스톱(`1d458f8e-…`) 동작·회원 수 집계(관리자·시험 계정 제외) | 2026-11-18 무렵 | 대기 |
| YT-W2 | 트렌드 → 대본 「이 쇼츠로 분석·대본」 넘기기 | 보고서 §3은 대본으로 넘기라고 제안했지만 현재 코드는 원스톱 `/topic`으로만 넘김(`youtube-viral-studio/src/components/ai/AiPanels.tsx` 14행, `components/analysis/ScriptAnalysisModal.tsx`) — 방향 결정 | 확인 필요 |
| YT-W3 | 대본 A/B를 대본 → 원스톱으로 넘기기 | EXT-YT-01 「못 옮긴 것」. 현재 대본 → 원스톱은 받아쓴 대사 넘기기(`shorts-viral-studio/src/components/studio/AnalyzeStep.tsx` 11~12행) | 후보 |
| YT-W4 | 사용 기록(`usage_logs`) 추가 — 트렌드·대본·플레이리스트 | 정의만 있고 호출 없음(`src/lib/programAccess.ts`) | 후보 |
| YT-W5 | 원스톱·플레이리스트 자체 유튜브 연결 화면 | 지금은 다른 유튜브 프로그램에서 연결해야 함 | 후보 |
| YT-W6 | 원스톱 일괄 제작 결과 자동 예약 업로드 | 카드 「단점」, 회원 선택·결과 불확실 처리 설계 필요 | 후보 |
| YT-W7 | 썸네일 프로 「올린 영상 역분석」 이식 | 병합 D 미이식 | 보류(회원 요청 시) |
| YT-W8 | 대본 좌측 메뉴 계정 위치 `22c6cda35` | 다음 대본 배포 | 미배포 대기 |
| YT-W9 | 댓글 「모니터링 중지」 즉시 반영·자동 수집 상태 보기 | 다음 댓글 배포 | 미배포 대기(`youtube-auto-reply/docs/IMPROVEMENTS.md` 43·48행) |
| YT-W10 | 댓글 「여러 개 한 번에 승인」(사람 승인 유지) | 주인님 승인 | 제안(`youtube-auto-reply/docs/IMPROVEMENTS.md` 10행) |
| YT-W11 | 플레이리스트 Spectrum P-6 확장, 음악(SUNO) 리믹스 결과 받기 | 음악 역할 범위 결정 | 대기(`docs/roles/music.md` 21행, `playlist-channel-studio/docs/IMPROVEMENTS.md` 50행) |
| YT-W12 | 원스톱 무료 음성 엔진 | 음악 역할에서 플랜·빌드 승인 대기 | 대기(`shorts-onestop-studio/docs/PLAN_20261024_FREE_TTS.md`) |
| YT-W13 | 떡상 지표 계산 두 곳(트렌드·대본 `lib/youtube/metrics.ts`) 공용화 여부 | 담당 판단 | 확인 필요 |
| YT-W14 | 유튜브 전담 역할 지정·업로드 정책(권한 범위·수익화 주의) 메인 지침 확정 | 주인님 지정 | 대기([카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「유튜브」 줄 「할 일」) |

## 항목마다 지킬 완료 조건

1. 착수 직전 `docs/ACTIVE_WORK.md`·미커밋 변경·역할 파일·최신 인수인계를 확인하고 **대상 프로그램 하나씩** 진행한다.
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 제시한다(프로그램 `docs/PLAN_YYYYMMDD_*.md`). 이미 있는 기능은 [비교표](YOUTUBE_FEATURE_MATRIX.md)로 확인해 중복 구현하지 않는다.
3. 무료·모의 검사부터 하고, 실제 업로드 시험은 시험 계정·본인 채널 **비공개**로, 유료 생성은 승인된 횟수만(가장 저렴한 모델) 한다.
4. 회원 본인 키·본인 Google 앱만, 회원별 저장, 생성일 기준 30일 예약 정리를 지킨다. 공용 사본(`youtube-upload-client`·`browser-mp4-encoder`·`youtube-data-client` 등)은 기준만 고치고 `node scripts/check-shared-modules.mjs --sync` — 업로드 공용 코드를 고치면 사본 3곳(원스톱·플레이리스트·`lyric-video-studio`)을 모두 시험한다.
5. 영상 엔진(렌더링·영상 모델)을 고쳐야 하면 영상 역할([`roles/video.md`](roles/video.md))에 먼저 알리고 그 기준 코드를 고친다.
6. 작은 수정은 「미배포 대기」로 모았다가 배포하고, 배포는 팀 전체에서 한 번에 하나씩 한다. 버전은 실제 배포 때 한 번만 올린다(코드 `lib/version.ts` + DB `programs.version`).
7. 완료 시 이 표의 상태·근거, 비교표 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 루트 `docs/HANDOFF.md`(제목에 `[역할: <ID>]`)를 갱신한다.

## 새 기능·개선점을 발견했을 때

- 발견한 프로그램의 `docs/IMPROVEMENTS.md`에 날짜·세션·근거 파일·영향·우선순위·상태를 적고, 이 문서 「대기·후속」(회원 영향이면 「우선 처리」)에 한 줄 추가한다.
- 공통 아이디어 표([`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md))에서 중복을 먼저 확인한다.
- 외부 참고 원본이 있으면 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드를 추가한다(현재 EXT-YT-01~03).

## 프로그램 주소

https://youtube-viral-studio.buylife.xyz

https://shorts-viral-studio.buylife.xyz

https://playlist-maker.buylife.xyz

https://shots.buylife.xyz

https://shorts-onestop-studio.buylife.xyz

https://thumbnail-master.buylife.xyz

https://youtube-auto-reply.buylife.xyz

https://youtube-channel-consultant.buylife.xyz (이동 안내)

https://seo-thumbnail-pro.buylife.xyz (이동 안내)

https://youtube-playlist.buylife.xyz (이동 안내)

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 보고서 §3·§6과 코드 점검으로 우선 처리 9줄·1차 병합 6줄·대기 14줄 정리 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
