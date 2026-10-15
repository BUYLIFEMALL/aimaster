# Step Mail Next 16 이전 계획 (B1) — 윈도우에서 실행할 것

- 작성: 2026-10-15, 맥미니 세션.
- **진행 상태(2026-10-15 윈도우): 설치·빌드·로컬 검증 통과, DB v1.09 반영 — 주인님 승인 후 커밋·푸시·배포.** 결과는 `AGENTS.md` v1.09.
- **이전 상태(2026-10-15 맥미니): 코드 수정 완료·미검증·미커밋.** 수정한 것: `package.json`(next ^16.4.0, eslint ^9, eslint-config-next ^16.4.0, `lint`→`eslint`), `middleware.ts`→`proxy.ts`(함수명 `proxy`, 내용 동일), `eslint.config.mjs` 신설, `lib/version.ts` v1.09, `lib/auth.ts` 주석 1줄. **`package-lock.json`은 수정하지 않았다**(맥에서 `npm install` 불가) — 아래 2번 절차 1~3부터 윈도우에서 실행한다. 빌드가 통과하기 전에는 커밋·푸시하지 않는다.
- 맥미니는 `npm install`·빌드를 실행하지 않아 검증하지 못했고, 락 파일이 어긋난 채로 올리면 윈도우 쪽 에이전트가 막히므로 커밋하지 않았다.
- 현재: Next 15.5.27 / React 19.2.4 / v1.08. 목적: 운영 취약점 2건(Next 15 내장 postcss 8.4.31) 제거. 실사용 위험은 낮다(빌드 때 자체 CSS만 처리).
- (2026-10-16 폐지된 옛 규칙) ~~이 폴더 `AGENTS.md` 규칙: Git push·프로덕션 배포·cron 관련 배포는 주인님 사전 승인 필수.~~ 현재는 메인 지침대로 자동 진행. 배포 직전에 승인을 받는다. `vercel.json` cron(`0 * * * *` → `/api/cron/dispatch`)은 이미 운영 중이며 이번 작업에서 바꾸지 않는다. 실제 메일 발송은 하지 않는다.

## 1. 바뀌는 곳 (분석 결과)

| 대상 | 현재 | 이전 후 | 근거 |
|---|---|---|---|
| `package.json` `next` | `^15.5.27` | `^16.4.0` | `kakao_auto_poster`가 이미 16.4.0으로 운영 중(같은 저장소의 검증된 선례) |
| `eslint-config-next` / `eslint` | `^15.5.27` / `^8` | `^16.4.0` / `^9` | 16의 eslint-config-next는 eslint 9 기준 |
| `scripts.lint` | `next lint` | `eslint` | Next 16에서 `next lint` 명령이 제거됨. 현재 이 폴더에는 eslint 설정 파일이 없어 lint가 사실상 동작하지 않는 상태 |
| eslint 설정 | 없음 | `eslint.config.mjs` 신설 | `kakao_auto_poster/eslint.config.mjs`를 그대로 복사(`core-web-vitals`+`typescript`, `.next/**` 등 제외) |
| `middleware.ts` | `export function middleware` | `proxy.ts`로 파일명 변경, 함수명 `proxy` | Next 16에서 middleware 파일 규칙이 proxy로 바뀜(middleware는 지원 중단 예고). `kakao_auto_poster/src/proxy.ts`가 선례. **내용(옛 주소 308 리다이렉트·`x-pathname` 헤더·matcher)은 그대로** |
| `next.config.mjs` | `experimental.serverActions.bodySizeLimit: "20mb"`, `redirects` | 변경 없음 예상 | 빌드에서 경고가 나오면 그때 조정 |
| 번들러 | webpack | Turbopack 기본 | 이 프로젝트에는 커스텀 webpack 설정이 없다. 단 **xlsx(CDN tgz)·tiptap·server-only가 Turbopack 빌드에서 문제없는지 빌드로 확인** |
| `tsconfig.json` | `jsx: preserve` | 빌드가 자동으로 `react-jsx`로 고칠 수 있음 | 자동 수정이면 그대로 둔다 |
| 이미 대응한 것 | `params`·`searchParams` Promise, `cookies()`·`headers()` await | 추가 작업 없음 | v1.07에서 완료 |

Node 20.9 이상이 필요하다 — Vercel 런타임은 Node 24.x라 문제없다.
세부 변경 목록은 작업 전에 Next 공식 16 업그레이드 가이드로 한 번 더 확인한다(이 표는 선례 프로젝트와 현재 코드 조사 기준).

## 2. 윈도우에서 할 순서 (작업 폴더 `D:\Antigravity\AIMaster\stepmail`)

1. `package.json` 수정(위 표) → `npm install` → `npm audit --omit=dev`로 운영 취약점이 **0 또는 감소**했는지 확인.
2. `middleware.ts` → `proxy.ts` 이름 변경, 함수명 `proxy`로 변경. `eslint.config.mjs` 추가.
3. `npm run build` 통과 확인(경고 내용 기록). `npm run lint`는 기존 코드에서 새로 나오는 오류가 많으면 이번 범위에서 고치지 않고 기록만 한다(규칙: 손대는 줄은 요청 범위만).
4. 로컬 `next start`로 확인(공용 DB 값은 실행 때만 전달, v1.07과 같은 방식): 로그인 화면 200, 보호 화면 307(→ `/login?redirect=`), API 401. 옛 주소 호스트 헤더(`stepmail-kappa.vercel.app`)로 요청 시 `https://stepmail.buylife.xyz`로 308이 나가는지도 확인(proxy 동작 보존 확인).
5. 버전 `v1.09`: `lib/version.ts` + DB `programs.version`(slug는 이 프로그램 것) + `AGENTS.md` 작업 기록 + `docs/ERROR_LESSONS.md` 필요 시 1줄. 확장 없음.
6. **주인님 승인 받기** → 커밋 → 푸시 → `vercel deploy --cwd <절대경로> --prod --yes --scope buylife`(`.vercel/project.json` projectName 확인) → 운영 확인.
7. 운영 확인: 로그인 화면 렌더링, 옛 주소 308, 로그인 상태 주요 화면(리드 목록·초안·캠페인·예약 발송)은 `stepmail.buylife.xyz`에서 시험 계정으로 확인. **실제 발송·캠페인 "지금 실행"은 하지 않는다.**

## 3. 위험·주의
- proxy 이전이 가장 민감하다: 로그인 후 원래 페이지로 돌아오는 `x-pathname` 헤더와 옛 주소 리다이렉트가 이 파일에 있다. 4번 확인을 생략하지 않는다.
- Turbopack 빌드가 xlsx(tgz 패키지)에서 실패하면 `next build --webpack`로 임시 우회 후 원인을 `ERROR_LESSONS.md`에 기록.
- 배포 후 문제가 생기면 Vercel에서 직전 배포(v1.08)로 되돌리는 것이 가장 빠르다.
- 다른 CLI의 미커밋 변경이 `docs/HANDOFF.md`에 있을 수 있으니 이 폴더 파일만 스테이징해서 커밋한다.
