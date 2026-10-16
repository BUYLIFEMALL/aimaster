# 인수인계 — Claude Code 보조 계정(윈도우) 세션 2026-10-15 밤 ~ 2026-10-16

- 계정: Claude Code 보조 계정 `buylifemall1@gmail.com`(설정 `.claude-account2`) · 저장소 `D:\Antigravity\AIMaster`(master)
- 브라우저: 엣지만 사용(deviceId `6455da5d-…`). 크롬은 메인 계정 세션 전용. 엣지에는 시험 계정(`buylifemall@naver.com`, VIP)과 관리자 계정 로그인 이력이 있다(프로그램마다 자체 로그인인 곳은 따로).
- 이전 인수인계: [`HANDOFF_CLAUDE_SESSION_2026-10-15_ACCOUNT2_EVENING.md`](HANDOFF_CLAUDE_SESSION_2026-10-15_ACCOUNT2_EVENING.md)
- 같은 기간 다른 세션 작업(이 문서 범위 아님): `blog-content-maker` v1.01~v1.03·Supabase 키 호환(Codex), 맥미니 세션의 설명 재작성·도톨이 분석 인계.

## 1. 한 일 (시간순, 모두 커밋·푸시 완료)

| # | 작업 | 결과·버전 | 커밋 |
|---|---|---|---|
| 1 | 저녁 인수인계 문서 + 맥미니 작업 지침 커밋 | `HANDOFF_..._EVENING.md`, `MAC_MINI_WORK_GUIDE.md` | `a7d4e820` `e2c10190` `53786672` |
| 2 | Step Mail Next 16 이전(B1) — 맥미니 수정분을 윈도우에서 설치·빌드·배포 | stepmail v1.09, next 16.4.1, 운영 취약점 0 | `0834c451` `4de4ff34` |
| 3 | 참고 설치 프로그램 기능 분석 → 새 프로그램 **「AI 블로그 작업실 자동화」(`blog-workroom`)** 웹 재구현(권리 없음 — 기능만 참고) | v1.01 출시, https://blog-workroom.buylife.xyz | `fc620130` `7cff8bc7` |
| 4 | 프로그램 안 참고 원본 이름 표현 제거 / 문서 이름 변경 | v1.02, 문서 `BLOG_WORKROOM_REFERENCE_*` | `a210e4cf` `39331879` |
| 5 | 메인 계정 본인 키로 네이버 키 흐름 실제 검수 후 수정(등급 기준 실측 보정·연관어 재조회·데이터랩 미집계일·검수 제안 지시문) | blog-workroom v1.03 | `0c226608` |
| 6 | 프로그램 설명 작성 표준 → 핵심 원칙 22 신설, 81개 설명 전체 재작성(비슷한 프로그램 차별점 강조) | 원문 백업 `program-descriptions/backup-before-2026-10-16.json` | `b1c2ce72` `5e9208cb` `04bd95ea` |
| 7 | 상세 페이지 3단 구성(설명 → 핵심 특징 4 → 사용 순서 4), `programs.detail_sections` 칸 추가, 82개 입력, 관리자 입력칸 | + **프로그램 역량 지도** `PROGRAM_CAPABILITY_MAP.md`, 핵심 원칙 23 | `e77ae69d` |
| 8 | FREE 배지 = 가입·로그인 회원 누구나(주인님 재확인). 82개 판정 점검 → 판정이 없던 **성격코드**에 로그인+공통 판정 | personality-code v1.03 | `f6202a68` |
| 9 | 폴더별 초기 템플릿 「Git push·배포 사전 승인」 폐지(22개 `AGENTS.md`) + 캐릭코드 권한 조회를 서비스 롤로(원칙 6) | mbti-character v1.06 | `70d5f9e0` |
| 10 | 시험 계정 로그인 후 성격코드·캐릭코드 검사·결과 화면 확인 | 문서만 | `fc31b6a4` |
| 11 | 상세 페이지 **「추천 활용 대상」 3카드를 프로그램별 기능·차별점 내용으로**(`detail_sections.audiences`, 82개) + 관리자 입력칸 | 메인 사이트 배포 | `f0fe08c2` |
| 12 | 관리자 편집 화면 입력칸 표시·저장 시험(값 변경 없이 저장 → 전후 DB 비교, `updated_at`만 변경, 가격 플랜 id 동일) | 문서만 | `2969d8a2` |

