# 세션 인수인계 — 음악 메인 담당 (Claude Code 윈도우 · 세션 `claude-win-20261023-bgm`, 2026-10-23)

> 주인님 지시: 「음악관련 작업이 너 담당이야」 → 「넌 음악관련 메인 작업을 담당하도록 해」.
> 이 문서는 이 세션이 2026-10-23 하루 동안 한 음악 작업 전체와 남은 일·주의점을 모은 것입니다. 다음 음악 작업 세션은 이 문서 → 각 프로그램 `AGENTS.md` 맨 아래 → `docs/PENDING_DEPLOYS.md` 순서로 읽으면 됩니다.

## 1. 맡은 범위
| 구분 | 프로그램·코드 |
|---|---|
| 직접 맡는 프로그램 | AI 음악 스튜디오(`ai-music-studio/`), 음악(SUNO)자동화(`music/`), AI 마스터링 스튜디오(`ai-mastering-studio/`) |
| 다른 프로그램의 음악 부분 | YOUTUBE Shots 배경음악(`shots/`), AI 쇼츠 원스톱 배경음악(`shorts-onestop-studio/`), 뮤직비디오 곡 연결(`music-video-studio/`), 가사 영상·플레이리스트 곡 연결 |
| 공용 음악 코드 | `suno-api-client`(기준 `music/lib/ai/suno.ts`), `music-sync-calls`(기준 `ai-music-studio/lib/providers/musicCalls.ts`) — 사본은 직접 고치지 않고 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync` |
| 맡지 않는 것 | 영상 작업(영상 담당 세션 `claude-win-avs-c12`). 쇼츠·원스톱·뮤직비디오의 영상 공용 사본 미배포 대기는 그 세션 몫 |

## 2. 오늘 배포한 것 (모두 주인님 승인 빌드)
| 프로그램 | 버전 | 내용 | 배포 | 화면 확인 |
|---|---|---|---|---|
| YOUTUBE Shots | v1.39 | 배경음악 Suno V4_5(지원 종료) → V6 | `shots-5v3mnsanc` | 시험 회원 2곡 생성 |
| YOUTUBE Shots | v1.40 | 배경음악 모델 고르기(Suno V6·Mini·Wild, Lyria 3.5, ElevenLabs) | Ready | Lyria 62초·ElevenLabs 60초 |
| YOUTUBE Shots | v1.42 | Lyria·ElevenLabs 곡에 실제 길이 「OO초」(`src/lib/audioDuration.ts`) | `shots-4qfznzp6u` | Lyria 1곡 「66초」(재생 막대 1:05) |
| AI 쇼츠 원스톱 | v1.38~v1.40 | AI 음악 스튜디오 곡 고르기, `?ams=` 링크로 넣기, 대본 여러 개일 때 「이 대본에 넣기」 | Ready | 대본 20개 안내 확인 |
| 뮤직비디오 | v1.13~v1.14 | 곡 가져오기·직접 올리기, `?ams=` 링크로 넣기 | Ready | 확인 |
| AI 음악 스튜디오 | v1.07~v1.11 | 다른 프로그램 링크, Stable Audio 3, Lyria RealTime(서버 녹음), Mureka 코드(숨김), 디자인 리뉴얼 「사운드 랩 바이올렛 스타일」(미니 플레이어·2열·요약 패널) | Ready | 소리 재생 주인님 직접 확인 |
| AI 음악 스튜디오 | v1.12 | 제안 가~라: 미니 플레이어 반복(끔→목록→한 곡)·무작위, 재생한 곡 실제 파형, 「이 설정으로 다시 만들기」, 보관함 공급자 필터 | `ai-music-studio-brcpsck8j` | 네 기능 크롬 확인, 반복·무작위 주인님 확인 |
| AI 음악 스튜디오 | v1.13 | 공급자 색 점·띠 투명 수정(`tailwind.config.ts` content에 `./lib/**`) | `ai-music-studio-pwose5nlf` | 계산값 5색 확인 |
| AI 마스터링 스튜디오 | v1.12 | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로 | `ai-mastering-studio-560vmpqod` | 데스크톱·390px 확인 |
| AI 마스터링 스튜디오 | v1.13 | 「연동 & 사용 매뉴얼」 메뉴 한 줄(중복 📖 이모지 제거·`whitespace-nowrap`) | `ai-mastering-studio-5yboet05u` | 높이 58→42px |

## 3. 점검만 한 것
- **음악(SUNO)자동화 30일 정리**: `music/vercel.json` 매일 18:00 UTC `/api/cron/cleanup`. 비밀값 없이·틀린 값 401, `CRON_SECRET`·서버 키 등록(이름만 확인), 2026-10-23 03시 실행 200(유예로 건너뜀). 유예 마감 2026-10-28 23:59 KST(`music/lib/retention.ts`) → **첫 실제 삭제 2026-10-29 03:00 KST**.
- **첫 정리 예정치(10-23 읽기 전용 조회, 기준 생성 2026-09-28T18:00Z 이전)**: 곡 34/전체 67(회원 5명), 리믹스 6/9, 빈 기획 후보 20. 한 번에 100개씩이라 첫 실행에 모두 처리 예상.

## 4. 남은 일
| 순서 | 작업 | 조건 | 비용 |
|---|---|---|---|
| 1 | 음악(SUNO)자동화 첫 정리 결과를 위 예정치와 대조 — `usage_logs`(program `music-automation`, action `cleanup_expired`)와 남은 곡 수 | 2026-10-29 03:00 KST 이후 | 없음 |
| 보류 | Mureka 켜기 — 코드 준비 완료(`MUREKA_ENABLED = false`). 주인님 지시 「나중에 필요해지면 충전하고 그때 이후 작업 및 테스트」 → 충전·키 등록(주인님) → `ai-music-studio/supabase/migrations/0004_mureka_provider.sql` 실행(승인) → 켜기·시험 1곡 → 배포 | 주인님이 필요하다고 하실 때 | 그때 사전 승인 |

## 5. 이 세션에서 겪은 문제와 교훈
- **공용 색 클래스 누락**: `lib/`에만 적은 Tailwind 클래스는 `content`에 `lib`가 없으면 CSS가 안 생김 → `docs/ERROR_LESSONS.md` 2026-10-23 항목. 색은 크롬 `getComputedStyle`로 확인.
- **프로그램 비교표 겹침**: 같은 파일을 여러 세션이 고쳐 안전 커밋 도우미가 「겹침」으로 멈춤 → 내 줄만 HEAD 값으로 잠시 되돌려 `--begin` → 다시 적용 → 커밋하면 내 줄만 들어감(남의 미커밋 줄 보존).
- **git 잠금 파일**: 다른 세션들이 연달아 커밋할 때 `.git/index.lock`으로 커밋 실패 — 지우지 않고 풀릴 때까지 기다린 뒤 경로 지정 커밋.
- **새 파일 커밋**: `git commit -- <경로>`는 처음 만든 파일을 모름 → 먼저 `git add -- <새 파일>` 후 바로 경로 지정 커밋.
- **자동화 클릭은 소리 재생이 막힐 수 있음**: 소리는 주인님이 직접 ▶로 확인(오늘 정상).
- **한국어 지침**: 도구 사이 진행 안내를 영어로 써서 종료 검사 훅에 여러 번 막힘. 원인은 결과를 보자마자 할 일을 영어로 정리해 옮긴 것 → 안내는 「~하겠습니다./~했습니다.」로만, 필요할 때만.

## 6. 비용 (오늘 이 세션)
| 항목 | 횟수 | 계정·키 | 대략 |
|---|---|---|---|
| Vercel 배포 빌드 | Shots 3·원스톱 3·뮤직비디오 2·AI 음악 스튜디오 7·마스터링 2 정도(모두 승인) | 팀 `buylife` | 빌드 회수분 |
| 시험 생성 | Suno 2곡, Lyria 여러 곡(곡당 약 $0.08), ElevenLabs 1곡, Stable Audio 3·Lyria RealTime 각 1회 | 시험 회원 본인 키 | 약 $1 미만 |

## 7. 링크
- https://ai-music-studio.buylife.xyz
- https://ai-mastering-studio.buylife.xyz
- https://music-automation.buylife.xyz
- https://shots.buylife.xyz
- https://shorts-onestop-studio.buylife.xyz
- https://music-video-studio.buylife.xyz
