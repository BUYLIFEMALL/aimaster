# tistory-auto-blog — 티스토리 자동화 (BLOG 원문생성 + 크롬 확장)

> **상태: 기획·조사 단계 (2026-10-01, 클라우드 세션 `cloud-work`)** — 아직 `programs` 등록·배포 전. 버전은 서브프로젝트 완성 시 `v1.01`로 시작.
> 반드시 루트 `../CLAUDE.md`(핵심 원칙 7가지)·`../docs/HANDOFF.md`·`../docs/ERROR_LESSONS.md`를 먼저 읽고, 브라우저 자동화이므로
> `../docs/PLATFORM_PATTERNS.md` **§20(봇 탐지 회피)·§28(웹→확장→편집기)** 를 그대로 지킨다.

## 개요
- 티스토리 Open API는 2024-02 종료(글쓰기 API 없음) → `ai-auto-blog`(https://ai-auto-blog-one.vercel.app)와 같은 방식:
  **웹에서 글 생성 → 크롬 확장이 티스토리 글쓰기 화면에 사람처럼 입력 → 마지막 발행은 사람.**
- 상세 계획·결정사항·단계: [`docs/TISTORY_PLAN.md`](docs/TISTORY_PLAN.md)

## 진행 상태
| 단계 | 내용 | 상태 |
|---|---|---|
| 0 | 티스토리 화면 조사 도구 `inspector-extension/` | ✅ 코드 완성(2026-10-01). **주인님 PC에서 실행 → JSON 결과 전달 대기** |
| 1 | `ai-auto-blog` 복제 → 서브프로젝트 뼈대 | ⏳ 결정 확인 후 |
| 2 | DB 마이그레이션 파일(적용은 로컬·승인 후) | ⏳ |
| 3 | 서버 변환기(티스토리용 입력 블록) | ⏳ 조사 결과 필요 |
| 4 | 확장 편집기 조작 코드 | ⏳ 조사 결과 필요 |
| 5 | 설정 화면·연동 매뉴얼 | ⏳ |
| 6 | 빌드·배포·`programs` 등록(로컬) | ⏳ |

## 주의
- 셀렉터는 `inspector-extension` 결과로 **확인된 것만** 쓴다. 후보가 여러 개면 조용히 고르지 말고 오류로 멈춘다.
- 클라우드에서는 DB 적용·버전 DB 갱신·`vercel deploy`·`programs` 등록을 하지 않는다(`../docs/CLOUD_SESSION.md`).

## 로컬에서 이어서 작업할 때
이어가기 절차(병합 → 조사 실행 → 단계별 진행)와 로컬에서만 할 수 있는 일(DB 적용·`programs` 등록·배포)은
[`docs/TISTORY_PLAN.md`](docs/TISTORY_PLAN.md) **§6**에 정리돼 있다. 가장 먼저 할 일은 주인님 PC에서 `inspector-extension/` 실행 후 JSON 결과 확보.

