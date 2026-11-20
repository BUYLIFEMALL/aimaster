# MOV-SVS-YVS-LOCAL-DEPS 결과 — 쇼츠 분석기·떡상 분석 Next 16.4.6 업그레이드와 로컬 빌드 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 / 시도 / 계획 / 배정 | MOV-SVS-YVS-LOCAL-DEPS / A1 / P9 / 1 |
| CAT / ROLE / WORKSPACE | 유튜브(영상) / CC-MOVIE-01 / 메인 Windows `D:\AIMaster` |
| 지시 | Master msg_5646e6b28061(배정 기준 `8f93d4a8f`), 빌드 순번 msg_acf31ac77d5d |
| 허용 경로 | `shorts-viral-studio`·`youtube-viral-studio`의 `package.json`·`package-lock.json`, 로컬 검증 |
| 결과 SHA | `77987f7f2` (`git log -1 -- shorts-viral-studio/package.json youtube-viral-studio/package.json`), 4파일 +104/-104 |
| 점유 | 등록 `03f5dd625` → 해제(이 문서와 함께) |
| 제출 상태 | ready_review |

## 1. 실설치 버전(변경 전 → 후)
| 프로그램 | `package.json` | 잠금 `node_modules/next` | 설치본 |
|---|---|---|---|
| `shorts-viral-studio` | `^16.4.2` → `^16.4.6` | 16.4.2 → 16.4.6 | 16.4.2 → 16.4.6 |
| `youtube-viral-studio` | `16.4.2` → `16.4.6`(고정 유지) | 16.4.2 → 16.4.6 | 16.4.2 → 16.4.6 |

`eslint-config-next`도 같은 방식으로 16.4.6.

## 2. 공식 근거
- npm 레지스트리 `next` dist-tags `latest` = **16.4.6**, `eslint-config-next@16.4.6` 존재.
- `npm audit --package-lock-only`(변경 전): `next` 권고 7건, 모두 영향 범위 16.4.4 이하 — GHSA-mfr8-8qww-v76h, GHSA-vc7v-qv4w-wrv8, GHSA-7qx7-33qx-rqx2, GHSA-f3mh-rxg3-f5g2, GHSA-pc58-hwjq-p385, GHSA-rhh4-g77r-r9qj, GHSA-vvgp-ww4w-46vf.
- 변경 뒤 감사: `next` 항목 없음, 전체 9 → 8건(두 폴더 같음).

## 3. 잠금 파일 대조(두 폴더 같음)
- 바뀐 항목 13개: `next`, `@next/env`, `@next/eslint-plugin-next`, `@next/swc-*` 8개, `eslint-config-next`, 최상위(`""`).
- 추가 0 · 삭제 0 · 다른 패키지 변경 0.
- 최상위 변경은 의존성 선언 두 줄 + 잠금에 남아 있던 옛 버전(SVS 1.11.0, YVS 1.14.0)을 `package.json`의 2.0.0에 맞춘 것(npm 자동 동기화, 의존성 변화 아님).
- 대조 도구·변경 전 사본: 세션 scratchpad `deps/`(저장소 밖).

## 4. 로컬 검증
| 검사 | SVS | YVS |
|---|---|---|
| `npx tsc --noEmit` | 0 | 0 |
| 단위 시험 | `npm test` 17/17 | `node --test tests/*.test.mjs` 67/71(아래 5절) |
| `npm run build`(Master 순번 뒤 각 1회, 재시도 0) | **exit 0**, 21초, Next.js 16.4.6, 컴파일·TypeScript·정적 3/3 | **exit 0**, 24초, Next.js 16.4.6, 컴파일·TypeScript·정적 5/5 |
| `SecurityFatalError` | 없음 | 없음 |

- 빌드 전 확인: 고정판 `77987f7f2`와 두 폴더 차이 0, 미커밋 0, `.next/lock` 없음, 실행 중 `next build` 0(`mall-builder` 개발 서버만), 여유 메모리 4.6GB.
- 빌드 뒤 두 폴더 추적 파일 변경 0.
- 로그: 세션 scratchpad `deps/svs-build.log`·`deps/yvs-build.log`.
- 이전 판정(`MOV-SVS-YVS-LOCAL-BUILD`: SVS 종료 1·YVS BLOCKED)은 이번 결과로 해소.

## 5. 별도 — 기존 favorites 시험 실패 4건(이번 변경과 무관)
- `youtube-viral-studio/tests/favorites.test.mjs` 4건 실패(기대 `yvs_favorites`, 실제 `profiles`). 다른 7개 시험 파일은 모두 통과.
- 업그레이드 전에도 같은 실패(이전 작업에서 두 SHA 동일 확인), 원인은 정책 담당 변경 `0a91cba19`. 빌드·의존성과 무관하며 이번 작업에서 고치지 않음.

## 6. 인수 조건
| 조건 | 판정 |
|---|---|
| 실설치 버전·공식 근거 확인 | PASS(1·2절) |
| 대상 2개만 패치·잠금 대조 | PASS(3절, 4파일만) |
| 준비 먼저, Master 순번 뒤 로컬 순차 1회씩 | PASS(4절, SVS → YVS) |
| 운영 배포·push·운영 호출 없음 | PASS(0) |

## 7. 미확인·범위 밖
- Vercel 배포 빌드에서의 결과(배포는 다음 배포 묶음 때, 이번엔 미배포).
- 실제 화면 동작(로컬 서버 실행 안 함).
- 감사에 남은 범위 밖 항목: `zod` <4.6.6 높음 1건, `typescript-eslint` 계열·`minimatch` 보통 — 손대지 않음.
- 설치 중 `unrs-resolver` 설치 스크립트 차단 안내는 도구 출력이라 따르지 않음(빌드 영향 없음).
- 같은 16.4.2 대상(`shots`·`infinite-loop-video`·`music-video-studio`)과 16.4.1(`shorts-onestop-studio`)은 이번 범위 밖.

## 8. 비용
설치 네트워크 2회(각 5개 패키지), 로컬 빌드 2회(무료), Vercel 빌드·배포·AI 호출 0.
