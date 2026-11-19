---
name: safe-commit
description: AIMaster 저장소에서 커밋·푸시할 때 쓰는 절차. 여러 세션이 같은 git 스테이징을 함께 쓰므로 일반 파일은 commit-paths.mjs, 공용 문서는 safe-commit.mjs로 내 변경만 커밋하고, 커밋 전후 파일 수와 섞인 줄을 확인한다. 커밋하거나 푸시하기 직전에 사용한다.
argument-hint: "<커밋할 경로...>"
---

# 안전 커밋

커밋할 경로: `$ARGUMENTS`

## 1. 커밋 전

1. 파일 수 확인: `git ls-files | wc -l` 과 `git ls-tree -r HEAD --name-only | wc -l`. 스테이징이 절반 아래이거나 `git status`에 삭제가 수천 줄이면 **멈추고 주인님께 알린다.**
2. 잠금 확인: `.git/index.lock`·`.git/safe-commit-index.lock`이 있으면 지우지 않고 기다린다.
3. 파일마다 `git diff -- <파일>`을 열어 **내가 쓰지 않은 줄**이 있는지 본다. 있으면 그 파일은 커밋하지 않고 주인 세션에 알린다.
4. 새 파일을 불러오는 줄은 그 새 파일과 같은 커밋에 넣는다.

## 2. 커밋

| 대상 | 명령 |
|---|---|
| 일반 파일·폴더 | `node scripts/commit-paths.mjs "<메시지>" <경로>... --as <세션> [--push]` |
| 공용 문서(`docs/HANDOFF.md`·`PENDING_DEPLOYS.md`·`PROGRAM_CAPABILITY_MAP.md`·`SHARED_MODULES.md`·`PROGRAM_IDEA_BACKLOG.md`·`ERROR_LESSONS.md`·`ACTIVE_WORK.md`·`CLAUDE.md`·`AGENTS.md`·`GEMINI.md`·`DESIGN.md`) | 고치기 전 `node scripts/safe-commit.mjs --begin <파일>... --as <세션>` → 고침 → `node scripts/safe-commit.mjs "<메시지>" <파일>... --as <세션> [--push]` |
| HANDOFF 맨 위 항목 하나 | `node scripts/safe-commit.mjs --handoff <항목.md> "<메시지>" --as <세션> [--push]` |

- 쓰지 않는 것: 경로 없는 `git commit`, `git commit -a`, `git add -A`, `git add .`, `--no-verify`, `git reset --hard`, `git stash`, `git checkout .`, force-push.
- 커밋 메시지에 프로그램과 버전을 적는다(예: `feat(threads): … (v1.02)`). 미배포 커밋은 버전을 올리지 않는다.
- 클라우드 세션은 지정된 브랜치에만 푸시하고 메시지 끝에 `[cloud]`를 붙인다.

## 3. 커밋 뒤

1. `git show --stat HEAD | tail -1` — 바뀐 파일 수가 내가 고친 수와 같은지, 삭제가 많지 않은지 본다. 다르면 푸시하지 않는다.
2. 도우미가 「사본으로 되돌렸습니다」·「줄었는데 되돌리지 못했습니다」를 출력하면 멈추고 알린다.
3. 푸시는 작업 단위로 모아서 한 번 한다(푸시마다 메인 사이트 빌드 자리를 쓴다).
4. Admin PC·맥미니는 커밋할 때마다 파일 수를 다시 확인한다.
