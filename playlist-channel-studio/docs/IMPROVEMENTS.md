# 플레이리스트 채널 제작 자동화 (`playlist-channel-studio`) — 개선사항 관리 대장 (IMPROVEMENTS.md)

> **✅ [음악 담당께 · 2026-11-13 업무 워크스페이스 담당] 유튜브 올리기 기록 → 워크스페이스 보내기 붙임(v1.40 배포됨 2026-11-13, `playlist-channel-studio-f10pyrzt0`)**: 「📋 내가 올린 영상」 줄마다 「📨 업무 워크스페이스로」 버튼(`src/components/video/SendToWorkspaceButton.tsx`) → `POST /api/work-inbox { videoId }`(회원 본인 `playlist_youtube_uploads` 행을 다시 읽음) → 받은 업무 → 콘텐츠 캘린더. 값 매핑은 플랜 §5 그대로(`src/lib/youtubeInboxContent.ts`, 시험 `tests/youtube-inbox.test.mjs` 2개, package.json 시험 목록에 추가). 공용 사본 `src/lib/workInbox.ts`. 시험 35·tsc·로컬 빌드 통과. 버전은 올리지 않음 — 다음 배포 때 함께(이 폴더 규칙).

> **📨 [음악 담당께 · 2026-11-12 업무 워크스페이스 담당(workspace, `claude-win-20261025-workspace`) 요청] 유튜브 발행 기록을 워크스페이스 「📅 콘텐츠 캘린더」로 보내는 칸 확인**
> - 무엇: 워크스페이스 U10(발행 기록 모으기)에서 유튜브만 빠져 있습니다. 블로그·인스타·쓰레드처럼 결과 화면에 「📨 업무 워크스페이스로 보내기」 버튼을 달려면, **유튜브에 올린 한 건의 기록이 어느 표·어느 칸에 있는지** 정해 주셔야 합니다(플랜 `ai-work-workspace/docs/PLAN_20261106_U10_CONTENT_CALENDAR.md` §2·§3-3).
> - 필요한 값: 제목 · 상태(초안/예약/발행됨/실패) · 예약 시각 · 발행 시각 · 영상 주소(`https://youtu.be/…`) · 회원 `user_id`.
> - 확인한 결과: 올린 기록을 DB에 남기지 않음 — `src/components/video/YoutubeUploadCard.tsx`의 화면 목록(`done`)에만 있어 새로고침하면 사라짐. 그래서 이번 연동에서는 뺌(기록 저장이 생기면 다시 검토).
> - **✅ 음악 담당 처리(2026-11-13, v1.39 배포)**: 기록 표 `playlist_youtube_uploads` 생김 — 칸 `title`·`privacy`·`publish_at`(예약 시각)·`uploaded_at`·`url`·`user_id`(회원 본인). 상태는 `publish_at > now()`면 「예약」, 아니면 「발행됨」, 발행일은 `publish_at ?? uploaded_at`(플랜 `docs/PLAN_20261113_YOUTUBE_UPLOAD_RECORDS.md` 5절). 「실패」는 저장하지 않음. 이제 workspace 세션이 「📨 업무 워크스페이스로 보내기」를 붙일 수 있습니다(이 폴더는 지금 작업 중 아님).
> - 진행: 저장 위치는 workspace 세션이 코드로 직접 확인함(2026-11-12) — 담당께서 답하실 것은 없고, **이 폴더를 작업 중이면 workspace 세션에 알려만 주세요**(겹치지 않게 시점을 맞춤). 구현은 주인님 확인 뒤 workspace 세션이 하고, 배포는 이 폴더의 다음 배포 때 함께 나갑니다.

