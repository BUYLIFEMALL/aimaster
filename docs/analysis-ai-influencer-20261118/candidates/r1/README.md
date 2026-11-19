# R1 공용 연결점 — 로컬 후보 2판(미적용)

- 상태: **후보**. 공용 기준 파일·사본·`--sync`·DB·제품 코드 변경 0. 이 폴더는 문서 폴더이며 어느 프로그램의 빌드·`npm test`에도 들어가지 않는다.
- 설계: `ai-influencer-studio/docs/PLAN_20261119_R1_SCHEDULER_DEFAULT.md` §9~§11. 배정: Master `msg_e22a2892cbd5`(1판) · `msg_73e81c2e0a4e`(2판 — 관리자 허용과 회원의 명시 선택 분리, 실패·경합 시험).
- `r1-shared-hook.patch`: 기준 3파일에 대한 패치(저장소 뿌리 기준 경로).
  - `insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts` (기준 커밋 237741cc3)
  - `ai-webtoon-studio/src/lib/instagram/posting.ts` (기준 커밋 237741cc3)
  - `ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts` (기준 커밋 237741cc3)
- `test/`: 모의 시험 23개(`r1.test.mjs`)와 변형 검사 41종(`mutate.cjs`). 실제 DB·cron-job.org·인스타·Next 서버를 쓰지 않는다.

## 다시 돌리는 법(저장소 밖 빈 폴더에서)

```bash
W=<저장소 밖 새 빈 폴더>; R=<저장소 뿌리>; F="insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts ai-webtoon-studio/src/lib/instagram/posting.ts ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts"
mkdir -p "$W/orig" && cd "$R"
git archive HEAD $F | tar -x -C "$W/orig"                       # 비교용 원본
git archive HEAD $F ai-webtoon-studio/src/lib/instagram/schedule.ts | tar -x -C "$W"
cp -r docs/analysis-ai-influencer-20261118/candidates/r1/test "$W/"
cd "$W" && git apply --unsafe-paths --directory="$W" "$R/docs/analysis-ai-influencer-20261118/candidates/r1/r1-shared-hook.patch"
node --import ./test/register.mjs --test test/r1.test.mjs        # 23/23
node test/mutate.cjs                                             # 변형 41개 중 빨강 41개
```

- 윈도우 체크아웃은 줄 끝이 CRLF일 수 있다. `git apply`가 줄 끝 때문에 거절하면 `--ignore-whitespace`를 붙인다(이 후보는 `git archive`로 꺼낸 LF 파일에서 만들었다).
