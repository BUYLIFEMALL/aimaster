---
name: pre-deploy
description: AIMaster 서브프로그램을 Vercel에 배포하기 전 점검 절차. 배포가 필요한지(미배포 대기 규칙), 비용 승인, 미배포 대기 목록, 0번 규칙 고지, 저장공간 위젯, 버전·확장 ZIP·DB, 동시 빌드 여부를 확인한다. 주인님이 배포를 지시했을 때만 사용한다.
argument-hint: "<프로그램 폴더>"
disable-model-invocation: true
---

# 배포 전 점검

대상: `$0`

배포는 비용이 드는 작업이다. 아래를 순서대로 확인하고, 하나라도 막히면 배포하지 않는다. 클라우드 세션·맥미니·Admin PC에서는 배포하지 않고 메인 윈도우 세션에 넘긴다.

1. **지금 배포해야 하는가.** 작은 수정은 「미배포 대기」로 모은다. 바로 배포하는 경우는 대량 수정, 다음 작업의 전제, 회원 피해 버그·보안·이중 과금뿐이다. 해당하지 않으면 `docs/PENDING_DEPLOYS.md`와 그 프로그램 `docs/IMPROVEMENTS.md`에 대기로 적고 끝낸다.
2. **비용 승인.** 빌드 횟수·계정을 먼저 보고하고 승인받았는지 확인한다(이미 승인된 플랜 범위 안이면 다시 묻지 않는다).
3. **대기 목록.** `node scripts/pending-check.mjs $0` — 미배포 대기, 「[0번 규칙] 저작권·분석 금지 고지」, 「[공통] 저장공간 위젯 한 줄 미적용」을 함께 처리한다.
4. **고지.** `node scripts/apply-source-notice.mjs --check $0`. 확장 ZIP·설치본에 `NOTICE`가 들어가는지 확인한다.
5. **로컬 검사(무료).** `npx tsc --noEmit`, 시험, 필요하면 `npm run build`.
6. **버전.** `lib/version.ts`의 `APP_VERSION`을 +0.01(`v1.99` 다음은 `v2.00`) 올리고, DB `programs.version`을 같은 값으로 맞춘다. 확장이 있으면 `extension/manifest.json`·ZIP·`extension_version`·`extension_download_url`을 함께 맞춘다(`docs/EXTENSION_RELEASE_RULES.md`).
7. **동시 빌드 금지.** 팀 `buylife`에 `BUILDING`·`QUEUED`·`INITIALIZING` 배포가 있으면 끝날 때까지 기다린다. 여러 프로그램은 한 번에 하나씩 한다.
8. **배포 뒤.** `vercel inspect`로 Ready 확인 → `curl -s -D - -o /dev/null <주소>`로 `X-Vercel-Cache` 확인 → 실제 브라우저 화면 검수(좁은 화면 포함) → 확장이 있으면 `node scripts/check-extension-release.mjs <slug>` → 대기 표시를 지운다.
9. 끝나면 `/aimaster-dev:work-finish`로 보고한다(비용 리포트 포함).