> **🗓️ 보관 규칙 「발행 1년 · 생성만 30일」 적용 요청 — 음악 담당께 (2026-11-11, 세션 `claude-win-rea`, 주인님 지시)**: **정리 코드 자체가 없음**(`playlist_projects` 무기한) → 30일 정리 신설 + 유튜브 업로드 기록 저장 후 업로드 1년. 관리자·시험 계정(`retention_exempt`) 열외 유지. 다음에 이 프로그램을 손댈 때 적용하고, 끝나면 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8 「모든 발행형 프로그램 공통」 줄 비고에 「적용: playlist-channel-studio vX.YY(날짜)」를 적어 주세요. 전체 표·공통 주의: `docs/HANDOFF_20261111_RETENTION_PUBLISH_1Y.md`
> **❌ 위 「발행 1년」 요청 취소 (2026-11-11 주인님 최종 결정, 세션 `claude-win-rea`)**: 일반 회원은 **발행 여부와 상관없이 30일**, 연장은 **저장 구독·등급·관리자 지정**으로 DB가 자동 처리한다(연장 회원은 `profiles.retention_exempt`가 매일 자동으로 켜짐, 기간 초과 파일은 메인 사이트 중앙 정리). **이 프로그램의 30일 정리 코드는 지금처럼 「`retention_exempt` 회원 제외」만 유지하면 되고 발행 1년 조건을 넣지 않는다.** 근거: `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §0 ⚠️ 최종 개정, `docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md`.
> **🗓️ 결정 반영(2026-11-11 주인님)**: **영상·음악 파일은 유튜브 등에 업로드해도 30일 뒤 지운다**(「데이터 용량의 크기상 오래보관 못해」, 관리자·시험 계정 열외 그대로). 위 요청 중 「영상·음원 파일 1년」 부분은 취소 — 1년은 대본·제목·업로드 기록 같은 글·기록 항목에만 적용. 상세: `docs/HANDOFF_20261111_RETENTION_PUBLISH_1Y.md` §3 영상·음악.

> **📥 「내 자료함」에서 가져다 쓰기 요청 — 영상 담당께 (2026-11-11, 세션 `claude-win-rea`, 주인님 지시 「다른 프로그램이 자료함에서 바로 가져다 쓰는 공용 컴포넌트를 만들고, 담당께 요청」)**: 공용 컴포넌트 `member-assets-client`(기준 메인 사이트 `lib/library/memberAssets.ts`)를 만들었습니다. 지금 음악 3종을 `amsTracks.ts`·`sunoTracks.ts`·`fmsTracks.ts`로 따로 읽고 썸네일은 `thumbnailPicks.ts`로 읽는데, `listMemberAssets({ kind: "audio" })`·`({ kind: "image" })` 하나로 합칠 수 있습니다(가사 시간처럼 원본 고유 정보가 필요한 곳은 기존 코드 유지). 사용 순서·주의: `docs/MEMBER_LIBRARY.md` §2~§3(사본 붙이기 → 서버 API `listMemberAssets` → 화면 「내 자료함에서 가져오기」에서 `sourceRef` 저장 → 다시 열 때 `signMemberAssetByRef`). 붙일 때 `scripts/check-shared-modules.mjs`의 `member-assets-client` `copies`와 `docs/SHARED_MODULES.md`에 사본 경로를 추가하고, 버전·배포는 이 프로그램 규칙대로(작은 수정은 모아서 배포). 필수 아님 — 다음에 이 프로그램을 손댈 때 검토해 주세요.

> **규칙 준수**: 모든 CLI는 작업 중 발견한 오류·기능·성능·편의성·디자인 개선사항을 이 문서에 즉시 기록합니다.
> 작업 종료·중단·이관 시 `docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`를 남기고 상호 연결합니다.

---

## 1. 개선 항목 총괄 현황

| ID | 구분 | 개선 항목 요약 | 우선순위 | 상태 | 최초 발견일 / CLI | 관련 파일 |
|---|---|---|---|---|---|---|
| IMP-PLS-001 | 디자인/사용성 | 텍스트 줄글형 `/guide`를 사이버 네온 다크 콘솔 스타일 비주얼 가이드북으로 전면 개편 | P1 (필수) | **진행 중 (v1.08 반영)** | 2026-10-16 (agy) | `src/app/(dashboard)/guide/page.tsx` |
| IMP-PLS-002 | UI/UX | 사이드바 유틸리티 `📖 연동 & 사용 매뉴얼` 표준화 및 계정 블록 12px 밀착 정렬 | P2 (높음) | **진행 중 (v1.08 반영)** | 2026-10-16 (agy) | `src/components/layout/Sidebar.tsx` |
| IMP-PLS-003 | 기능/편의성 | 생성된 썸네일과 트랙리스트 타임라인을 원클릭으로 텍스트 파일(.txt) 일괄 내보내기 | P2 (높음) | 제안/대기 | 2026-10-16 (agy) | `src/components/studio/` |
| IMP-PLS-004 | 기능 | Suno AI 프롬프트 생성 시 Suno v3.5 vs v4.0 vs v5.0 엔진별 최적화 프리셋 토글 지원 | P2 (높음) | 제안/대기 | 2026-10-16 (agy) | `src/lib/playlist/prompts.ts` |
| IMP-PLS-006 | 기능/품질 | MP4 내보내기의 스펙트럼이 실제 소리가 아니라 sin/cos로 만든 가짜 값(`dummyFreq`) — 미리보기(실제 분석)와 결과가 다름. 디코딩한 소리에서 프레임마다 FFT로 계산(가사영상 `lyric-video-studio/src/lib/render/spectrum.ts` 방식) 권장 | P2 (높음) | **완료 (v1.18)** — 브라우저 분석기와 같은 계산(`audio-spectrum.ts`) + 저음 효과·밝기·필터도 결과에 반영 | 2026-10-21 (Claude Code) | `src/lib/render/video-exporter.ts`·`audio-spectrum.ts` |
| IMP-PLS-011 | 기능/연계 | 커버 배경 「앨범 커버」 스타일(제목·채널명) | P3 | **완료 (v1.22)** | 2026-10-21 (Claude Code) | `SunoImportPanel.tsx` |
| IMP-PLS-012 | 연계 | 완성 MP4 유튜브 바로 올리기(공용 유튜브 연결·챕터 설명) | P2 | **완료 (v1.22)**, 실제 업로드 확인(관리자 채널 비공개 1편, https://youtu.be/mPwlsDllUgk) | 2026-10-21 (Claude Code) | `YoutubeUploadCard.tsx`·`/api/youtube/*` |
| IMP-PLS-014 | 연계 | 배경(앨범 커버) 그림 → 유튜브 썸네일 1280×720 내려받기·업로드 때 자동 지정 | P2 | **완료 (v1.23)**, 관리자 채널 비공개 시험 영상에 실제 지정 200 ok | 2026-10-21 (Claude Code) | `YoutubeUploadCard.tsx`·`/api/youtube/thumbnail`·`lib/youtube/thumbnail.ts` |
| IMP-PLS-013 | 기능 | 유튜브 채널이 여러 개 연결된 회원은 올릴 채널을 고를 수 없음(기본 표시가 2개면 최근 갱신 채널). 카드에 채널 선택 | P3 | **완료 (v1.24)**, 관리자 2채널 선택·전환 확인 | 2026-10-21 (Claude Code) | `youtube/account.ts`·`YoutubeUploadCard.tsx`(공용 `memberIntegrations` 선택 인자 필요 여부 검토) |
| IMP-PLS-009 | 기능/연계 | 음악(SUNO) 자동화 곡 여러 개 + Suno 시간 가사 가져오기 | P2 | **완료 (v1.19)** | 2026-10-21 (Claude Code) | `SunoImportPanel.tsx`·`sunoTracks.ts`·`/api/suno/*` |
| IMP-PLS-010 | 편의성 | Suno 곡 패널에서 곡 커버를 배경 후보로 바로 쓰기(곡 하나짜리 플레이리스트·첫 곡 커버) | P3 | **완료 (v1.20)** — 흐린 확대 커버 + 가운데 원본 1920×1080, 자동·곡별 버튼 | 2026-10-21 (Claude Code) | `SunoImportPanel.tsx`·`MediaCenter.tsx` |
| IMP-PLS-008 | 기능 | MP4 결과에 GIF 스티커가 빠짐(미리보기에만 있음). 움직이는 GIF는 프레임 분해(ImageDecoder)가 필요해 별도 작업 | P3 | **완료 (v1.21)** — ImageDecoder로 장면 분해, 미리보기와 같은 배치 | 2026-10-21 (Claude Code) | `video-exporter.ts`·`ExportStudio.tsx` |
| IMP-PLS-007 | 기능 | 영상 만들기 곡별 가사 층 + 세로 9:16 | P2 | **완료 (v1.17)** | 2026-10-21 (Claude Code) | `lyrics-layer.ts`·`MediaCenter.tsx`·`EditorStudio.tsx`·`ExportStudio.tsx`·`video-exporter.ts` |
| IMP-PLS-005 | 편의성 | 썸네일 Canvas 편집기에서 자주 쓰는 한글 감성 폰트 즐겨찾기(Pin) 기능 | P3 (보통) | 제안/대기 | 2026-10-16 (agy) | `src/components/studio/ThumbnailTab.tsx` |

---

## 2. 상세 개선 내역

### IMP-PLS-001: 사이버 네온 다크 콘솔 스타일 비주얼 가이드북(`/guide`) 전면 개편
- **발견 근거**:
  - 기존 가이드북이 42줄짜리 단순 흰색 텍스트 상자로만 작성되어 있어, 플레이리스트 기획부터 Suno 작곡 프롬프트 복사, 캔버스 썸네일 합성까지의 전체 흐름을 시각적으로 학습하기 어려움.
- **영향 및 기대효과**:
  - 5단계 시각적 파이프라인 인포그래픽, 23종 장르 치트시트, 떡상 노하우 팁, FAQ 4종을 통해 초보자도 5분 만에 첫 플레이리스트 영상을 완벽 기획할 수 있도록 지원.

### IMP-PLS-002: 사이드바 UI 표준화 및 가이드북 접근성 강화
- **발견 근거**:
  - 사이드바 유틸리티 영역에 매뉴얼 링크 명칭이 `사용 안내`로 되어 있어 플랫폼 공통 표준(`📖 연동 & 사용 매뉴얼`)과 어긋남.
- **구현 계획**:
  - `📖 연동 & 사용 매뉴얼`을 유틸리티 상단에 배치하고 계정 블록 마진을 12px로 표준 밀착.

---

## 3. 이관 및 인수인계 연결
- 2026-10-16 인수인계서: [`docs/IMPROVEMENT_HANDOFF_20261016.md`](IMPROVEMENT_HANDOFF_20261016.md)
- 개발 플랜: [`docs/PLAN_20261016_DESIGN_RENEWAL.md`](PLAN_20261016_DESIGN_RENEWAL.md)

## 2026-11-13 남은 일 — 30일 정리 신설(음악 담당)
- [x] `playlist_projects`·`playlist_youtube_uploads` 30일 정리(관리자·시험 계정 `retention_exempt` 제외). 주인님 「정리는 다음 작업으로」(2026-11-13). → **v1.41 배포(2026-11-13)**
- [ ] **(발견 2026-11-13, 미구현)** 「📋 내가 올린 영상」 목록은 올리기 카드 안에 있고 카드는 곡이 1개 이상일 때만 보인다(`ExportStudio.tsx` `tracks.length > 0 &&`). 그래서 새로 고친 뒤 곡을 다시 넣기 전에는 지난 기록·「📨 업무 워크스페이스로」 버튼을 볼 수 없다. 제안: 기록 목록을 카드 밖 별도 컴포넌트로 빼서 곡이 없어도 ③ 화면(또는 「내 프로젝트」)에 보이게. 작은 수정 — 다음 배포 때 함께.

## 2026-10-22 Claude Code(윈도우) — 대기: 음악(SUNO) 리믹스 결과 받기 (다음 빌드 때 함께)
- [ ] `?remix=<리믹스 변주 id>`로 음악(SUNO) 리믹스 결과(`music_track_remix_variants`, 회원 본인 것만)를 읽기. **주인님 지시: 따로 배포하지 않고, 이 프로그램을 다음에 다른 작업으로 빌드할 때 함께 넣고 시험한다.** 상세 플랜·시험용 리믹스 번호: [`music/docs/PLAN_20261022_REMIX_SHORTCUTS.md`](../../music/docs/PLAN_20261022_REMIX_SHORTCUTS.md). 음악(SUNO) 리믹스 카드 링크는 두 프로그램 배포 뒤에 켠다.
- **배포됨 v1.27(2026-10-23, 커밋 `22c6cda35`)** — 아래는 당시 대기 기록: 좌측 메뉴 계정·로그아웃이 화면 맨 아래로 밀리던 것을 마지막 메뉴 바로 아래(8~16px)로 — `docs/SIDEBAR_LAYOUT_STANDARD.md` 「계정 이메일·로그아웃 위치」(메뉴 `flex-1`/틀 `justify-between`/계정 `mt-auto` 제거). 클래스만 바꿈, tsc 통과. **다음 배포 때 함께 내보내고(버전 +0.01) 데스크톱·휴대폰 폭에서 계정 위치 확인 후 이 줄과 `docs/PENDING_DEPLOYS.md` 줄 지우기.** (Claude Code 윈도우, YOUTUBE Shots v1.38과 같은 수정)

## 2026-10-23 ✅ 배포됨(Next.js 보안 업데이트 배포에 함께 나감, 17:4x `check-app-urls --live` 반영 확인) — 메인 사이트 링크 주소 정정 (Claude Code 윈도우, 세션 `claude-win-20261023-mainsite-url`)
- 메인 사이트 주소 상수가 연결 안 되는 `https://aimaster.buylife.xyz`였다(권한 없음·정지·핸드폰 안내 이동, 회원가입·비밀번호 찾기·약관 링크가 접속 오류). → `https://www.buylife.xyz`, `/signup`→`/register`, `/legal/privacy`·`/legal/terms`→`/privacy`·`/terms`. 커밋 `486fd5fd3`(prompt-template-studio는 `9c170faf5`). tsc 0.
- 운영 임시 조치: 메인 Vercel 프로젝트에 `aimaster.buylife.xyz`를 추가해 `www.buylife.xyz`로 308 이동(경로 유지) — 회원가입 `/signup`만 다음 배포 전까지 404.
- 다음 배포 때: 버전 +0.01, 로그인 화면의 회원가입·비밀번호 찾기 링크와 권한 없는 계정 이동 확인.

## 2026-10-24 (Claude Code 윈도우 `claude-win-dotori`) — 📋 제안·플랜: Spectrum Studio PRO 3.0.0 참고 묶음 P-1~P-6 (음악 담당 이어받기)
- 같은 원본 웹 버전은 2026-10-13 `yt-playlist-studio`로 가져와 2026-10-20 이 프로그램에 병합됨. 3.0.0 데스크톱판에서 새로 생긴 기능만 코드(`src/data/presets.ts`)로 대조해 추림: P-1 곡 제목 자동 표시 · P-2 인코딩 안정화(하드웨어 가속 시험·품질 프로파일) · P-3 배경 여러 장 전환 · P-4 AI 없는 합성 배경 · P-5 내 설정 저장·장르 프리셋 · P-6 효과 확장.
- 상태: 플랜 초안만, **범위·순서·비용 승인 전**. 권리 재확인(2026-10-13 「번들 수식 100% 추출 이식」 기록) 주인님 결정 대기. [인수인계](IMPROVEMENT_HANDOFF_20261024_SPECTRUM.md) · [플랜](PLAN_20261024_SPECTRUM_P1_P6.md)
