# 클라우드 세션 작업 규칙 (Claude Code on the web 등)

> 2026-10-01 주인님 지시: "클라우드 세션 크레딧으로 작업해 보려 한다. 원래 하던(로컬) 작업과 섞이면 안 되니 분리하되,
> 로컬에서 쓰던 환경·로직·지침은 그대로 이어서 작업되게."
> 이 문서는 **클라우드 세션에서 작업할 때만** 추가로 지키는 규칙이다. 나머지는 로컬과 똑같이 루트 `CLAUDE.md`(핵심 원칙 7가지)·
> `AGENTS.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`·각 서브프로젝트 `AGENTS.md`를 그대로 따른다.

## 1. 시작할 때

1. **브랜치 확인: 반드시 `cloud-work`에서 작업한다.** `git branch --show-current`가 `cloud-work`가 아니면
   `git fetch origin && git checkout cloud-work`(없으면 `git checkout -b cloud-work origin/cloud-work`)로 옮긴다.
2. 로컬 쪽 최신 작업을 먼저 받는다: `git fetch origin && git merge origin/master` — 로컬(master)에서 그사이 바뀐 지침·코드를 이어받기 위해.
   충돌이 나면 **master 쪽 내용을 기준**으로 정리하고, 애매하면 주인님께 묻는다.
3. 루트 `PROGRESS.md` → `docs/HANDOFF.md` → `docs/ERROR_LESSONS.md` → 고칠 서브프로젝트 `AGENTS.md` 순서로 읽는다.
4. 서브프로젝트를 빌드하려면 그 폴더에서 먼저 `npm ci`(또는 `npm install`)를 한다 — 클라우드에는 `node_modules`가 없다.

## 2. 작업 중

- **커밋·푸시는 `cloud-work`에만.** `git push origin cloud-work`. **`master`에 직접 푸시·병합하지 않는다**(로컬 작업과 섞이지 않게).
- `git add`는 내 파일만 경로를 지정해서(`git add .` 금지 — 로컬 규칙과 같음).
- 작업 세트(빌드 → 커밋 → 푸시 → 문서)는 로컬과 같다. **단, 배포·DB 변경은 클라우드에서 하지 않는다**(아래 3번).
- 커밋 메시지는 로컬과 같은 형식(`feat(ai-auto-blog): … `) + 끝에 `[cloud]`를 붙여 클라우드 작업임을 표시한다.
- 에러를 해결했거나 점검 사항을 찾으면 `docs/ERROR_LESSONS.md`에 같은 커밋으로 기록(핵심 원칙 7번) — 클라우드에서 찾은 것은 항목에 "(cloud)"를 붙인다.

## 3. 클라우드에서 하지 않는 것 (로컬에서 합칠 때 한다)

| 하지 않는 것 | 이유 | 대신 |
|---|---|---|
| `vercel deploy` | Vercel 토큰·프로젝트 연결(`.vercel/`)이 클라우드에 없다 | 로컬에서 합친 뒤 배포 |
| **버전 올리기**(`APP_VERSION`, DB `programs.version`) | 로컬도 계속 버전을 올려서 같은 숫자로 충돌한다 | 커밋에 "버전 미변경 — 로컬 병합 때 올림"이라 적고, `PROGRESS.md` 3번 표에 남긴다 |
| DB 구조 변경·데이터 수정·운영 API 호출 | 서비스 키(`.env.local`)가 없고, 운영 데이터는 로컬에서만 다룬다 | 마이그레이션 SQL은 서브프로젝트 `supabase/migrations/`에 **파일로만** 만들어 두고 적용은 로컬에서(주인님 승인 후) |
| 비밀값 입력·기록 | 클라우드 세션 기록에 남는다 | 필요하면 주인님께 로컬에서 처리해 달라고 한다 |
| `D:\PDS` 스크린샷 찾기, 크롬 확장·네이버 화면 테스트 | 로컬 PC 전용 | 주인님께 이미지 첨부·로컬 테스트 요청 |

- Supabase MCP 같은 연결 도구가 클라우드에서도 보이면 **조회(읽기)만** 한다. 쓰기는 로컬 규칙대로 주인님 승인 후 로컬에서.
- `ai-auto-blog`는 `npm run build`의 `prebuild`가 확장 `manifest.json`·ZIP을 버전에 맞춰 다시 만든다 — 클라우드에서는 버전을 안 올리므로
  빌드 후 `extension/manifest.json`이나 `public/downloads/*.zip`이 바뀌어 있으면 **커밋하지 말고 되돌린다**(`git checkout -- <파일>`).

## 4. 작업을 마칠 때

1. `cloud-work`에 커밋·푸시가 다 됐는지 확인(`git status`, `git log origin/cloud-work -3`).
2. 루트 `PROGRESS.md`의 **"5. 클라우드 세션 작업 기록"** 표에 한 줄씩 추가: 날짜 · 서브프로젝트 · 무엇을 했나 · 로컬에서 할 일(버전 올리기·배포·DB 적용 등).
3. 주인님께 "로컬에서 병합·배포가 필요합니다"라고 알린다.

## 5. 로컬에서 합치는 방법 (로컬 세션이 할 일)

```bash
git fetch origin
git status                         # 로컬에 커밋 안 된 변경이 없는지(다른 CLI 작업 포함) 먼저 확인
git merge --no-ff origin/cloud-work -m "merge: cloud-work"   # master에서 실행
# 충돌 시: master(로컬) 기준으로 정리, 애매하면 주인님께 확인
# 바뀐 서브프로젝트마다: 버전 +0.01(코드+DB) → npm run build → 커밋 → git push origin master → vercel deploy --prod --yes --scope buylife
git push origin master:cloud-work  # 합친 결과를 cloud-work에도 맞춰 둔다(다음 클라우드 작업이 최신에서 시작)
```
- 합친 뒤 `PROGRESS.md` 5번 표의 해당 줄에 "로컬 병합·배포 완료(커밋 해시, 버전)"를 적는다.
