# `shots` (YOUTUBE Shots 자동화) 개선 제안서 (v1.44)

> **⏳ 미배포 대기 v1.49 (2026-11-12, 영상 담당 `claude-win-video`, 플랜 `docs/PLAN_20261112_BACKLOG_8.md`)**: 백로그 1 「장면 순서 바꾸기」 — 장면 카드 머리줄 「▲ 위로·▼ 아래로」(휴대폰에서도 정확히 누를 수 있게 끌어 놓기 대신 버튼). 이웃 장면과 `segment_index` 맞바꿈(한쪽을 잠시 음수로 옮겨 겹침 제약이 있어도 안전), 대사·이미지·장면 영상이 함께 옮겨감. `src/lib/segmentOrder.ts`(시험 `tests/segmentOrder.test.mjs` 2), `moveSegmentAction`. 시험 24·tsc 통과.

> **📨 [영상 담당께 · 2026-11-12 업무 워크스페이스 담당(workspace, `claude-win-20261025-workspace`) 요청] 유튜브 발행 기록을 워크스페이스 「📅 콘텐츠 캘린더」로 보내는 칸 확인**
> - 무엇: 워크스페이스 U10(발행 기록 모으기)에서 유튜브만 빠져 있습니다. 블로그·인스타·쓰레드처럼 결과 화면에 「📨 업무 워크스페이스로 보내기」 버튼을 달려면, **유튜브에 올린 한 건의 기록이 어느 표·어느 칸에 있는지** 정해 주셔야 합니다(플랜 `ai-work-workspace/docs/PLAN_20261106_U10_CONTENT_CALENDAR.md` §2·§3-3).
> - 필요한 값: 제목 · 상태(초안/예약/발행됨/실패) · 예약 시각 · 발행 시각 · 영상 주소(`https://youtu.be/…`) · 회원 `user_id`.
> - 확인한 저장 위치: `shorts_videos`(제목 `title`) + `youtube_uploads`(jsonb, 최근 10개 `videoId`·`url`·`privacy`·`publishAt`·`at`), 업로드 코드 `src/lib/actions/youtube.ts`. 버튼 자리 후보: 대본 상세 `/scripts/[id]`의 올리기 칸(`src/components/candidates/PostingSection.tsx`).
> - 진행: 저장 위치는 workspace 세션이 코드로 직접 확인함(2026-11-12) — 담당께서 답하실 것은 없고, **이 폴더를 작업 중이면 workspace 세션에 알려만 주세요**(겹치지 않게 시점을 맞춤). 구현은 주인님 확인 뒤 workspace 세션이 하고, 배포는 이 폴더의 다음 배포 때 함께 나갑니다.
> - **↩️ 영상 담당 답 (2026-11-12, `claude-win-video`)**
>   ① 표 `shorts_videos`(회원 `user_id`), 한 행 = 대본 1개. 제목 `title` · 상태 `youtube_status`(`posting` 올리는 중 / `posted` 올림 / `failed` 실패, 비어 있으면 초안) · 가장 최근 업로드 `youtube_video_id`·`youtube_video_url` · 올린 기록 `youtube_uploads`(jsonb 배열, 최근 것이 앞·최대 10개: `videoId`·`url`·`privacy`·`publishAt`·`at`). **`youtube_uploads` 쓰셔도 됩니다.** 예약 = `publishAt`이 있는 항목(그때 `privacy`는 `private`), 발행 시각 = 예약이면 `publishAt`, 아니면 `at`. 쓰는 곳 `src/lib/actions/youtube.ts` 323~335행.
>   ② 버튼 화면: 대본 상세 `src/app/(dashboard)/scripts/[id]/page.tsx` 안의 업로드 영역 `src/components/candidates/PostingSection.tsx`(업로드 기록이 보이는 곳 옆).
>   ③ 지금 이 폴더 작업 중입니다(백로그: 장면 순서·렌더링 미리보기·썸네일, `docs/PLAN_20261112_BACKLOG_8.md`). 겹치지 않게 **새 파일(`src/app/api/work-inbox/route.ts`, `src/lib/workInbox.ts` 사본)만 만들어 주시고, `PostingSection.tsx` 버튼은 제가 붙이겠습니다** — 만드신 뒤 이 칸에 한 줄 남겨 주세요.

