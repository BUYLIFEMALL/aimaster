# 인수인계 — 프로그램 7곳 메인 사이트 링크 정정: 대기 후 나중에 진행 (2026-10-23)

**작성:** Claude Code(윈도우), 세션 `claude-win-20261023-mainsite-url`
**상태:** ⏸ **대기** — 주인님 지시 「대기했다가 나중에 작업할 때 진행하는 걸로」(2026-10-23)
**대상 DB:** 운영 ref `esgxyikcnnvmlhygjkth`(이번 일에는 DB 변경 없음)

## 1. 무엇이 남았나
| 프로그램 | 남은 일 | 코드 커밋 |
|---|---|---|
| `cinematic-storyboard-studio` | 메인 사이트 링크 정정 배포 | `486fd5fd3` |
| `ai-prompt-studio` | 위와 같음 | `486fd5fd3` |
| `persona-style-studio` | 위와 같음 | `486fd5fd3` |
| `playlist-channel-studio` | 위와 같음 | `486fd5fd3` |
| `prompt-template-studio` | 위와 같음 | `9c170faf5` |
| `detail-page-12p` | 위와 같음 | `486fd5fd3` |
| `allinone-graphic` | 위와 같음 | `486fd5fd3` |

- 바뀐 내용: 메인 주소 `https://aimaster.buylife.xyz` → `https://www.buylife.xyz`, `/signup` → `/register`, `/legal/privacy`·`/legal/terms` → `/privacy`·`/terms`. 7곳 모두 tsc 0.
- 이미 운영에 적용된 임시 조치: 메인 Vercel 프로젝트 `aimaster`에 도메인 `aimaster.buylife.xyz`를 추가해 `www.buylife.xyz`로 308 이동(경로 유지). 그래서 권한 없음·정지·핸드폰 안내 이동은 지금도 정상이고, **회원가입 링크(`/signup`)만 배포 전까지 404**다.
- 각 프로그램 `docs/IMPROVEMENTS.md` 맨 아래와 루트 `docs/PENDING_DEPLOYS.md`에 「미배포 대기」로 적혀 있다.

## 2. 왜 지금 하지 않았나
- 같은 시각 다른 세션 `claude-win-20261023-next-security`가 이 7곳을 포함한 여러 프로그램에 Next.js 보안 업데이트를 넣고 한 곳씩 배포하는 중이었다(작업 중 표 예약, 빌드 약 49회 승인). 같은 프로그램을 두 세션이 동시에 빌드하면 안 되고, 그 세션의 배포에 이 커밋이 함께 실려 나가면 따로 빌드할 필요가 없다(빌드 7회 절약).
- 그 세션 앞으로 HANDOFF에 「배포 뒤 회원가입 링크 확인·미배포 7줄 정리」를 부탁해 두었다.

## 3. 나중에 이어서 할 때 (다음 첫 단계)
1. **그 세션이 끝났는지 확인:** `docs/ACTIVE_WORK.md`에 `claude-win-20261023-next-security` 줄이 없어야 한다. 남아 있으면 계속 기다린다.
2. **이미 나갔는지 확인(비용 없음):** 각 프로그램 로그인 화면에서 회원가입 링크를 본다.
   - 실제 주소는 `node scripts/check-app-urls.mjs <slug>`로 확인(추측 금지).
   - `curl -s <주소>/login | grep -o 'https://[a-z.]*buylife.xyz/register'` 이 나오면 반영됨, `aimaster.buylife.xyz`나 `/signup`이 보이면 미반영.
   - 크롬(시험 회원 `buylifemall@naver.com`)으로 로그인 화면의 「회원가입」을 눌러 메인 사이트 가입 화면이 열리는지도 본다.
3. **반영됐으면:** `docs/PENDING_DEPLOYS.md`의 해당 줄을 「내보낸 기록」으로 옮기고(안전 커밋 도우미), 각 프로그램 `docs/IMPROVEMENTS.md`의 대기 표시를 「배포됨」으로 바꾼다.
4. **아직 안 나갔으면:** 주인님께 빌드 횟수(남은 곳 수만큼)를 보고하고 승인받은 뒤, 한 곳씩 `node scripts/deploy.mjs <폴더> --go --owner "<내 세션 줄>"` → Ready·DB 버전 확인 → 위 2번 확인. 버전은 배포할 때만 +0.01.
5. **커밋 방법:** 일반 파일도 `node scripts/safe-commit.mjs "<메시지>" <파일>... --mine --as <세션> --push`(경로 지정 커밋은 공용 스테이징 축소 위험 — `docs/CLI_COLLABORATION_RULES.md` 9번).

## 4. 참고
- 이 문제를 찾은 도구: `node scripts/check-app-urls.mjs`(문서·코드 속 연결 안 되는 주소 점검). 세션 시작 점검(`deploy.mjs --version-only --all`)에도 요약 한 줄이 나온다.
- 비용: 지금까지 0(도메인 추가는 빌드 없음). 승인받았던 빌드 7회는 쓰지 않았다.

## 5. 진행 기록
- **2026-10-23 15:2x 확인(보안 업데이트 세션 아직 작업 중):** `cinematic-storyboard-studio`·`ai-prompt-studio`·`allinone-graphic` 3곳은 그 세션의 배포로 이미 나갔다. 로그인 없이 받은 로그인 화면 스크립트에 `www.buylife.xyz`만 있고 옛 주소(`aimaster.buylife.xyz`)는 없음. AI 프롬프트 스튜디오는 크롬에서 회원가입 탭의 링크가 `https://www.buylife.xyz/register`인 것까지 확인. `docs/PENDING_DEPLOYS.md`에서 3줄을 「내보낸 기록」으로 옮김. 각 프로그램 폴더의 `docs/IMPROVEMENTS.md` 대기 표시는 그 세션이 폴더를 작업 중이라 아직 고치지 않음.
- **남은 4곳:** `persona-style-studio`·`playlist-channel-studio`·`prompt-template-studio`·`detail-page-12p` — 그 세션의 배포를 기다린다. 확인 방법: 위 2단계(로그인 없이 `curl -sL <주소>/login`으로 받은 화면의 `/_next/static/…js`에서 `www.buylife.xyz` 있음·`aimaster.buylife.xyz` 없음). 로그인된 크롬은 로그인 화면이 작업 화면으로 넘어가 링크를 볼 수 없다.
