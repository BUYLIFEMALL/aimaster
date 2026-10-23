# AI 문서 챗봇 자동화 — 핵심 인수인계 요약 (2026-10-19, Claude Code 윈도우)

> 이 문서 하나로 현재 상태와 다음 할 일을 파악할 수 있게 정리했다. 날짜순 상세 기록은 `IMPROVEMENT_HANDOFF_20261019.md`, 항목별 상태는 `IMPROVEMENTS.md`, 구조·API 표는 `../AGENTS.md`.

- 라이브: https://ai-doc-chatbot.buylife.xyz · 메인 상세: https://www.buylife.xyz/programs/ai-doc-chatbot
- **현재 버전 v1.06**(코드 `src/lib/version.ts` = DB `programs.version`), 마지막 배포 `ai-doc-chatbot-5dd7m7txa`(Ready)
- ① AIMaster 운영 프로그램 — 운영 DB ref `esgxyikcnnvmlhygjkth`(Lab 아님)

## 1. 한 줄 요약
회원이 올린 본인 문서(PDF·DOCX·HWP·이미지 등, 50MB·2,000쪽까지)에서 근거를 찾고, 최신 정보가 필요하면 웹(Tavily)까지 찾아 **출처와 함께** 답하는 챗봇. 키는 회원 본인 Upstage(필수)·Tavily(선택), 대화·문서는 30일 뒤 자동 삭제.

## 2. 오늘 한 일 (버전별)
| 버전·커밋 | 내용 |
|---|---|
| v1.01 `859a7923` | 첫 개발·배포·메인 등록(요금 3단계, VIP 자동 부여), 키 발급 매뉴얼 2개 |
| `ceb31517` | **키 저장 오류 해결** — 공용 `user_api_keys_provider_check`에 `upstage`·`tavily` 없음 → `0003`(현재 목록 읽어 두 값만 추가) 주인님 SQL 실행. 실호출 검수 시작 |
| v1.02~v1.03 `2efe2ebd` | 답변 마크다운 표시, 오늘 날짜·Tavily 뉴스/기간 조건, 문서로 답할 수 있으면 웹 검색 생략, 관련도 기준 0.4, 물결표(「2026~2030년」) 취소선 버그 수정 |
| 썸네일 `5f1746cf` | §13 기준 실사 썸네일 생성·등록 |
| v1.04 `137d1a56` | 중복 업로드 409, 업로드 진행 단계, 출처 근거 펼치기, 대화 검색·이름 바꾸기, 답변 복사·다시 생성, 「이 문서로 질문」, Tavily 경로 기록 |
| v1.05 `1d202375` | 4MB 초과(50MB까지) Storage 경유 업로드, 100쪽 초과 PDF 비동기 읽기, 벡터+키워드 혼합 검색, 요약 질문 처리 |
| `dd1ec5b2` | RAG 엔진 레퍼런스 모듈 후보 **R-19** 등록, 연계(C1~C3) 검토, 메인 FAQ 점검(코드 변경 불필요) |
| v1.06 `05124df9` | 출처 오탐 축소, 문서당 1,000조각·회원당 5,000조각, 대화 고정, 큰 문서 예상 남은 시간, 문서별 마지막 사용, 웹 검색 경로 통계 |
| `4748ac84` | 대화 고정 DB 칸(`0007`) 주인님 실행 → 고정·해제 실검수 |

## 3. 지금 구조 핵심
- **문서 저장**: 읽기 → 800자 조각(120자 겹침) → Upstage `solar-embedding-2-passage`(1024차원) → `dcb_chunks`. 원본 파일은 보관하지 않음. 처리 공통 함수 `src/lib/chat/ingest.ts`.
  - 4MB 이하: 화면이 바로 전송 / 4MB 초과: `POST /api/documents/upload-url` → 비공개 버킷 `dcb-uploads`에 서명 주소로 업로드 → 서버가 읽고 **즉시 삭제**(1시간 지난 잔여 파일은 다음 발급 때 정리).
  - 100쪽 초과 PDF: 동기 읽기 413 → Upstage 비동기 요청 → 화면이 `POST /api/documents/async`를 20초마다 호출(진행 번호는 localStorage `dcb-pending-parses`) → 완료 시 저장 후 Upstage 결과 DELETE. 비동기는 공식 최대 72시간이라 서버에서 기다리지 않는다.
- **답변**: 질문 임베딩 → `dcb_match_chunks` 벡터 상위 10 + 키워드 ilike 30 → `mergeHybrid`(유사도 + 키워드 가점, 기준 0.4, 1위보다 0.15 낮으면 제외) → 라우터(`solar-mini4`)가 찾은 문서 내용을 보고 웹 검색 필요 여부·뉴스/기간 판단 → Tavily(MCP, 실패 시 REST) → `solar-pro4` 스트리밍. 지시문에 한국 시간 오늘 날짜.
- **순수 로직은 `src/lib/chat/core.ts`에 모아 테스트 33개로 고정**(`npm test`). 서버 전용 호출은 `upstage.ts`·`tavily.ts`, 업로드 검사 `uploadChecks.ts`, Storage `uploads.ts`.
- **권한**: 모든 화면·API는 `requireProgramAccess()`/`checkProgramAccessApi()` + `force-dynamic`·`force-no-store`. 키는 회원 본인 것만(없으면 등록 안내, 다른 키로 대신 안 함).

