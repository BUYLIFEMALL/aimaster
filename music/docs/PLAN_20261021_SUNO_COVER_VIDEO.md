# 개발 플랜 — Suno V6 3차 ⑦⑧: Suno 커버 이미지 · 뮤직비디오(MP4) (v1.31 예정)

> 2026-10-21 Claude Code(윈도우). 제안서 [PLAN_20261021_SUNO_V6_FEATURES.md](PLAN_20261021_SUNO_V6_FEATURES.md) ⑦⑧. 주인님 승인 대기.

## 문서 확인 내용 (docs.sunoapi.org, 2026-10-21)
| 기능 | 주소 | 필수 | 결과(콜백) | 상태 조회 | 특이사항 |
|---|---|---|---|---|---|
| Suno 커버 이미지 | `POST /api/v1/suno/cover/generate` | `taskId`, `callBackUrl` | `data.images[]`(보통 2장), `data.taskId` | `GET /api/v1/suno/cover/record-info` | **곡 작업당 1번만** — 다시 요청하면 400과 기존 taskId 반환. 이미지 주소 14일 보관 |
| 뮤직비디오 MP4 | `POST /api/v1/mp4/generate` | `taskId`, `audioId`, `callBackUrl` (선택 `author`·`domainName` 각 50자 — 영상에 표시) | `data.task_id`, `data.video_url` | `GET /api/v1/mp4/record-info` | 영상 15일 보관, 음악에 맞춘 시각 효과 |
- 두 기능 모두 크레딧 단가는 문서에 없음(https://sunoapi.org/billing). 실패 시 환불(531).

## 범위·구현 순서
1. **DB(승인 필요)** 새 표 `music_track_media` 하나로 두 기능 결과를 관리:
   `id, user_id, track_id(cascade), variant_id(영상만, cascade), kind('suno_cover'|'video'), task_id, status('generating'|'completed'|'failed'), urls jsonb(우리 저장소 주소 배열), error_message, created_at` + 회원별 RLS. 곡이 30일 정리로 지워지면 함께 지워지고, 정리 작업(`app/api/cron/cleanup`)에 이 표의 파일도 지우도록 추가.
2. `lib/ai/suno.ts` `requestSunoCover()`·`requestSunoVideo()` (400 「이미 만듦」은 기존 작업 번호를 받아 그대로 이어 받기).
3. 결과 수신 `app/api/webhooks/suno-media/route.ts`(커버·영상 공용, 작업 번호로 찾기 → 잠금 → 즉시 200 → `waitUntil`로 우리 저장소 `{user}/{track}/suno-cover-N.png`·`{user}/{variant}/video.mp4`에 복사). 웹훅이 오지 않을 때를 대비해 「상태 확인」 버튼(위 조회 주소 사용).
4. 화면(곡 카드):
   - 트랙 단위 「🖼️ Suno 커버 받기(2장)」 → 완료되면 두 장 미리보기 + 「이 커버로 바꾸기」(그 곡 변주들의 커버를 교체). 기존 자동 커버(회원 Gemini 키)는 그대로 둔다.
   - 변주 단위 「🎬 Suno 뮤직비디오(MP4)」 → 완료되면 영상 재생기 + 내려받기. 영상 표시 이름(`author`)은 곡 제목 대신 비워 둠(선택 입력 칸 제공).
5. 서명 주소(`lib/storageSign.ts`)에 새 표 주소 포함, 30일 자동 삭제 배지·안내 그대로 적용.

## 검수 방법
로컬 tsc·lint·테스트·build → 배포 → 크롬 시험 계정 「빗속의 다짐」에서 **커버 1회 + 영상 1회 실제 호출**(승인 필요) → 결과 저장·서명 주소 재생/표시·커버 교체 확인, `record-info`로 요청 값 확인.

## 비용
| 항목 | 내용 | 승인 |
|---|---|---|
| 개발·시험 | Suno 커버 1회 + 뮤직비디오 1회(시험 계정 본인 sunoapi.org 키, 단가 문서 미표기·실패 시 환불) | 필요 |
| 운영자 | Vercel 빌드 1회 | |
| 운영자 | 저장 용량: 영상 1개 수 MB~수십 MB(30일 뒤 자동 삭제) | |
| 회원 부담 | 회원 본인 sunoapi.org 크레딧 | |
| DB | 새 표 1개 | 필요 |

## 다른 프로그램과의 관계
- 뮤직비디오 자동화·LP 턴테이블·AI 가사영상과 겹칠 수 있음: Suno MP4는 **버튼 한 번으로 받는 기본 시각화 영상**이고, 가사 자막·배경 선택 등 편집은 기존 영상 프로그램(가사 영상 만들기 링크)이 담당. 곡 카드에서 두 경로를 나란히 보여 준다.

## 버전·배포·인수인계
v1.31(코드 + DB), 마이그레이션 `supabase/migrations/0018_track_media.sql`, `AGENTS.md`, 제안서 ⑦⑧ 상태, 루트 `docs/HANDOFF.md`.
