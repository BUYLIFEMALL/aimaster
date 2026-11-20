# 남은 Next 업그레이드 대상 사전 점검 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 | MOV-NEXT-REMAINING-PREFLIGHT(가칭, 자율 착수) — 주인님 지시 「지시 없으면 직접 찾아 알리고 진행」, 착수 알림 msg_a55a4e0eb048 |
| 대상 | `shots`(16.4.2), `infinite-loop-video`(16.4.2), `shorts-onestop-studio`(16.4.1). `music-video-studio`는 음악 담당 몫이라 제외 |
| 방법 | 읽기와 무료 검사만: 선언/잠금/설치본, `npm audit --package-lock-only`(레지스트리 읽기), 미커밋·점유, `npx tsc --noEmit`, 단위 시험. 설치·파일 변경·빌드·배포·push 0 |
| 기준 HEAD | 조사 시점 `2ded815b7` |
| 제출 상태 | ready_review + 업그레이드 승인 요청 |

## 1. 버전·감사
| 프로그램 | `package.json` next | `eslint-config-next` | 잠금 / 설치본 | 잠금 최상위 버전 | 감사 직접 항목 |
|---|---|---|---|---|---|
| `shots` | `^16.4.2` | `^16.4.2` | 16.4.2 / 16.4.2 | 1.40.0(`package.json` 1.44.0과 다름) | `next` 보통(≤16.4.4), `zod` 높음(<4.6.6) |
| `infinite-loop-video` | `^16.4.2` | 없음 | 16.4.2 / 16.4.2 | 1.03.0(일치) | `next` 보통만(전체 1건) |
| `shorts-onestop-studio` | `16.4.1`(고정) | 없음 | 16.4.1 / 16.4.1 | 1.18.0(`package.json` 2.0.0과 다름) | `next` 보통만(전체 1건) |

- `next` 권고 7건(SVS·YVS 때와 같은 GHSA 목록)은 모두 16.4.4 이하 → 16.4.6이면 해소.
- `shots` 간접 높음 5건(범위 밖, 기록만): `brace-expansion`, `js-yaml`, `nanoid`, `source-map-js`, `undici` + 보통 `typescript-eslint` 계열·`minimatch`. 전체 14건.
- 잠금 최상위 버전 불일치(shots·onestop)는 설치 때 npm이 `package.json`에 맞춰 바꿈(SVS·YVS와 같은 현상, 의존성 변화 아님).

## 2. 작업 상태
- 세 폴더 모두 미커밋 0. `.ai/FILE_OWNERSHIP.md`·`docs/ACTIVE_WORK.md`에 세 폴더 점유 없음(이름이 섞여 나온 다른 작업 설명 줄만 있음).

## 3. 현재 버전 기준선(무료 검사)
| 프로그램 | `tsc --noEmit` | 단위 시험 |
|---|---|---|
| `shots` | 0 | `node --test tests/*.test.mjs` 34/34 (`npm test` 없음) |
| `infinite-loop-video` | 0 | `npm test` 19/19 |
| `shorts-onestop-studio` | 0 | `npm test` 92/92 |

## 4. 업그레이드 때 주의점
- `infinite-loop-video`: 빌드 명령이 `next build --webpack`(Turbopack 아님) — 빌드 시간·메모리가 다를 수 있음.
- `shorts-onestop-studio`: `prebuild`가 `scripts/copy-ort.mjs` 실행. `next.config.ts`의 COOP/COEP 헤더(무료 음성 `crossOriginIsolated`)는 버전 변경과 무관하지만, 빌드 뒤 헤더 설정이 그대로인지 확인 필요. 16.4.1 → 16.4.6이라 SVS·YVS보다 한 단계 더 건너뜀.
- `shots`: `eslint-config-next`도 함께 올림. 범위 밖 높음 항목은 이번 업그레이드에 넣지 않음(별도 결정).

## 5. 제안(승인 필요)
- 세 앱 각각 `next`(+ shots는 `eslint-config-next`)만 16.4.6 — SVS·YVS와 같은 방식: `package.json`·`package-lock.json`만, 잠금 차이 대조(추가·삭제 0 확인), `tsc`·시험 기준선 재확인, 빌드는 Master 순번 뒤 한 번에 하나씩 각 1회.
- 필요한 승인: 의존성 설치(네트워크)·잠금 변경·로컬 빌드 3회(무료). Vercel 빌드는 각 앱 다음 배포 때.
- 순서 추천: `infinite-loop-video`(감사 1건, 작음) → `shorts-onestop-studio`(영상 주력) → `shots`.

## 6. 미확인
- 16.4.6에서 세 앱 빌드 결과(빌드 안 함). 16.4.1이 실제로 `SecurityFatalError`로 멈추는지(빌드 안 함).

## 7. 비용
없음(레지스트리 읽기 3회, 로컬 검사만).
