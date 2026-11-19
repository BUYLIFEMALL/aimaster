---
name: work-start
description: AIMaster 저장소에서 프로그램 개발·수정·문서 작업을 시작하기 전에 하는 필수 점검. 관리자 지시 확인, 역할 파일, 다른 세션 점유·미커밋 변경, 인덱스 파일 수, 0번 규칙 고지를 순서대로 확인한다. 새 작업을 맡았을 때, 폴더를 처음 고치기 직전에 사용한다.
argument-hint: "<작업할 폴더> [역할 ID]"
---

# 작업 시작 점검

대상 폴더: `$0` · 역할 ID: `$1`(없으면 `unassigned`)

규칙 본문은 루트 `CLAUDE.md`에 있다. 이 스킬은 순서만 잡아 준다. 모든 안내 문장은 한국어 존댓말로 쓴다.

## 순서

1. **운영인지 Lab인지 정한다.** 폴더가 `labs/` 아래면 Lab(`docs/AIMASTER_DEV_LAB_GUIDELINES.md`), 아니면 운영이다. Lab 작업이면 운영 폴더·운영 DB는 읽기만 한다.
2. **관리자 지시를 먼저 본다.** `node scripts/dev-requests.mjs list --role <역할 ID>` (역할이 없으면 `list`). 대기 중인 지시·수정안·역할 메모는 절대 지시이므로 이번 작업보다 먼저 처리하거나 방향에 반영한다. 클라우드 세션처럼 DB 키가 없어 실패하면 실패했다고 보고에 적고 넘어간다.
3. **문서를 읽는다.** `docs/roles/<역할 ID>.md` → `docs/ACTIVE_WORK.md` → `docs/HANDOFF.md` 맨 위 → `docs/ERROR_LESSONS.md` 「A. 작업 전 점검 체크리스트」 → 대상 폴더의 `AGENTS.md`·`docs/IMPROVEMENTS.md`. 새 프로그램·병합이면 `docs/PROGRAM_CAPABILITY_MAP.md`와 `docs/CATEGORY_GUIDE_MAP.md`의 해당 줄도 읽는다.
4. **다른 세션과 겹치는지 본다.**
   - `git status --porcelain -- <폴더>` — 이미 수정 표시가 있으면 남의 미커밋 작업이다. 시작하지 않고 주인님께 알린다.
   - `docs/ACTIVE_WORK.md`에 그 폴더 줄이 있으면 시작하지 않는다.
   - `git log --oneline -5 -- <폴더>`
5. **인덱스가 정상인지 본다.** `git ls-files | wc -l`과 `git ls-tree -r HEAD --name-only | wc -l`이 비슷해야 한다. 절반 아래면 멈추고 알린다(직접 고치지 않는다).
6. **0번 규칙 고지를 확인한다.** `node scripts/apply-source-notice.mjs --check <폴더>`. 빠졌으면 같은 작업 안에서 `node scripts/apply-source-notice.mjs <폴더>`로 보완한다.
7. **작업 중 표에 내 줄을 넣는다.** `docs/ACTIVE_WORK.md`에 폴더·`[역할: <ID>]` 에이전트(장비)·시작 시각·작업을 적는다(공용 문서이므로 `/aimaster-dev:safe-commit` 절차).
8. **개발 플랜을 먼저 보여 드린다.** 문제·범위·구현 순서·검수 방법·비용(없으면 「없음」)·버전/배포·인수인계 산출물. 비용이 생기는 단계가 있으면 승인을 받은 뒤 진행한다.

## 보고 형식

점검 결과를 표 하나로 보고한다: 항목 / 결과 / 조치. 막힌 항목이 있으면 작업을 시작하지 않는다.
