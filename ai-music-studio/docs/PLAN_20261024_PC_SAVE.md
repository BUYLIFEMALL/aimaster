# 개발 플랜 — 「⚡ 내 PC로 저장」 AI 음악 스튜디오 v1.14 · 음악(SUNO)자동화 v1.46 (2026-10-24)

작성: Claude Code 윈도우 · 음악 담당 `claude-win-20261024-music`. 주인님 승인: 로드맵 5단계 「AI 음악 스튜디오·SUNO에 내 PC로 저장(MP3·FLAC + 음량 맞춤), 빌드 2회」 선택.
로드맵: `docs/analysis-pc-renderer-20261024/ROADMAP.md` 5단계. 1단계(마스터링 v1.14)의 공용 코드를 사본으로 가져와 쓴다 — **실행기는 고치지 않는다**(영상 담당과 겹치지 않음).

## 범위
1. 공용 기준 코드: `pc-renderer-client` 사본 2곳 추가(`ai-music-studio/lib/pcRenderer.ts`·`music/lib/pcRenderer.ts`), 소리 명령 만들기 `pc-audio-command`(기준 `ai-mastering-studio/src/lib/pcAudio.ts`) 새로 등록 + 사본 2곳.
2. 곡마다 「⚡ 내 PC로 저장」 단추(`components/.../PcSaveButton.tsx`, 프로그램별 모양): 누르면 실행기 확인 → 형식(MP3 320k·AAC·FLAC·WAV24) + 「스트리밍 기준 음량 맞추기」 → 곡 파일을 브라우저가 받아 실행기로 변환 → 파일 내려받기 + 음량 전·후 표시. 확장·실행기가 없거나 옛 판이면 설치 안내, 곡 파일을 받지 못하면(만료된 Suno 임시 주소 등) 이유 안내.
   - AI 음악 스튜디오: `GenerationCard` 곡마다 내려받기 옆.
   - SUNO 자동화: `TrackCard` 곡 변주마다 재생기 아래.
3. 매뉴얼 한 줄, 버전 +0.01(코드·DB).

## 검수
- 로컬: 시험(사본 일치·명령 만들기)·tsc·build(두 프로그램).
- 운영(메인 크롬, 시험 계정, 확장 설치됨): 각 프로그램에서 기존 곡 1개를 MP3 + 음량 맞춤으로 저장, 파일·음량 표시 확인. 휴대폰 폭 줄바꿈.

## 비용
| 항목 | 횟수 | 계정·키 | 대략 |
|---|---|---|---|
| Vercel 배포 빌드 | 2회 | 팀 `buylife` | 빌드 2회분 |
| AI·외부 호출 | 없음(기존 곡 사용) | — | 0원 |