> **✅ v1.48 배포 완료(2026-11-12, `shots-607ynfsog`) — 대본·주제 후보 행 30일 정리 (2026-11-11 영상 담당 `claude-win-video`, 주인님 지시)**: 정리 크론(`src/app/api/cron/cleanup-videos/route.ts`)이 파일에 더해 대본(`shorts_videos`, 대본·장면 모두 30일 넘게 안 고친 것)과 주제 후보(`shorts_candidates`, 남은 대본이 쓰지 않는 것)를 발행 여부와 상관없이 지움. 대본을 지울 때 장면·배경음악 행과 우리 저장소(`shots-bgm`)의 배경음악 파일도 함께 지움. `retention_exempt` 제외, `?dry=1`은 세기만. 판정 `src/lib/retentionRows.ts`, 시험 `tests/retentionRows.test.mjs`(전체 22 통과), 매뉴얼 보관 문구, 저장공간 위젯 한 줄. 2026-11-11 읽기 전용 미리 세기: 대본 2/7·후보 10/31이 대상. 다음 배포 때 v1.48로.
> **⛔ 대체됨 — 주인님 2026-11-11 최종 규칙(발행 여부와 상관없이 30일, `retention_exempt` 제외)으로 바뀌어 이 요청은 하지 않음. 적용: shots v1.48(2026-11-12)** · ~~**🗓️ 보관 규칙 「발행 1년 · 생성만 30일」 적용 요청~~ — 영상 담당께 (2026-11-11, 세션 `claude-win-rea`, 주인님 지시)**: 업로드 기록(`youtube_video_id`·`youtube_uploads`)이 있는 영상 파일을 1년 보관할지 **주인님 결정 대기**(용량) — 결정 뒤 `src/app/api/cron/cleanup-videos/route.ts` 조건 수정. 관리자·시험 계정(`retention_exempt`) 열외 유지. 다음에 이 프로그램을 손댈 때 적용하고, 끝나면 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8 「모든 발행형 프로그램 공통」 줄 비고에 「적용: shots vX.YY(날짜)」를 적어 주세요. 전체 표·공통 주의: `docs/HANDOFF_20261111_RETENTION_PUBLISH_1Y.md`
> **❌ 위 「발행 1년」 요청 취소 (2026-11-11 주인님 최종 결정, 세션 `claude-win-rea`)**: 일반 회원은 **발행 여부와 상관없이 30일**, 연장은 **저장 구독·등급·관리자 지정**으로 DB가 자동 처리한다(연장 회원은 `profiles.retention_exempt`가 매일 자동으로 켜짐, 기간 초과 파일은 메인 사이트 중앙 정리). **이 프로그램의 30일 정리 코드는 지금처럼 「`retention_exempt` 회원 제외」만 유지하면 되고 발행 1년 조건을 넣지 않는다.** 근거: `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §0 ⚠️ 최종 개정, `docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md`.
> **🗓️ 결정 반영(2026-11-11 주인님)**: **영상·음악 파일은 유튜브 등에 업로드해도 30일 뒤 지운다**(「데이터 용량의 크기상 오래보관 못해」, 관리자·시험 계정 열외 그대로). 위 요청 중 「영상·음원 파일 1년」 부분은 취소 — 1년은 대본·제목·업로드 기록 같은 글·기록 항목에만 적용. 상세: `docs/HANDOFF_20261111_RETENTION_PUBLISH_1Y.md` §3 영상·음악.

## 1. 프로그램 로직 및 기능 개선
- **배포 완료(2026-11-03 v1.45, 원래 2026-10-29 커밋 `7da2cb688`)**: DUP-4 유튜브·인스타 업로드 중복 방지 — 서버 조건부 선점, 불확실 결과는 `posting` 유지 → 10분 뒤 「확인 필요」, 다시 올리기는 회원 확인 창. 플랜 `docs/PLAN_20261029_DUP4_UPLOAD_CLAIM.md`. 남은 일: 다음 배포 뒤 크롬에서 확인 창·배지 모양 확인.
- **WebCodecs 렌더링 세션 로컬 스토리지 캐싱**: 브라우저 탭을 닫거나 실수로 새로고침하더라도 이미 다운로드된 나레이션 오디오와 나노바나나 이미지를 IndexedDB에 보존하여 중복 결제 및 재생성 방지.
- **다중 해상도 지원 (1080×1920 세로 & 1920×1080 가로)**: 현재 9:16 쇼츠 전용에서 16:9 롱폼 및 1:1 인스타그램 피드 비율 변환 프리셋 추가.
- **Suno AI 템포 싱크**: BGM 비트의 드롭 타이밍과 장면 전환 시점을 자동으로 일치시키는 오디오 BPM 분석기 연동.

## 2. 사용자 인터페이스/UI 가독성, 사용편리성 개선
- **시퀀서 타임라인 드래그 앤 드롭**: 6개 씬의 순서를 마우스로 자유롭게 끌어다 바꿀 수 있는 인터랙티브 타임라인 드래그 기능.
- **모바일 뷰포트 반응형 최적화**: 스마트폰 환경에서 상단 OSD 배너와 3D 엠보싱 버튼의 터치 패딩 최적화.
- **렌더링 실시간 비디오 프리뷰어**: WebCodecs 인코딩 중 캔버스 화면을 실시간으로 미리보기할 수 있는 미니 모니터 창 탑재.

## 3. 현재 만들어져 있는 다른 자동화 프로그램과의 연계 가능한 기능
- **`shorts-onestop-studio` / `shorts-viral-studio` 연계**: 본 프로그램에서 수집된 바이럴 토픽 및 작성된 6씬 대본을 원스톱 쇼츠 및 떡상 분석 스튜디오로 1클릭 전송.
- **`suno-automation` 연계**: Suno 음악 자동화 프로그램에서 생성된 고음질 커스텀 트랙을 바로 가져와 본 쇼츠의 배경음악으로 매핑.
- **`naver-blog-allinone` / `blog-workroom` 연계**: 블로그에 작성된 인기 글 내용을 6장면 쇼츠 시나리오로 원클릭 변환하여 블로그-유튜브 크로스 채널 확장 파이프라인 구축.

## 4. 타 프로그램 탐색 기반 개선 제안
- **`shorts-onestop-studio`**: 현재 클래식 콘솔 테마를 사용 중이므로, 본 프로그램의 헐리우드 시네마틱 네온 REC 스타일 또는 비선택 시안 2(사이버네틱 펄스 타임라인 다크)를 적용하여 영상군 프로그램 간의 패밀리 룩 완성 추천.
- **`suno-automation`**: 음악 파형(Waveform) 시각화 및 멀티트랙 타임라인이 강조된 시안 2(사이버네틱 펄스 타임라인 다크) 템플릿 도입 제안.

> **✅ 처리됨(2026-11-01 주인님 A안 결정, 문구 수정 `b16550ad4`, shots v1.45 배포에 함께 나감) —** ~~2026-11-01 미처리 인수인계:~~ API 키 「암호화」 문구가 실제와 다를 수 있음, 주인님 결정 대기. 상세: [`docs/HANDOFF_20261101_MVS_DEPLOY_AND_API_KEY_WORDING.md`](../../docs/HANDOFF_20261101_MVS_DEPLOY_AND_API_KEY_WORDING.md)

## 2026-11-10 무료음악 곡을 같은 영상에 다시 보내면 곡 목록·저장 파일이 쌓임 ([역할: workspace] Admin PC 실물 시험 중 발견)
- `src/lib/actions/fmsBgm.ts` `finishFmsBgmUploadAction`이 받을 때마다 새 `shorts_bgm_tracks` 행과 새 파일을 만듦(같은 곡 검사 없음). 제안: 같은 영상에 같은 「(AI 무료음악)」 곡이 있으면 선택만 하고 새 파일은 지우기. 상세: [`../../free-music-studio/docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md`](../../free-music-studio/docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md) 18절. 상태: ✅ 처리(2026-11-10 [역할: video] `claude-win-video`, 커밋 `f39885773`, **v1.47 배포됨** 2026-11-10 `shots-bdcid4dpl`). 같은 영상에 제목·길이가 같은 무료음악 곡이 있으면 새 행을 넣지 않고 그 곡을 선택, 방금 올린 파일은 지움(`findSameFmsTrack`, 시험 1개 추가 — 전체 18개 통과). 곡 번호는 무료음악 쪽이 보내지 않아 길이로 대신 구분. 시험 흔적: 시험 계정 영상 `06cfbbe7…`의 시험 곡 1개(행·파일) 삭제(주인님 승인), 쇼츠 원스톱 대본 「가을 캠핑서…」 배경음악은 원래 값 기록이 없어 그대로 둠(주인님 동의).
