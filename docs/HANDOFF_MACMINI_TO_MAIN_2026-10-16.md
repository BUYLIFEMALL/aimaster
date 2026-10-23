# 맥미니 → 메인 PC 작업 인계 (2026-10-15~16 맥미니 세션)

> 맥미니(Claude Code 보조 계정)에서 한 작업 중 **메인 PC(윈도우)에서 이어서 해야 할 일**을 한곳에 모았다. 처리하면 줄을 지우지 말고 상태를 "완료(날짜·커밋)"로 바꾼다.
> 맥미니 작업 규칙: [`MAC_MINI_WORK_GUIDE.md`](MAC_MINI_WORK_GUIDE.md) — 맥미니는 편집·분석·브라우저 검수·지정 파일 git만, `npm`·빌드·배포는 메인 PC에 요청.

## 1. 메인 PC에서 할 일 (우선순위 순)
| # | 작업 | 할 일 | 근거 문서 | 상태 |
|---|---|---|---|---|
| M1 | **참고 원본 설치 파일 분석 이어가기** | ① 주인님께 권리·용도 확인 ② `innounp` 최신판(Inno Setup 6.7 지원)으로 **실행 없이** `D:\PDS\blog_workroom_reference\`에 해제 ③ 본체 종류 판별(DIE) → REA·ILSpy·Ghidra 분석 ④ 분석 문서·웹 재구현 플랜 작성 → 주인님 보고 | [`HANDOFF_BLOG_WORKROOM_REFERENCE_2026-10-15.md`](HANDOFF_BLOG_WORKROOM_REFERENCE_2026-10-15.md) | 대기 |
| M2 | 새로 등록된 프로그램 설명을 표준 형식으로 | `blog-workroom`(`<h2>` 사용)과 2026-10-16 등록된 `blog-content-maker` 등 새 프로그램의 `programs.description`·`short_desc`를 표준에 맞게 다시 쓰기(DB만 변경, 맥미니에서도 가능) | [`PROGRAM_DESCRIPTION_STANDARD.md`](PROGRAM_DESCRIPTION_STANDARD.md) | 대기 |
| M3 | 앞으로 등록하는 프로그램 설명 | 새 프로그램 등록 때 `CLAUDE.md` 체크리스트 (10)·`AGENTS.md` 10번대로 표준 형식 적용 | 같은 문서 | 상시 |
| M4 | 공개 상세 페이지 단락 간격 눈으로 확인 | 루트 사이트에 `[&_p]:my-2`가 **이미 배포됨**(2026-10-16 맥미니에서 CSS `margin .5rem` 확인). 몇 개 프로그램 `/programs/<slug>`에서 0.5줄 간격으로 보이는지만 확인 | [`PROGRAM_DESCRIPTIONS_2026-10-15.md`](PROGRAM_DESCRIPTIONS_2026-10-15.md) | 확인만 남음 |

## 2. 주인님 결정이 필요한 것
| # | 내용 | 근거 |
|---|---|---|
| D1 | **성격코드(`personality-code`, 폴더 `mbti/`)가 로그인 없이 열림** — 핵심 원칙 0·6번(비로그인 사용 불가, FREE는 가입 회원 대상)과 충돌. 코드를 로그인·FREE 판정 구조로 바꿀지, 예외로 둘지 | `PROGRAM_DESCRIPTIONS_2026-10-15.md` |
| D2 | 참고 원본 프로그램의 권리 관계(남의 상용 프로그램인지)·용도 | `HANDOFF_BLOG_WORKROOM_REFERENCE_2026-10-15.md` |
| D3 | 기능이 단순한 프로그램 설명(300자 안팎)을 더 늘릴지 / 프로그램 이름 표기 통일(`Website Scraper`·`eBook Studio`·`YOUTUBE VIRAL FINDER`·`상세페이지 자동생성기 v1` 등) | `PROGRAM_DESCRIPTIONS_2026-10-15.md` |

## 3. 이번 맥미니 세션에서 끝난 것(참고)
| 작업 | 결과 | 커밋 |
|---|---|---|
| 맥미니 작업 지침(경로 변환·브라우저·git 허용·윈도우 요청 표) | `MAC_MINI_WORK_GUIDE.md` | `e2c10190`·`53786672`·`b2d43f46` |
| B1 Step Mail Next 16 이전 | 맥미니 코드 수정 → 메인 PC 설치·검증·배포 완료(v1.09, 운영 취약점 0) | `0834c451` |
| 프로그램 상세 설명 80개 재작성 | DB 반영, 빈 줄 단락 제거, 공개 페이지 CSS `[&_p]:my-2` | `7b1d73a1`·`c14dbdcf`·`a292c8c7` |
| 설명 작성 표준 문서화 | `PROGRAM_DESCRIPTION_STANDARD.md` + `CLAUDE.md`(10)·`AGENTS.md` 10번 연결 | `71f25e5a` |
| `HANDOFF.md` 중복 제목 줄 제거 | 656번째 줄 중복 제목 삭제 | `b2d43f46` |

## 4. 예전 작업 목록에서 계속 남아 있는 것
- [`WORK_QUEUE_2026-10-15.md`](WORK_QUEUE_2026-10-15.md) 기준: B2 개발용 도구 취약점(선택), D2 4컷 만화 추가 기능(지시 시), A1 Step Mail 초안 편집기·C2 ai-writing-editor 편집 화면(자료 필요), 주인님 확인 C1·C3 휴대폰·C4 W06 두 번째 기기·B6 Threads 재연결·네이버 App/Web 관리자 화면·E1 엣지 절전 예외·E3 `D:\PDS` 시험 이미지 정리.

## 5. 맥미니 쪽 메모
- 맥미니에 `innoextract`(Homebrew)를 설치했다. Inno Setup 6.7을 지원하지 않아 쓸모가 없으면 맥미니에서 `brew uninstall innoextract`.
- 맥미니 크롬은 buylife.xyz에 로그인되어 있지 않다 — 관리자 화면 검수를 맥미니에 맡기려면 맥미니 크롬에서 한 번 로그인해 둔다.
