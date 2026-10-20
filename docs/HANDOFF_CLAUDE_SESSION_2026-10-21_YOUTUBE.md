# Claude Code(윈도우) 세션 인수인계 — 2026-10-20~21 인스타·유튜브 병합, 옛 앱 정리, 엔진 공유

> 주인님 지시(2026-10-21): 「토큰이 다 되어 다른 계정으로 이어서 작업할 것 — 지금까지 작업 내용과 인수인계 문서를 만들어 달라」.
> 모든 작업 대상은 **운영 ① AIMaster, DB ref `esgxyikcnnvmlhygjkth`**. 이어받는 CLI는 루트 `CLAUDE.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 맨 위, `docs/ERROR_LESSONS.md`를 먼저 읽는다.
> 앞 구간(인스타 병합) 상세: [`HANDOFF_CLAUDE_SESSION_2026-10-20_INSTA.md`](HANDOFF_CLAUDE_SESSION_2026-10-20_INSTA.md). 유튜브 분석·결과: [`analysis-youtube-consolidation-20261020/REPORT.md`](analysis-youtube-consolidation-20261020/REPORT.md) §6.

## 0. 지금 멈춘 곳 (가장 먼저 읽기)
**진행 중: 엔진 공유 2번 — YOUTUBE Shots에 「브라우저에서 만들기(무료)」 (Shots v1.24 예정, 원스톱 v1.20 예정)**
- 플랜(주인님 승인): [`shots/docs/PLAN_20261021_BROWSER_RENDER.md`](../shots/docs/PLAN_20261021_BROWSER_RENDER.md). 주인님 결정: **완성 MP4를 저장소 새 버킷 `shots-videos`에 저장(추천안 선택, 30일 자동 삭제)** — 버킷 생성 DB 변경 승인됨.
- 왜: Shots 영상 6개(회원 2명) 중 완성 1개, JSON2Video 키 등록 회원 1명 vs OpenAI 키 27명. JSON2Video가 합성+ElevenLabs 음성+자막을 다 맡아 대부분 회원이 합성 단계에서 막힘.
- **끝낸 것**: 공용 인코더 기준 파일 `shorts-onestop-studio/src/lib/render/mp4Encoder.ts` 작성(`mixVoiceAndBgm`·`encodeMp4`·`assertWebCodecs`, 원스톱 `export.ts`에서 대본과 무관한 부분을 옮긴 것). tsc 통과. **아직 어디에도 연결 안 함·공용 점검 미등록·배포 안 함**(운영 영향 없음).
- **진행(2026-10-21 부계정 `rainbowi77777` 세션)**: 1~3번 완료 — 커밋 `4efd603a`(export.ts 공용 인코더 사용·Shots 사본·`mp4-muxer`) · `0cd3ef3a`(원스톱 v1.20 배포 Ready·DB v1.20, 다시 만들기 58.20초·1080×1920·16.8MB 기준과 같음). **다음은 4번부터.**
- **다음 순서**
  1. 원스톱 `src/lib/render/export.ts`를 `mp4Encoder.ts` 사용으로 바꾸기: `mixAudio` → `mixVoiceAndBgm({ total, voices, bgm: bgm && urls[bgm.path] ? { src: urls[bgm.path], volume: bgm.volume } : null, onStatus })`, 프레임 루프 → `encodeMp4({ width: W, height: H, fps: FPS, total, audio, pctFrom: 5, drawFrame: async (ctx, t) => { /* 기존 영상 sync + renderFrame */ } })`. `localVideos`·`syncVideo`·`seekVideo`·`touched` 정리(finally)는 export.ts에 남긴다. 진행률·문구가 예전과 같은지 확인.
  2. `scripts/check-shared-modules.mjs`에 `browser-mp4-encoder`(기준 `shorts-onestop-studio/src/lib/render/mp4Encoder.ts`, 사본 `shots/src/lib/render/mp4Encoder.ts`) 등록 → `--sync`. Shots `package.json`에 `mp4-muxer`(^5.2.2) 추가.
  3. 원스톱 MP4 다시 만들기 결과 같음 확인(관리자 대본 「2026 다이소 꿀템 TOP 4」, 58.2초·16.8MB가 기준) → v1.20 배포·DB 버전.
  4. Shots: `/api/render/tts`(본인 OpenAI 키 `gpt-4o-mini-tts`, `checkProgramAccessApi`·같은 출처·`dynamic`/`fetchCache` 두 줄, 오디오 바이트 바로 응답 — 저장 없음). 장면 데이터는 `shorts_video_segments`(segment_index·narration·image_url, 이미지 버킷 `shorts-images` 공개), 배경음악은 `shorts_videos.bgm_selected_track_id` → `shorts_bgm_tracks.audio_url`(버킷 `shots-bgm`, 외부 주소면 CORS 확인 — 안 되면 서버 전달 라우트).
  5. Shots 그리기 함수: 장면 이미지 9:16 cover + 느린 확대, 자막은 JSON2Video 설정과 같은 모양(Noto Sans KR 굵게, 노랑 `#FFD200`, 검은 테두리 6, 화면 가운데, 2~3어절씩 음성 길이에 비례해 나눔). 장면 길이 = 음성 길이 + 여백(최소 3초).
  6. 렌더 화면 `shots/src/components/candidates/RenderSection.tsx`에 방식 선택(① 브라우저 무료 기본 / ② JSON2Video 지금 그대로) + 진행 막대·멈추기.
  7. 버킷 `shots-videos` 마이그레이션(공개 읽기, 경로 `user_id/…`, 본인만 올리기·지우기 RLS, 100MB, `video/mp4`) → 브라우저가 서명된 업로드 주소로 직접 업로드(Vercel 4.5MB 한도) → `rendered_video_url`·`render_status=ready` 저장 → 기존 유튜브 업로드·인스타 게시가 그대로 동작하는지 확인.
  8. 30일 정리: 같은 영상 다시 만들면 이전 파일 삭제 + 매일 정리(기존 운영 예약 호출에 1개 추가 — 운영 정리 작업은 회원 예약 규칙 대상 아님).
  9. 매뉴얼·설정 안내, Shots v1.24(+ 미배포 공용 사본 `youtube-upload-client` 함께 나감), 상세 소개, 문서(두 프로그램 AGENTS·IMPROVEMENTS, SHARED_MODULES·SHARED_FEATURE_MAP, 역량 지도, 보고서 §6, HANDOFF), `docs/ACTIVE_WORK.md` 줄 삭제.
