# 플랜: 유튜브 올리기 기록 저장 (`playlist-channel-studio`, 2026-11-13)

- 작성: 음악 담당 `claude-win-20261024-music` [역할: music]
- 계기: 업무 워크스페이스 담당(workspace)의 요청 「playlist-channel-studio 유튜브 기록 저장(그래야 연동 가능) — 음악 담당」(이 폴더 `docs/IMPROVEMENTS.md` 맨 위, 워크스페이스 플랜 `ai-work-workspace/docs/PLAN_20261106_U10_CONTENT_CALENDAR.md` §3-3)
- 상태: **주인님 결정 대기** (아래 4절)

## 1. 지금 문제
- 「유튜브에 올리기」(`src/components/video/YoutubeUploadCard.tsx`)는 올린 결과를 화면 목록(`done`)에만 둡니다. 새로 고치면 사라지고 DB에 남지 않습니다.
- 그래서 워크스페이스 「📅 콘텐츠 캘린더」로 유튜브 발행 기록을 보낼 수 없습니다. 회원도 예전에 무엇을 올렸는지 다시 볼 수 없습니다.
- 영상 파일은 브라우저가 유튜브로 바로 보냅니다(Vercel 4.5MB 한도). 그래서 영상 번호(`videoId`)는 올리기가 끝난 뒤 브라우저만 압니다.

## 2. 만들 것
| 순서 | 내용 | 파일 |
|---|---|---|
| 1 | 새 표 `playlist_youtube_uploads`: `id`, `user_id`, `video_id`, `url`, `title`, `privacy`(private/unlisted/public), `publish_at`(예약이면 시각), `channel_account_id`, `uploaded_at`, `created_at`. 회원 본인만 읽는 RLS, 쓰기는 서버만. `(user_id, video_id)` 중복 금지 | `supabase/migrations/v1_39_youtube_uploads.sql` |
| 2 | 기록 API `POST /api/youtube/uploads`: 로그인·이용 권한 확인 → **회원 본인 유튜브 연결로 그 영상이 실제로 회원 채널에 있는지 확인**(`videos.list`, 할당량 1) → 저장. 브라우저가 보낸 제목은 쓰지 않고 유튜브에서 읽은 제목을 씀. `GET`은 회원 본인 최근 기록 20개 | `src/app/api/youtube/uploads/route.ts`, `src/lib/youtube/client.ts`(영상 확인 함수 1개) |
| 3 | 화면: 올리기가 끝나면 위 API를 부름(실패해도 올리기는 성공으로 보여 줌, 「기록 저장 실패」 한 줄만). 카드 아래 목록을 DB 기록으로 보여 줌(새로 고쳐도 남음) | `YoutubeUploadCard.tsx` |
| 4 | 워크스페이스에 넘길 값 정리: 제목·상태(예약 시각이 미래면 「예약」, 아니면 「발행됨」)·예약 시각·발행 시각(`uploaded_at`, 예약이면 `publish_at`)·영상 주소·`user_id` | 이 문서 5절 → workspace 세션 |
| 5 | 버전 v1.39, DB `programs.version`, AGENTS·IMPROVEMENTS·역할 파일·HANDOFF | 문서 |

- 「실패」 상태는 저장하지 않습니다. 실패하면 영상 번호가 없어 확인할 대상이 없기 때문입니다.
- 「📨 업무 워크스페이스로 보내기」 버튼과 `/api/work-inbox`는 workspace 세션 몫입니다(그쪽 요청서대로). 이 작업은 그 버튼이 읽을 기록을 만드는 데까지입니다.

## 3. 검수
- `npx tsc --noEmit`, 기존 시험(`npm test` 28개).
- 운영 배포 뒤 ego lite 시험 계정: 시험 계정 유튜브가 연결돼 있으면 비공개 1편을 올려 기록 저장·새로 고침 뒤 목록 유지 확인 → 확인 뒤 그 영상은 유튜브에서 지움. 연결이 없으면 관리자 계정 채널에 비공개 1편(지난 v1.22~v1.24 시험과 같은 방법).
- 운영 DB 읽기로 그 줄이 회원 본인 `user_id`로 1개만 들어갔는지 대조.

## 4. 주인님께 여쭐 것
1. **진행 여부와 시점**: 지금 바로 진행 / 워크스페이스 버튼 작업 때 함께(추천: 지금 진행 — 기록은 회원에게도 바로 쓸모가 있고, 워크스페이스 쪽은 이 표가 있어야 시작할 수 있음)
2. **운영 DB 표 추가**(마이그레이션 1개) 승인
3. **보관 기간**: 이 프로그램에는 30일 정리 코드가 아예 없습니다(`playlist_projects`도 무기한, 2026-11-11 요청 대기 중). 추천: 이번에 새 표만 넣고, 30일 정리(프로젝트·기록 함께, `retention_exempt` 회원 제외)는 다음 작업으로 따로 진행
4. **빌드 1회**(Vercel, 이 프로그램만) 승인 — 작은 수정 모음 규칙의 예외 ②(다음 작업인 워크스페이스 연동이 배포를 전제로 함)

## 5. 워크스페이스에 넘길 값 (구현 뒤 확정)
| 캘린더 열 | 가져올 곳 |
|---|---|
| 제목 | `playlist_youtube_uploads.title` |
| 채널 | 고정 「유튜브」 |
| 상태 | `publish_at > now()`면 「예약」, 아니면 「발행됨」 |
| 예약일 | `publish_at` |
| 발행일 | `publish_at`이 있으면 그것, 없으면 `uploaded_at` |
| 발행 주소 | `url` |
| 회원 | `user_id` |

## 6. 비용
| 항목 | 횟수 | 계정 | 금액 |
|---|---|---|---|
| Vercel 빌드 | 1회 | 팀 `buylife` | 빌드 1회분 |
| 운영 DB 마이그레이션 | 1회 | 운영 `esgxyikcnnvmlhygjkth` | 없음 |
| 유튜브 API | 올릴 때마다 할당량 1(영상 확인) | 회원 본인 연결 | 무료 할당량 안 |
| AI 호출 | 없음 | — | 없음 |
