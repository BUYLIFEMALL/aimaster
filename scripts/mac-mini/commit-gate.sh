#!/bin/zsh
# 맥미니(SMB 공유 저장소)에서 「내 파일만」 안전하게 커밋·푸시하는 절차 (2026-10-17 Claude Code 맥미니 세션에서 정리).
# 두 PC·여러 CLI가 같은 Git 인덱스를 함께 쓰기 때문에 다음을 지킨다.
#   1) 다른 CLI가 스테이징 중이거나 .git/index.lock 이 있으면 최대 5분 기다린다(잠금 파일은 절대 지우지 않음).
#   2) 그래도 남의 파일이 스테이징돼 있으면 중단한다.
#   3) 내 파일은 경로를 지정해 스테이징한다.
#   4) 공용 문서(DESIGN.md·docs/HANDOFF.md 등)는 작업 폴더 파일을 통째로 올리지 않고,
#      「HEAD 버전 + 내 변경」만 계산해 올린다(다른 CLI의 미커밋 줄이 섞이지 않게).
#      → 변경은 python 변환 스크립트(표준입력 → 표준출력)로 넘긴다. 같은 스크립트를 작업 폴더에도 적용해 둔다.
#
# 사용법:
#   scripts/mac-mini/commit-gate.sh -m "커밋 메시지" [-s 공용파일:변환스크립트.py ...] [--] 내파일1 내파일2 ...
# 예:
#   scripts/mac-mini/commit-gate.sh -m "feat(x): ... (v1.05)" -s DESIGN.md:/tmp/d14.py -s docs/ACTIVE_WORK.md:/tmp/aw.py -- x/src x/docs
# 주의: 맥에는 GNU timeout·sleep 사용이 막힐 수 있어 perl select 로 기다린다. zsh 에서는 `grep --include=*.tsx` 같은 글롭이 깨지니 따옴표로 감싼다.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
MSG=""; typeset -a SHARED; SHARED=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m) MSG="$2"; shift 2;;
    -s) SHARED+=("$2"); shift 2;;
    --) shift; break;;
    *) break;;
  esac
done
[[ -z "$MSG" ]] && { echo "커밋 메시지(-m)가 필요합니다."; exit 2; }
# 2026-10-23 저장소 대량 삭제 사고(c2e7c4db2) 재발 방지 — pull·커밋 전에 공용 스테이징이 쪼그라들었는지 먼저 본다(훅 check-index-health.mjs와 같은 기준: HEAD의 절반 미만).
IDX=$(git ls-files | wc -l | tr -d ' '); HEADN=$(git ls-tree -r --name-only HEAD | wc -l | tr -d ' ')
if (( HEADN > 200 && IDX * 2 < HEADN )); then
  echo "⛔ 중단: 공용 스테이징 파일 수 ${IDX}개가 HEAD ${HEADN}개의 절반보다 적습니다 — .git/index가 망가졌을 수 있습니다."
  echo "   pull·커밋·푸시하지 말고 주인님께 알리세요. index·index.lock을 지우거나 reset으로 고치지 않습니다(루트 CLAUDE.md 최상단)."
  exit 1
fi
git pull -q --ff-only || { echo "pull 실패 — 원격과 갈라졌는지 확인하세요."; exit 1; }
# 작업 폴더의 공용 문서에도 같은 변경을 적용(최신 HEAD 위에)
for pair in "${SHARED[@]}"; do f="${pair%%:*}"; sc="${pair#*:}"; python3 "$sc" < "$f" > "$f.gate.tmp" && mv "$f.gate.tmp" "$f" || { echo "작업 폴더 변환 실패: $f"; exit 1; }; done
for i in {1..60}; do
  [[ -z "$(git diff --cached --name-only)" && ! -e .git/index.lock ]] && break
  perl -e 'select(undef,undef,undef,5)'
done
if [[ -n "$(git diff --cached --name-only)" ]]; then echo "중단: 다른 CLI가 스테이징한 파일이 있습니다:"; git diff --cached --name-only; exit 1; fi
[[ $# -gt 0 ]] && { git add -A -- "$@" || exit 1; }
for pair in "${SHARED[@]}"; do
  f="${pair%%:*}"; sc="${pair#*:}"
  tmp=$(mktemp); git show "HEAD:$f" | python3 "$sc" > "$tmp" || { echo "HEAD 변환 실패: $f"; rm -f "$tmp"; exit 1; }
  git update-index --cacheinfo "100644,$(git hash-object -w "$tmp"),$f" || exit 1; rm -f "$tmp"
done
echo "== 커밋할 파일"; git diff --cached --name-status
git commit -q -m "$MSG" && git push -q origin master && git log --oneline -1
