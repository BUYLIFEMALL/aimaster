---
name: work-finish
description: AIMaster 작업을 마칠 때(완료·중단·이관 모두) 하는 마무리 절차. 문서·비교표·역할 파일 갱신, 인수인계, 요청함 결과 기록, 작업 중 표 정리, 채팅 결과 보고 형식을 순서대로 처리한다. 작업이 끝났다고 보고하기 직전에 사용한다.
argument-hint: "<프로그램 폴더> [역할 ID]"
---

# 작업 마무리

대상: `$0` · 역할 ID: `$1`(없으면 `미지정`)

## 1. 문서 갱신 (커밋 전에)

- 프로그램 폴더: `AGENTS.md`·`README.md`(버전·변경 기록), `docs/IMPROVEMENTS.md`(발견한 개선사항, 미배포면 「미배포 대기: 무엇·커밋」), 필요하면 `docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`.
- 기능·장단점이 바뀌었으면 `docs/PROGRAM_CAPABILITY_MAP.md`의 목록 표와 카드. 블로그면 `docs/BLOG_FEATURE_MATRIX.md`.
- 에러를 해결했거나 점검 사항을 찾았으면 `docs/ERROR_LESSONS.md`.
- 내 역할 파일 `docs/roles/<역할 ID>.md`: 지금 하는 일 / 대기 / 최근 완료 / 다음 첫 단계 / 주인님께 여쭐 것 / 마지막 갱신.
- 루트 `docs/HANDOFF.md` 맨 위 항목(제목에 `[역할: <ID>]`, 장비·에이전트): 한 일·바뀐 파일·커밋/배포·확인한 것과 못 한 것·남은 일과 다음 첫 단계·프로그램 링크.
- 문서를 새로 만들거나 지웠으면 `node scripts/build-dev-docs-manifest.mjs`.
- `docs/ACTIVE_WORK.md`에서 내 줄을 지운다.

커밋은 `/aimaster-dev:safe-commit` 절차로 한다.

## 2. 요청함 기록

- 결과: `node scripts/dev-requests.mjs report --title "<맡긴 일>" --summary "<한 일·검수·남은 일>" --as <세션> [--link <주소>] [--commit <해시>] [--cost "<비용>"]`
- 주인님이 해 주실 일이 있으면: `node scripts/dev-requests.mjs ask --category <approval|cost|account|db|install|check|external|etc> --title "…" --note "…" --as <세션>`
- 채팅으로 이미 승인·처리된 내 항목은 `asks`로 찾아 `done <id>`로 닫는다.
- 비밀번호·키 값은 적지 않는다. 실행하지 못했으면(키 없음 등) 그렇다고 보고한다.

## 3. 채팅 결과 보고

요청함에 올린 내용도 채팅에 빠짐없이 적는다. 동그라미 숫자는 쓰지 않는다. 확인하지 않은 것을 완료로 적지 않는다.

1. 변경 내용
2. 검수 결과(자동 검사 / 실제 화면 / 운영 배포를 구분, 못 한 것 포함)
3. 커밋 번호·푸시 결과
4. 배포: 완료 또는 「미배포 대기(사유)」 · 프로그램 버전
5. 0번 규칙 고지: 확인·보완함
6. 비용 리포트(항목·횟수·계정·대략 금액, 없으면 「비용 없음」)
7. 추가개선 제안 — 로직·기능 / UI·사용 편의 / 다른 프로그램과 연계
8. 남은 작업(없으면 「없음」)과 🙋 해 주실 일
9. 프로그램 링크 — 클릭되는 단독 줄