## 2. 이번에 정해진 규칙 (다음 세션이 꼭 알아야 할 것)
- **작업이 끝나면 승인 질문 없이 검수 → 커밋 → 푸시 → 배포 → 운영 확인 → 결과·라이브 링크 보고**(원칙 12). 폴더별 「Git push·배포 사전 승인」은 2026-10-16 폐지. 사전 승인은 파일·데이터 삭제, 환경변수·키 변경, 실제 메일·문자·카카오 발송, 유료 대량 호출만.
- **FREE 배지 = 「가입·로그인한 회원 누구나」(로그인 없는 공개 아님).** 주인님이 관리자 화면에서 수시로 켜고 끈다. 켜면 권한 없는 회원도, 끄면 구독·등급+사용기간 회원만. 로그인 없이 열리는 프로그램을 새로 만들지 않는다(`CLAUDE.md` 원칙 6).
- **상세 페이지 = 설명 → 핵심 특징 4 → 사용 순서 4 → 추천 활용 대상 3**, 전부 프로그램별 값(`programs.detail_sections`), 공통 문구 금지, 비슷한 프로그램끼리 같은 문장 금지(원칙 22, `PROGRAM_DESCRIPTION_STANDARD.md` §2-2).
- **새 프로그램 기획 전 `PROGRAM_CAPABILITY_MAP.md`를 읽고, 완성 후 같은 커밋에서 카드 갱신**(원칙 23).
- 외부 원본 참고 프로그램은 원본 이름을 프로그램·문서에 쓰지 않는다(커밋 메시지 이력에 남은 이름은 강제 푸시가 필요해 그대로 둠).

## 3. 운영 변경 기록
- DB: `programs.detail_sections jsonb` 추가(Codex Supabase 연결, `supabase/migrations/0035_programs_detail_sections.sql`). 82개 `features`·`steps`·`audiences` 입력. 입력 전 백업: `docs/program-descriptions/backup-detail-sections-before-audiences-2026-10-16.json`, 작성 원본 사본: `docs/program-descriptions/audiences-2026-10-16.json`.
- Vercel 환경변수: `mbti`(성격코드)에 공용 DB 연결값 3종, `mbti-character`(캐릭코드)에 `SUPABASE_SERVICE_ROLE_KEY` 등록(값 출력 없음, 스크립트 `mbti/scripts/configure-platform.mjs`, `mbti-character/scripts/add-service-role-env.mjs`).
- blog-workroom: 테이블 `blog_workroom_items`(RLS 4정책), 버킷 `blog-workroom`, programs 등록·요금제·VIP·썸네일, Vercel 프로젝트·도메인. 메인 계정에 시험 데이터가 남아 있음.

## 4. 남은 일
| 구분 | 내용 | 담당 |
|---|---|---|
| 확인 | 쓰레드 콘텐츠 자동화 실제 Meta 재연결 1회(B6) | 주인님 |
| 확인 | 네이버 블로그 자동화 App·Web 로그인 화면(관리자 계정, 비공개 프로그램) | 주인님 |
| 확인 | 실제 휴대폰으로 ☰ 메뉴 12개 프로그램(C1), 4컷 만화 터치(C3), AI 할 일 두 기기(C4 W06) | 주인님 |
| 선택 | 개발용 도구 취약점(B2), AI 글쓰기 에디터 편집 화면 모바일(C2 잔여), Step Mail 초안 편집기 화면(A1 잔여, 발송 없음) | 에이전트 |
| 대기 | `D:\PDS\ClearPic-1.3.0-setup.exe` 용도 지시 대기(분석 대상이면 REA, 원칙 21) | 주인님 |
| 환경 | 엣지 절전 예외 `buylife.xyz`(E1), PDS 4컷 시험 이미지 정리(E3), Fixie 비밀번호 재발급·시험 데이터 정리(선택) | 주인님 |
| 주의 | `document-translator`는 Codex 작업 중 — 손대지 않는다 | — |

전체 작업 목록: [`WORK_QUEUE_2026-10-15.md`](WORK_QUEUE_2026-10-15.md), 상세 페이지 작업 기록: [`HANDOFF_PROGRAM_DETAIL_PAGE_2026-10-16.md`](HANDOFF_PROGRAM_DETAIL_PAGE_2026-10-16.md).

## 5. 이 세션에서 겪은 주의 사항
- 루트 `docs/HANDOFF.md`·`ERROR_LESSONS.md`는 다른 CLI의 미커밋 수정이 섞여 있어 HEAD blob 방식(`git show HEAD:` → 삽입 → `hash-object -w` → `update-index --cacheinfo`)으로만 올렸다.
- 맥미니가 같은 저장소에 직접 커밋하므로 `.git/index.lock`이 있으면 지우지 말고 기다린다.
- 정적 페이지를 로그인 확인(동적)으로 바꿔 배포한 직후에는 옛 응답이 엣지 캐시에 남아 보일 수 있다 — 쿼리를 붙인 요청과 붙이지 않은 요청을 둘 다 확인(`ERROR_LESSONS.md` 2026-10-16).
- 성격코드·캐릭코드는 메인 SSO가 아닌 자체 로그인(vercel.app 주소)이라 로그인을 따로 해야 한다.
