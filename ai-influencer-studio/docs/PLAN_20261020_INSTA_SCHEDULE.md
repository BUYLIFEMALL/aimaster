# 개발 플랜 — 인스타 자동 포스팅 2차: 예약 게시·게시 기록 (v1.15)

- 작성: 2026-10-20 Claude Code(윈도우) · 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)
- 근거 지시: 「모든 인스타 자동화 프로그램은 자동 포스팅까지」(2026-10-19) → 1차 즉시 게시 v1.14 완료 후 주인님 「진행해줘」(2026-10-20, 운영 DB 표 추가 승인)
- 기준 구현(복사 후 이 프로그램에 맞춤): `cardnews-studio` v1.19(게시 기록·예약) + v1.24(회원 실행 방식 선택) + 2026-10-20 공용 개선(실패 시 상태 되돌리기). 예약 지침: 루트 `docs/SCHEDULER_POLICY.md`

## 1. 문제
v1.14는 「지금 게시」만 됩니다. 화보를 만든 뒤 원하는 시각에 올리려면 그때 다시 접속해야 하고, 무엇을 언제 올렸는지 기록도 남지 않습니다.

## 2. 범위
| 구분 | 내용 |
|---|---|
| 게시 패널 | 「지금 게시 / 예약 게시」 전환, 예약 날짜·시간(한국 시간, 10분 뒤~60일 안), 예약 실행 상태 줄(일시정지·재개) |
| 게시 기록 | 패널 아래 「최근 인스타 게시 기록」(최근 30일, 예약됨·게시 중·게시됨·실패·취소, 게시물 보기, 예약 취소). 즉시 게시도 기록 |
| 설정 | 「🔑 API키등록·플랫폼연동」 창 아래 「⏰ 예약 발행」: 실행 방식 선택(AIMaster 기본 Vercel / 내 cron-job.org) + cron-job.org API 키 한 줄(공용 `cronjob_org_api_key`, 다른 프로그램에서 넣었으면 그대로 등록됨) |
| 서버 | 예약 등록·취소·기록 조회, 운영자 실행(5분, `CRON_SECRET`), 회원 전용 실행(1분, 회원 토큰), 30일 정리, 30분 멈춤 정리, 24시간 넘게 밀린 예약 미게시, 일시 오류 1회 재시도 + 재시도 전 중복 확인 |
| 사진 | 예약 사진은 기존 공개 저장소 `insta-post-images`의 회원 폴더 `{userId}/influencer-insta/{묶음}/`에 예약 시각까지 보관 → 게시·실패·취소·30일 뒤 삭제 |

## 3. DB 변경 (운영, 승인됨)
- `aif_insta_posts` — 게시 기록·예약(카드뉴스 `cns_insta_posts`와 같은 구조, 프로젝트 칸 없음). RLS 본인 읽기만, 쓰기는 서버(서비스 키)만
- `aif_member_scheduler` — 회원 실행 방식·회원 토큰 해시·cron-job.org 작업 번호·일시정지(카드뉴스 `cns_member_scheduler`와 같은 구조)
- `programs.version = 'v1.15'`
- SQL 파일: `ai-influencer-studio/supabase/migrations/20261020120000_insta_schedule_v1_15.sql`

## 4. 환경변수 (운영 Vercel `ai-influencer-studio`)
- `CRON_SECRET` 새로 추가(무작위 값, 화면·문서에 출력하지 않음) — Vercel 예약 호출 인증용
- `AIF_PLATFORM_SCHEDULER`는 추가하지 않음(없으면 Vercel 방식 켜짐 = 기본값). 관리자가 끄고 싶을 때만 `off`
- `vercel.json`에 `crons` 추가: `/api/instagram/dispatch` 5분마다

## 5. 구현 순서
1. 순수 함수 `src/lib/instagram/schedule.ts`(카드뉴스 사본) + 시험
2. 서버: `posts.ts`(기록·예약 실행·정리), `memberScheduler.ts`·`cronJobOrg.ts`(사본, 표·주소·토큰 접두어만 변경)
3. API: `posts`(GET/POST/DELETE), `dispatch`, `dispatch-member`, `scheduler`(상태·방식·일시정지·키 저장/삭제), `publish`에 기록 추가
4. 화면: `InstagramPublishPanel` 예약·기록, `SchedulePublishingControl`, `ScheduleSettings`(키 창 안)
5. 로컬 시험·타입 검사·빌드 → DB 적용(크롬 SQL Editor) → 환경변수 → 배포 → 크롬 검수 → 문서·커밋

## 6. 검수 방법
- 단위 시험: 예약 시각 범위, 한국 시간 변환, 24시간 규칙, 일시 오류 판정, 중복 확인
- 크롬(관리자 계정): 예약 전환·시간 입력·상태 줄, 설정 창 「⏰ 예약 발행」, 기록 목록, **예약 등록 → 취소**(실제 게시 없이), 비로그인 401, 회원 실행 주소 잘못된 토큰 401, 운영자 실행 주소 비밀값 없이 401
- **실제 인스타 게시는 하지 않습니다**(주인님 확인 전 실제 SNS 발행 금지). 예약은 등록 후 바로 취소합니다

## 7. 비용
| 항목 | 비용 |
|---|---|
| 개발·시험 | 유료 AI 호출 없음(사진은 시험 기록으로 대체) |
| 운영자 인프라 | Vercel 예약 호출 5분마다 1회(가벼운 DB 조회, 기존 요금제 안), 저장 용량은 예약 사진만큼 잠깐 |
| 회원 부담 | 없음. 「내 cron-job.org」는 무료 계정 |

## 8. 버전·배포·인수인계
- v1.14 → **v1.15**(코드 `src/lib/version.ts` + DB `programs.version`)
- `vercel deploy --prod --yes` 1회, Ready 확인
- `AGENTS.md` 버전 기록·검수 기록, 백로그 인스타 자동 포스팅 항목 완료 표시, 루트 `docs/SCHEDULER_POLICY.md` §8 현황표, `docs/HANDOFF.md` 맨 위
