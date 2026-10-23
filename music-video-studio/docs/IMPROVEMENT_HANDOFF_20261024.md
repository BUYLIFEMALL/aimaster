# 뮤직비디오 인수인계 2026-10-24 — C2(가사 시각 장면) 실제 곡 미작동 버그

작성: Claude Code 윈도우, 세션 `claude-win-avs-c12`(영상 작업 담당). 컴퓨터 재부팅 전에 정리했습니다.

## 상태 한눈에 보기
- 현재 배포 버전: **v1.19**(박자 맞추기, 커밋 `798ef6126`). 이 문서 이후 코드 변경은 **아직 없음**.
- 다음 작업: **v1.20 버그 수정** — 플랜을 주인님께 보여 드렸고 **승인 답을 아직 받지 못함**(재부팅 요청으로 멈춤). 다시 시작하면 먼저 승인 여부를 여쭙니다.
- 작업 중 표(`docs/ACTIVE_WORK.md`)에는 제 줄이 없습니다. 시작할 때 다시 넣습니다.

## 찾은 문제 (근거 있음)
- Lyria는 시간 가사(`[0.0:3.7] 가사`)를 돌려주고, ai-music-studio는 이것을 **`ams_generations.lyrics_out`** 칸에 저장합니다(`ai-music-studio/lib/generations.ts` 123행, `lib/providers/adapters/gemini.ts` 28행).
- 가사영상(`lyric-video-studio/src/lib/ams.ts` 38행)·플레이리스트(`playlist-channel-studio/src/lib/amsTracks.ts` 41행)는 `amsTimedLines(row.lyrics_out)`을 씁니다.
- **뮤직비디오만** `music-video-studio/src/lib/music/amsSongs.ts`가 `lyrics`(회원이 입력한 시간 없는 가사)만 읽습니다(36·55행).
- 그래서 `FinalRender.tsx` 106행 `sceneLengthsFromLyrics(project.lyrics, …)`가 실제 곡에서는 늘 null → 「고르게 나눔」으로만 동작했습니다. v1.18 검수는 가사 형식을 손으로 바꿔서 해서 드러나지 않았습니다.

## v1.20 플랜 (승인 대기)
1. `amsSongs.ts`: select에 `lyrics_out` 추가, `amsTimedLines`가 null이 아닐 때만 곡 정보에 `timedLyrics`(원문)로 넣기.
2. `types.ts`·`project.ts`: 프로젝트에 `timedLyrics` 칸 추가(저장 형식 정리 함수 포함). `SongCard.tsx`에서 곡을 가져올 때 채우고, 곡을 바꾸거나 빼면 비움. 가사 입력칸은 지금처럼 원래 가사.
3. `FinalRender.tsx`: `sceneLengthsFromLyrics(project.timedLyrics || project.lyrics, …)`.
4. `tests/music.test.mjs`: 「시간 가사는 lyrics_out에만, lyrics는 일반 가사」 경우 시험 추가.
5. 로컬 시험·`tsc`·빌드 → 배포(회원 기능 미작동 버그라 바로 배포 예외) → v1.20(코드 `src/lib/version.ts` + DB `programs.version`).
6. 메인 크롬 검수(시험 계정 `buylifemall@naver.com`): 기존 Lyria 보컬 곡을 가져와 「장면 길이 가사 시각에 맞춤」 표시와 렌더 전환 시각 확인. 시간 가사 있는 곡이 없을 때만 Lyria 3.5 곡 1개(약 $0.08) + 장면 이미지 2~3장(약 $0.12).
- 비용: 빌드 1회, (필요 시) 곡 1개·이미지 2~3장 — **승인 받은 뒤** 진행.

## 주의 (재부팅 후 꼭 확인)
- 공용 스테이징에 제 파일 4개가 옛 판으로 올라가 있음(`FinalRender.tsx`·`beat.ts`(삭제로 잡힘)·`version.ts`·`tests/music.test.mjs`). 작업 파일과 HEAD는 정상. 경로 없는 커밋이 섞이면 v1.19가 되돌려질 수 있으니, 커밋은 항상 `node scripts/commit-paths.mjs … --as claude-win-avs-c12`로 하고 `git show --stat HEAD`를 확인. 스테이징 정리(`git reset -q HEAD -- <경로>`)는 주인님 허락 뒤에만.

## 그 밖에 남은 일
- 미배포 대기: ai-image-studio·shorts-onestop-studio·shots 공용 사본 동기화(`fd1f3cb67`, 동작 불변) — 각 프로그램 다음 배포 때.
- 승인 전 후보: 뮤직비디오 장면별 카메라 움직임 → 완성본 보관, AI 영상 스튜디오 프롬프트 게시판·립싱크, 「PC 도우미 앱(로컬 ffmpeg)」 아이디어 표 등록 여부.

https://music-video-studio.buylife.xyz

## ✅ 처리 결과 (2026-10-24, 음악 담당 세션 `claude-win-20261024-music`, 주인님 「뮤직비디오 v1.20 버그 수정 진행해」)
- 위 v1.20 플랜 1~6을 그대로 진행해 배포했습니다(`music-video-studio-8hb7wv216`, 화면/DB v1.20). 상세·검수 증거는 `AGENTS.md` v1.20.
- 운영 검수: Lyria 곡에서 「가사 시각에 맞춤」 표시, 렌더 전환 15.0초(후렴 시작)로 확인. 새 곡 생성은 필요 없었습니다(기존 Lyria 곡 사용).
- 스테이징 정리: 이 버그 수정은 공용 스테이징을 쓰지 않는 `scripts/commit-paths.mjs`로 커밋해 묵은 항목과 섞이지 않았습니다. 묵은 항목 4개(`FinalRender.tsx`·`beat.ts`·`version.ts`·`tests/music.test.mjs`) 정리는 2026-10-24 주인님 「진행해」 뒤 완료했습니다(3개는 커밋 도우미가 이미 맞춰 두었고, `beat.ts`는 내용이 HEAD와 같음을 확인한 뒤 `git reset -q HEAD -- <경로>`).
- 남은 일: 위 「그 밖에 남은 일」 그대로(승인 전 후보).
