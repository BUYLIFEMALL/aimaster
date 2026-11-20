# 영상 담당 프로그램 미배포 대기 대조 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 | MOV-VIDEO-PENDING-RECONCILE(가칭, 자율 착수 — 알림 msg_35f4699cc7b7) |
| 방법 | 각 앱 `APP_VERSION` 마지막 변경 커밋 이후 소스 커밋(`docs`·`*.md` 제외) 목록 + `node scripts/pending-check.mjs <8개 폴더>`(읽기 전용) + `docs/PENDING_DEPLOYS.md` 대조 |
| 기준 HEAD | 조사 시점 `6878089f3` |
| 변경 | `docs/PENDING_DEPLOYS.md`에 빠졌던 내 몫 2줄 추가(SVS·YVS). 빌드·배포·DB 0 |
| 제출 상태 | ready_review |

## 1. 다음 배포 묶음표
| 프로그램(코드 버전) | 버전 이후 미배포 소스 커밋 | 공용 사본 대기 | 공통 점검(`pending-check`) | 판단 |
|---|---|---|---|---|
| `shorts-viral-studio` v2.01 | `929ff67bb`·`c31b91095`·`9b3d91af5`(거르기·문구), `77987f7f2`(Next 16.4.6) | — | 저장공간 위젯 한 줄 · `signOut` 범위 1곳 · 서버 User-Agent | **가장 큼** — 회원 화면 기능 + 보안 업그레이드. v2.02 후보 |
| `youtube-viral-studio` v1.30 | `b40b18f37`(분리, 동작 같음), `77987f7f2`(Next 16.4.6), `acc122786`(시험만) | — | 없음 | 보안 업그레이드 때문에 다음 묶음 권장. v1.31 후보 |
| `shorts-onestop-studio` v1.59 | `44db8e230`·`4936c5e72`·`2b9a06c9c`(공용 인코더 사본) | 인코더 4건·`storage-quota-client` | 30일 열외 줄(이미 배포 표시 ✅ 혼재) | 인코더 안정화 3건 — 맥 재확인 뒤 배포 권장. Next 16.4.1도 함께 묶으면 빌드 1회 절약 |
| `shots` v1.51 | 위 인코더 3건 + `0807cf180`(공용 유튜브 업로드 사본 `containsSyntheticMedia`) | 인코더·업로드 | `signOut` 1곳 · User-Agent | 원스톱과 같은 묶음. Next 16.4.2 함께 권장 |
| `video-to-gif` v1.33 | `4936c5e72`·`2b9a06c9c`(인코더). 그 앞 커밋은 v1.33 배포 `d221de40e`에 포함 | 인코더 3건 | 없음 | 인코더 묶음과 같이 |
| `infinite-loop-video` v1.10 | `d1e710d68`(권한 확인 병렬화)·`33909b11c`(서울 지역 고정)·`9810804f1`·`1def2373a`(0번 규칙 고지·robots) — 모두 다른 역할의 일괄 변경 | — | 저장공간 위젯 · `signOut` 2곳 · User-Agent | 표에 줄 없음(일괄 변경은 각 담당 기록 소관). Next 16.4.2와 함께 v1.11 후보 |
| `ai-video-studio` v1.36 | 없음 | — | `signOut` 1곳 · User-Agent · 30일 열외 줄 | 급하지 않음 |
| `music-video-studio` v1.31 | 없음 | — | 30일 열외 줄 | 음악 담당과 겹침 — 급하지 않음 |

## 2. 고친 빈틈(내 몫)
- `youtube-viral-studio`: `pending-check` 「대기 없음」이었으나 미배포 소스 커밋 2개(+시험 1) → 표에 한 줄 추가.
- `shorts-viral-studio`: 표에는 10-23 메뉴 위치 줄만 있었음 → 11-20 거르기·문구·Next 묶음 한 줄 추가.
- 원인: 오늘 커밋 때 프로그램 `IMPROVEMENTS.md`에만 적고 `PENDING_DEPLOYS.md` 줄을 빠뜨림(쓰는 법 1번). 앞으로 미배포 커밋 때 두 곳에 함께 적음.

## 3. 확인 필요(다른 담당·주인님)
- 30일 열외 대기 줄은 `pending-check`가 여러 앱에 계속 띄우지만 「11-06 배포에 함께 나감 ✅」 표시가 섞여 있음 — 정책 담당이 앱별로 정리할 대상(이번에 고치지 않음).
- `infinite-loop-video`의 일괄 변경 4건은 표에 줄이 없음 — 각 일괄 작업의 공용 기록에 있는지 담당 확인 필요.

## 4. 추천 배포 순서(승인 필요, 빌드 각 1회)
1. `shorts-viral-studio` v2.02 + 공통 3가지(위젯·`signOut`·User-Agent) — 검색 거르기 실화면 확인(시험 계정 키, 약 102유닛)까지.
2. `youtube-viral-studio` v1.31(보안).
3. 남은 Next 업그레이드 승인(`523e33704`) 뒤 `shorts-onestop-studio`·`shots`·`video-to-gif`(인코더 묶음)·`infinite-loop-video`를 한 번에 하나씩 — 업그레이드와 배포를 같은 빌드로 합치면 빌드 수 절약.

## 5. 비용
없음(읽기·문서만).