## 4. 운영 상태 (DB·저장소)
| 대상 | 상태 | 기록 |
|---|---|---|
| 표 `dcb_rooms`(+`pinned`)·`dcb_messages`·`dcb_documents`·`dcb_chunks`, 함수 `dcb_match_chunks`, cron `dcb-retention-30d` | 적용됨 | `0001`, `0007` |
| 공용 `user_api_keys_provider_check`에 `upstage`·`tavily` | 적용됨 | `0003` |
| Storage 비공개 버킷 `dcb-uploads`(50MB, 공개 정책 없음) | 적용됨 | `0006` |
| `programs` 등록·버전 v1.06, 썸네일 `program-images/catalog/ai-doc-chatbot-thumbnail.jpg` | 적용됨 | `0002`, `0004~0007` |
| 매뉴얼 `platform_guides` Upstage `38d1ac20…`·Tavily `e02892df…` | 공개(`/guides`에 표시 확인) | — |

**운영 SQL 실행 방법**: 이 세션의 Supabase MCP는 Lab DB만 가리키고 Supabase CLI 로그인도 없다. 표 구조 변경(DDL)은 주인님이 SQL Editor(https://supabase.com/dashboard/project/esgxyikcnnvmlhygjkth/sql/new)에서 실행했다. 데이터 쓰기·버전 갱신·버킷 생성은 루트 `.env.local` 서버 키 REST로 했다(URL에 운영 ref가 아니면 중단).

## 5. 검수 증거 (크롬 실제 화면, 주인님 관리자 계정 본인 키)
- 업로드: TXT·1쪽 PDF·4.3MB TXT(Storage 경유, 남은 원본 0개)·**101쪽 PDF(비동기, 57쪽에만 있는 사실 질문 정답)**.
- 질문: 사내 규정(문서 2개 근거·웹 검색 생략), 「이번 주 AI 뉴스」(10월 19일 기준 기사), 모델명 질문(혼합 검색 0.75), 요약 질문, 「이 문서만」 요약(관련도 0.31도 정답).
- 화면: 마크다운·취소선 0개, 출처 근거 펼침, 다시 생성(방에 질문·답변 1쌍만 남음), 이름 바꾸기·검색, 고정·해제, 마지막 사용, 웹 통계, 중복 409.
- 자동: 테스트 33/33, `tsc`, `npm run build`.

## 6. 비용 사용 기록
- Upstage(주인님 키): 비동기 문서 읽기 101쪽 1회(약 1,000~1,500원) + 1쪽 PDF 1회, 임베딩·답변 각 10여 회.
- Tavily: 검색 4회 안팎. 썸네일: `gemini-3-pro-image-preview` 1회(관리자 키).
- Vercel 배포: v1.01~v1.06 총 7회(한 번에 하나씩 순차).

## 7. 남은 일·다음 첫 단계
| 항목 | 상태 | 다음 첫 단계 |
|---|---|---|
| L15 관련도 기준 재점검 | 실데이터 부족(회원 1명·답변 8개)으로 0.4 유지 | 회원 답변 100개 이상 쌓이면 `dcb_messages.sources[].score` 분포 집계 → 기준·상대 차(0.15) 조정 |
| C1·C2 원클릭 연계(번역기·eBook → 챗봇) | 보류 — 프로그램 간 호출 금지 원칙 | 필요하면 주인님 결정 후 공용 「회원 문서함」 설계(지금은 파일 다운로드→업로드로 연계 가능) |
| C4 RAG 레퍼런스 모듈 R-19 | 후보 등록만 | 두 번째 사용 프로그램이 생길 때 그 작업에서 사본 적용·접두사 분리 |
| 시험 데이터 | 관리자 계정 문서 5개·대화 7개 | 30일 뒤 자동 삭제(필요하면 화면에서 삭제) |

## 8. 이번 작업에서 얻은 교훈 (`docs/ERROR_LESSONS.md`에도 기록)
1. 새 키 종류(provider)를 쓰는 프로그램은 배포 전에 공용 `user_api_keys_provider_check` 목록을 확인한다. 고정 목록을 통째로 다시 쓰지 말고 현재 목록을 읽어 추가한다.
2. `remark-gfm` 기본값은 물결표 하나도 취소선 → 한국어 답변은 `singleTilde: false`.
3. 외부 비동기 API는 최대 처리 시간을 먼저 확인하고 Vercel 함수(300초) 안에서 기다리지 않는다. `route.ts`에는 HTTP 함수만 export.
4. 테스트가 실제 버그를 잡았다(「39,000원」 쪼개짐, 상대 기준이 키워드 조각까지 지움) — 순수 로직은 테스트로 고정하고 바꾼다.
5. 진행 안내가 여러 번 영어로 흐트러져 주인님이 지적함 — 도구 결과 직후 첫 문장을 한국어로 시작하는지 매번 확인.
