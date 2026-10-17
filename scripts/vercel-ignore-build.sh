#!/bin/bash
# 메인 사이트(aimaster) Vercel "Ignored Build Step" — 루트 vercel.json의 ignoreCommand가 실행한다(2026-10-18, docs/VERCEL_COST_REDUCTION_PLAN.md B1·B2).
# 종료 코드: 0 = 빌드 건너뜀, 1 = 빌드 진행.
# 이 저장소는 모든 CLI가 서브프로그램을 고칠 때마다 master에 푸시하는데, 메인 사이트는 루트 app·components·lib·types 등만 쓴다.
# 그래서 메인 사이트 파일이 안 바뀐 푸시는 빌드하지 않는다. 판단이 애매하면 항상 빌드한다(안전 쪽).

# CLI 업로드 배포(vercel deploy)처럼 git 정보가 없으면 빌드
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "git 저장소가 아님(CLI 배포) → 빌드"; exit 1
fi

# master가 아닌 브랜치(cloud-work 등)의 미리보기는 건너뜀 — 클라우드 세션은 배포하지 않는 규칙(docs/CLOUD_SESSION.md)
if [ -n "$VERCEL_GIT_COMMIT_REF" ] && [ "$VERCEL_GIT_COMMIT_REF" != "master" ]; then
  echo "master가 아닌 브랜치($VERCEL_GIT_COMMIT_REF) → 빌드 건너뜀"; exit 0
fi

# 메인 사이트 빌드에 영향을 주는 경로(서브프로그램 폴더는 메인 사이트가 가져다 쓰지 않음 — 2026-10-18 확인)
PATHS="app components lib types public pages middleware.ts next.config.mjs package.json package-lock.json tailwind.config.ts postcss.config.mjs postcss.config.js tsconfig.json next-env.d.ts vercel.json scripts/vercel-ignore-build.sh"

# 비교 기준: 직전 성공 배포 커밋. 얕은 복제라 없으면, 복제된 범위의 가장 오래된 커밋부터 비교(그 범위 안의 메인 사이트 변경은 모두 잡음)
BASE="$VERCEL_GIT_PREVIOUS_SHA"
if [ -z "$BASE" ] || ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  BASE=$(git rev-list --max-parents=0 HEAD 2>/dev/null | tail -1)
  [ -z "$BASE" ] && { echo "비교 기준 없음 → 빌드"; exit 1; }
  echo "직전 배포 커밋을 찾지 못해 복제 범위의 첫 커밋($BASE)부터 비교"
fi

if git diff --quiet "$BASE" HEAD -- $PATHS; then
  echo "메인 사이트 파일 변경 없음($BASE..HEAD) → 빌드 건너뜀"; exit 0
fi
echo "메인 사이트 파일 변경 있음 → 빌드"; exit 1