- 시험 비용: 관리자 계정 Shots 대본으로 TTS 6회(약 10원). 시험은 크롬 메인 프로필, 관리자 `buylifemall@gmail.com`(유튜브 채널 「공동구매 아카데미」 연결됨, `youtube.force-ssl` 권한).

## 1. 이번 세션에 끝낸 일
| 묶음 | 결과 | 커밋·버전 |
|---|---|---|
| 인스타 병합 A·B, 텔레그램 수정, 공지 띠 | 앞 구간 문서 참고 | `HANDOFF_CLAUDE_SESSION_2026-10-20_INSTA.md` |
| 유튜브 병합 C | CONSULTANT → 「YOUTUBE 트렌드 분석」 `youtube-viral-studio` v1.21 | 보고서 §6 |
| 유튜브 병합 D | 썸네일 프로 → 「AI 썸네일·SEO 자동화」 `thumbnail-master` v1.09 (`/seo`) | 보고서 §6 |
| 유튜브 병합 E | Youtube Playlist → 「YOUTUBE 플레이리스트 자동화」 `playlist-channel-studio` v1.16 (`/video`) | 보고서 §6 |
| 옛 앱 5개 코드 정리 | 백업 후 삭제: 폴더 `D:\Antigravity\AIMaster_backup\retired-programs\`(색인 README) · git 태그 `backup/old-apps-20261021` · 압축 `D:\Antigravity\AIMaster_backup\old-apps-20261021.zip`. 저장소엔 옛 주소 전달·안내 화면만 | `8b1cee2e` 외 |
| 엔진 공유 1번 | 쇼츠 원스톱 v1.19 「⑥ 유튜브에 올리기」 — 공용 `youtube-upload-client`(기준 `shots/src/lib/youtube/client.ts` + `createYoutubeResumableSession`), 공용 연결 계정 재사용, 영상은 브라우저→유튜브 직접. **관리자 채널 비공개 실업로드 성공**(영상 `hdPuSpoz1eY`) | `91d6853d` `049ba426` `b5db1dfc` `11f20db6` |

결과: 유튜브 프로그램 10개 → 7개. 사용 종료 프로그램은 앞으로도 「백업 폴더 + 태그 먼저, 그다음 삭제」(메모리·`retired-programs/README.md`).

## 2. 주인님 협조가 필요한 남은 일
- 시험 영상 삭제: 유튜브 스튜디오 → 콘텐츠 → 「[업로드 시험] 2026 다이소 꿀템 TOP 4」 https://studio.youtube.com/video/hdPuSpoz1eY/edit
- INSTA 댓글·DM 실제 DM 시험, 플레이리스트 「영상 만들기」 MP4 실제 렌더 시험, 관리자 썸네일 시험 프로젝트 1개 삭제(앞 구간 문서).

## 3. 다음 배포 때 함께 나갈 것(급하지 않은 변경)
- `shots`: 공용 기준 `youtube-upload-client` 등록·함수 추가(동작 같음) — 엔진 공유 2번 배포 때 함께.
- 텔레그램 `allowed_updates` 수정 5개: booking-reminder · crm-google-form · longtail-keyword-expander · real_estate_sales · trending-product-finder.
- 공지 띠: 웹툰 형식 보완, 나머지 웹 프로그램(`docs/SHARED_MODULES.md` 미배포 표).

## 4. 제안(미착수)
- 원스톱: 발행 계획 시각을 ⑥ 예약 공개에 자동 채우기, 일괄 제작 뒤 유튜브 예약 올리기, 업로드 이어 올리기(`shorts-onestop-studio/docs/IMPROVEMENTS.md`).
- 플레이리스트 「영상 만들기」에 `youtube-upload-client` 붙이기(같은 브라우저 MP4).
- 텔레그램 연동 공용 모듈화(`docs/SHARED_FEATURE_MAP.md` §10 후보).

## 5. 작업 규칙 메모(이번 세션에서 확인)
- 배포: `npx vercel deploy --prod --yes --scope buylife`, 주소는 `grep -o "https://[a-z0-9_-]*-buylife.vercel.app"`로 넓게 잡고 빈 값이면 `vercel inspect`를 부르지 않는다(프로젝트 이름이 길면 접두어가 줄어듦).
- 공용 문서에 다른 CLI 미커밋 내용이 있으면 내 줄만 커밋(HEAD+내 항목 `git hash-object -w --stdin` + `git update-index --cacheinfo`). `docs/ACTIVE_WORK.md`·`docs/PROGRAM_IDEA_BACKLOG.md`는 지금 다른 CLI 미커밋 변경이 있음.
- 운영 DB 쓰기는 서비스 키 REST(루트 `.env.local`, 값 출력 금지)로 했고 적용 SQL은 각 프로그램 `supabase/migrations/`에 남김.
- 브라우저 영상 업로드 교훈: 재개 가능 업로드 세션을 서버가 만들 때 `Origin`을 실으면 브라우저 직접 PUT 허용(`docs/ERROR_LESSONS.md` 2026-10-21).

https://shots.buylife.xyz
https://shorts-onestop-studio.buylife.xyz/render
