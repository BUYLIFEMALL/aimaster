# 개발 플랜 — v1.22 완성본 보관 (2026-10-24)

작성: Claude Code 윈도우 · 음악 담당 세션 `claude-win-20261024-music`. 상태: **주인님 승인 대기**(DB 스키마 변경·환경변수 포함).
근거: `docs/IMPROVEMENT_BACKLOG.md` 맨 위 표 1번. 주인님 지시 「순서대로 해」(2026-10-24, 1~5번 차례로).

## 1. 문제
- 「최종 뮤직비디오 만들기」 결과(MP4)는 회원 브라우저에만 있어, 창을 닫거나 새로고침하면 사라집니다. 다시 보려면 장면 영상부터 다시 만들어야 합니다(유료).

## 2. 기준으로 삼는 기존 코드 (프로그램 비교표·공용 기능 원칙)
- AI 영상 스튜디오 v1.05 「완성본 갤러리 저장」(`ai-video-studio/lib/edit/edits.ts`, `supabase/migrations/0004_edits.sql`, `/api/cron/cleanup`) — 같은 공용 영상 합성 코드(`video-edit-*`)로 만든 MP4를 **브라우저가 서명 업로드 주소로 회원 폴더에 바로 올림**(Vercel 본문 4.5MB 제한 회피), 50MB 한도, 회원 본인 행만, 30일 자동 정리. 이 구조를 뮤직비디오 전용으로 옮깁니다(서로 호출하지 않음).

## 3. 범위
1. **DB(운영 `esgxyikcnnvmlhygjkth`, 승인 필요)** — 마이그레이션 `supabase/migrations/20261024_v1_22_render_archive.sql`:
   - 표 `mvs_renders`(id, user_id, title, song_title, output_path, output_bytes, duration_s, width, height, created_at) + RLS(회원은 본인 행 조회·삭제만, 쓰기는 서버만, anon 차단) + 인덱스.
   - 비공개 저장소 `music-video-studio`(50MB, `video/mp4`만). 경로 `{user_id}/renders/{id}.mp4`.
2. **서버 API**(모두 `checkProgramAccessApi` + `force-dynamic`):
   - `POST /api/music/renders` — 보관 시작: 행 만들고 서명 업로드 주소 발급(크기 50MB 초과면 거절, 회원당 보관 최대 20개).
   - `POST /api/music/renders/[id]/done` — 업로드 확인(파일 실제 존재·크기 확인 후 행 확정, 없으면 행 지움).
   - `GET /api/music/renders` — 내 보관 목록(1시간 재생·내려받기 서명 주소, 남은 보관일).
   - `DELETE /api/music/renders/[id]` — 파일·행 삭제.
   - `GET /api/cron/cleanup` — 30일 지난 행·파일 정리(`CRON_SECRET` 확인, 한 번에 100개, `usage_logs` 기록). `vercel.json`에 매일 1회 예약.
3. **화면**: 최종 뮤직비디오 칸에 「보관함에 저장」 버튼(완성 직후), 그 아래 「보관한 완성본」 목록(재생·MP4 내려받기·삭제·남은 일수, 30일 뒤 자동 삭제 안내). 휴대폰 폭 1열.
4. 매뉴얼에 한 줄, 버전 v1.22(코드 + DB `programs.version`).
- 회원 본인 데이터만 다루고 다른 회원과 공유하지 않습니다(생성 데이터 30일 자동 삭제 원칙).

## 4. 검수
- 로컬: 시험(제목·크기 검사, 남은 일수 계산, 경로가 회원 폴더인지)·`tsc`·`npm run build`.
- 운영(메인 크롬, 시험 계정): 장면 이미지 2장으로 짧은 MP4 렌더 → 보관 → 새로고침 뒤 목록에서 재생·내려받기 → 삭제 후 파일·행이 지워졌는지 DB로 확인. 다른 회원 행이 안 보이는지(관리자 계정 목록 비교). 정리 예약 주소는 비밀값 없이 401 확인.

## 5. 비용
| 항목 | 횟수 | 계정·키 | 대략 |
|---|---|---|---|
| Vercel 배포 빌드 | 1회 | 팀 `buylife` | 빌드 1회분 |
| Gemini 장면 이미지 | 2장 | 시험 계정 본인 키 | 약 $0.08 |
| 렌더 | 회원 브라우저 | — | 없음 |
| 운영자 저장 용량(Supabase Storage) | 회원당 최대 20개×50MB, 30일 뒤 삭제 | 운영 Supabase | 현재 요금제 포함 용량 안에서 시작, 늘면 보고 |
| Vercel 예약 실행(정리) | 하루 1회 | 팀 `buylife` | 사실상 없음 |

## 6. 승인이 필요한 것
1. 운영 DB에 표·저장소 추가(위 마이그레이션) — 크롬 SQL 편집기 또는 Supabase 도구로 실행.
2. `music-video-studio` Vercel 프로젝트에 `CRON_SECRET`이 없으면 새로 등록(값은 무작위 생성, 화면·문서에 적지 않음).
3. 빌드 1회·이미지 2장 비용.
