# 인수인계 — `mall-builder/.env.local` 덮어쓰기 사고 (2026-11-14)

작성: Claude Code(윈도우) · 세션 `claude-win-20261025-workspace` · [역할: mall-builder]
주인님 지시: 「동일한 사고가 발생안되도록 관련 메인 지침에 넣어두고 인수인계 문서로도 남겨」

## 1. 무슨 일이 있었나
- 2026-11-14 22:33, `mall-builder/.env.local`(git 밖 파일, 원래 1,824바이트)의 내용 전체가 아래 한 줄로 바뀌었다(220바이트).
  - 「mall-builder 담당께: 25단계 통과 기록 확인했습니다. 택배사 예시가 입력값처럼 보이는 문제와 「출금 신청」 펼치기 단추의 오해 가능성은 개선 후보로 검토해 주세요.」
- 결과: 내 PC 개발 서버(포트 3210)의 모든 화면이 500(「Your project's URL and Key are required to create a Supabase client!」). 운영 사이트는 Vercel 환경변수를 쓰므로 영향 없음.
- 프론트 디자인 빌더 세션(`e810d983`)이 22:38에 먼저 발견해 `docs/HANDOFF_DESIGN_BUILDER_BACKEND_SYNC.md` S13으로 알림(그 세션은 원인 아님).

## 2. 원인 조사 결과
- 같은 글은 같은 날 15:17에 주인님이 백엔드 세션(`8620509f`)에 붙여 넣은 채팅 메시지와 똑같다.
- 이 PC(윈도우 메인)의 Claude 세션 기록 12개(22:00 이후 바뀐 것 전부)를 22:28~22:36 범위로 찾았으나 `.env.local`을 쓴 명령은 없었다. 백엔드 세션은 그 시각 Lab DB 적용(확인 창 대기)만 하고 있었다.
- 그래서 **같은 공유 폴더를 쓰는 다른 장비(맥미니·Admin PC)의 세션이거나 기록이 남지 않는 다른 도구가 쓴 것으로 추정**한다. 확정은 그쪽 기록 확인이 필요하다(남은 일 1).
- 이 글의 두 제안은 이미 처리된 항목이었다(`docs/IMPROVEMENTS.md` 2026-11-14 분양몰 검수 칸 ✅ 2건) — 옮길 새 내용은 없음.

## 3. 복구한 것
| 항목 | 상태 |
|---|---|
| 사고 파일 내용 | 저장소 밖 scratchpad에 백업 |
| `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Lab(`rjjtjakljjxsgjelqgek`) 공개값으로 복구 |
| `MALL_SECRET_KEY`(몰 대표 AI 키 암호화 열쇠) | 원래 값 분실 → 주인님 승인으로 **Lab·내 PC 전용 새 열쇠** 생성(값은 출력·기록 안 함) |
| 예전 열쇠로 암호화된 Lab 데이터 | `mall_builder_store_scheduler_secrets.ai_key_enc` 1건(시험 몰 `aimaster-b2b`) — 관리 화면 「쇼핑몰 정보 → AI」에서 다시 등록 필요 |
| `SUPABASE_SECRET_KEY`(Lab 서버 키) | **비어 있음 — 주인님이 Lab Supabase 대시보드에서 복사해 `.env.local`에 직접 넣어야 함**(관리자 기능 일부·AI 호출 코드가 씀) |
| `MALL_ROOT_DOMAIN`·`MALL_SINGLE_SLUG` 등 | 없어도 기본값(localhost)으로 동작 |
| 개발 서버 | 바뀐 설정을 읽다 꼬여 포트 3210 프로세스를 끄고 다시 띄움 |

## 4. 재발 방지 (적용함)
1. 메인 지침 `CLAUDE.md`·`AGENTS.md`·`GEMINI.md` 「지침 빠른 찾기」 바로 위에 **「`.env*` 덮어쓰기 사고 재발 방지」** 고정 규칙 추가 — 인수인계 글은 `docs/`·채팅에만, `.env*`는 줄 추가만·고치기 전 사본, 값 출력 금지, 이상하면 점검 스크립트, 비밀값은 주인님이.
2. 점검 스크립트 `scripts/check-env-files.mjs` 추가 — `node scripts/check-env-files.mjs [폴더]`. 값은 출력하지 않고 `이름=값`이 아닌 줄(글자 수·한글 포함 여부만)과 빈 파일을 알려 줌. 시험: 저장소 `.env*` 101개 정상, 사고 파일 사본은 「깨짐」으로 잡힘(종료 코드 1).
3. `docs/ERROR_LESSONS.md` 2026-11-14 항목.

## 5. 남은 일
1. (주인님) 맥미니·Admin PC 세션에 위 메시지를 붙여 넣은 적이 있으면 알려 주시면 그쪽 기록으로 원인 확정.
2. (주인님) `mall-builder/.env.local`에 Lab `SUPABASE_SECRET_KEY` 직접 추가.
3. (백엔드) Lab 시험 몰 `aimaster-b2b` AI 키 다시 등록 뒤 AI 기능 확인.
4. (모든 CLI) 다른 프로그램도 작업 시작 때 이상하면 `node scripts/check-env-files.mjs <폴더>`.
