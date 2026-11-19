# R1 공용 연결점 — 로컬 후보 3판(미적용)

- 상태: **후보**. 공용 기준 파일·사본·`--sync`·DB·제품 코드 변경 0. 이 폴더는 문서 폴더이며 어느 프로그램의 빌드·`npm test`에도 들어가지 않는다.
- 설계·결과: `ai-influencer-studio/docs/PLAN_20261119_R1_SCHEDULER_DEFAULT.md` §9~§12.
- 배정: Master `msg_e22a2892cbd5`(1판) · `msg_73e81c2e0a4e`(2판 — 관리자 허용과 회원의 명시 선택 분리, 실패·경합 시험) · `msg_4ab0bb9725fc`(3판 — 조건부 갱신과 판 번호 비교, 격리 타입 검사) · Mac 반례 `msg_14be39e4d98c`.
- `r1-shared-hook.patch`: 기준 3파일에 대한 패치(저장소 뿌리 기준 경로).
  - `insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts` (기준 커밋 237741cc3)
  - `ai-webtoon-studio/src/lib/instagram/posting.ts` (기준 커밋 237741cc3)
  - `ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts` (기준 커밋 237741cc3)
- `test/r1.test.mjs`: 모의 시험 30개. `test/mutate.cjs`: 변형 검사 52종. 실제 DB·cron-job.org·인스타·Next 서버를 쓰지 않는다.
- `test/typecheck.cjs`: 격리 타입 검사. 프로그램의 기존 `node_modules`를 읽기만 하고 저장소에는 쓰지 않는다(`--noEmit`, `incremental: false`, 설정 파일은 격리 폴더 안).
- 모의 설정 네 가지(`test/mocks/`): `config-none`(연결점 없음) · `config-policy`(선택 칸 + 판 번호 칸 — 권장) · `config-policy-cas`(선택 칸만 — 값 비교, 비교용) · `config-policy-nocol`(선택 칸 이름 누락).

## 다시 돌리는 법(저장소 밖 빈 폴더에서)

```bash
W=<저장소 밖 새 빈 폴더>; R=<저장소 뿌리>; F="insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts ai-webtoon-studio/src/lib/instagram/posting.ts ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts"
mkdir -p "$W/orig" && cd "$R"
git archive HEAD $F | tar -x -C "$W/orig"                       # 비교용 원본
git archive HEAD $F ai-webtoon-studio/src/lib/instagram/schedule.ts | tar -x -C "$W"
cp -r docs/analysis-ai-influencer-20261118/candidates/r1/test "$W/"
cd "$W" && git apply --unsafe-paths --directory="$W" "$R/docs/analysis-ai-influencer-20261118/candidates/r1/r1-shared-hook.patch"
node --import ./test/register.mjs --test test/r1.test.mjs        # 30/30 (두 방식 비교 횟수는 진단 줄로 나온다)
node test/mutate.cjs                                             # 변형 52개 중 빨강 52개 (수 분 걸린다)
node test/typecheck.cjs "$R"                                     # 세 줄 모두 「새로 생긴 오류 0건」
```

- 윈도우 체크아웃은 줄 끝이 CRLF일 수 있다. `git apply`가 줄 끝 때문에 거절하면 `--ignore-whitespace`를 붙인다(이 후보는 `git archive`로 꺼낸 파일에서 만들었다).
- `typecheck.cjs`는 격리 폴더 아래 `typecheck/`에 겹침 폴더를 만든다(저장소 밖). 의존성 설치·빌드는 하지 않는다.
