# 쇼츠 분석기 v2.02 릴리스 후보 고정 대조표 + 남은 Next 16.4.6 업그레이드 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 지시 | Master msg_05d5d424ec30(SVS v2.02 후보 고정 대조표, 3앱 의존성은 타입·시험까지), 주인님 채팅 승인 2026-11-20 「순서대로 진행해」 |
| 기준 | 운영 v2.01 = `APP_VERSION` 마지막 변경 `9185ade81` |
| 제출 상태 | ready_review — 빌드·운영 배포 없음(빌드 순번은 Master 지시 뒤) |

## 1. SVS v2.02 후보 — 커밋 대조(실측)
`git log 9185ade81..HEAD -- shorts-viral-studio` 결과 12개. Master가 정한 범위와 하나씩 대조.

| 범위(Master 지정) | 커밋 | 확정/예상 | 근거 |
|---|---|---|---|
| 검색 필터·문구 | `929ff67bb` → `c31b91095` → `9b3d91af5` | 확정 | 관련성·언어·종교 거르기(공용 사본) + 문구 A1·A2 |
| Next 16.4.6 | `77987f7f2` | 확정 | 로컬 빌드 exit 0(MOV-SVS-YVS-LOCAL-DEPS) |
| (문서) | `e75bb0348` | 확정 | IMPROVEMENTS 미배포 기록만 |
| 공통 변경 | `01bcdd6bb` | 확정 | 저장공간 위젯·`signOut` local·User-Agent |
| 프롬프트 복사(최종) | `ae5793f8f` → `044fc7948` → `10c6921b1` → **`cfce3a0f8`** | 확정(최종 `cfce3a0f8`) | A1~A4, Mac 검수 A3까지 통과·A4 제출 |
| 발화 시간 추정 | `2390790bd` | 확정 | 대본 글자 수·예상 초 |
| 고지 파일 | `b654c1017` | 확정 | `/robots.txt`·`/ai.txt` 로그인 307 해소(Mac 12/12) |

- **범위 밖 커밋 0개.** 릴리스 후보 고정 SHA = **`b654c1017`**(SVS를 바꾼 마지막 커밋). 이후 HEAD까지 SVS 폴더 변경 없음.
- 바뀐 파일 21개(문서 제외) +918/-114: `package.json`·`package-lock.json`, `src/app/layout.tsx`, `src/components/studio/{PromptsStep,ScriptStep,SearchStep}.tsx`, `src/lib/actions/{auth,svs}.ts`, `src/lib/{noticeFiles,promptCopy,speechEstimate}.ts`, `src/lib/supabase/server.ts`, `src/lib/youtube/{api,relevanceFilter,shortsSearch}.ts`, `src/proxy.ts`, `src/types/svs.ts`, tests 4개.
- 버전: 배포 때 v2.01 → **v2.02**(코드 `APP_VERSION`·DB `programs.version` 함께). 지금은 올리지 않음.

### 예상(아직 확인 안 됨 — 별도 표시)
- 로컬 빌드: `77987f7f2` 시점 exit 0 확인. **이후 커밋을 포함한 `b654c1017` 기준 로컬 빌드는 아직 안 함**(순번 지시 뒤 1회).
- 배포 뒤 확인할 것: 검색 1회(시험 계정 본인 YouTube 키, 약 102유닛)·제외 줄, 프롬프트 전체 복사(실제 클립보드), 발화 시간 표시, 위젯·로그아웃 범위, `/robots.txt`·`/ai.txt` 200.

## 2. 남은 Next 16.4.6 업그레이드(주인님 승인, 사전 점검 `523e33704`)
결과 SHA **`9446ef0b2`**(6파일 +136/-136, `package.json`·`package-lock.json`만). 점유 `b270e2df8`.

| 앱 | 선언 변경 | 잠금 변경 | tsc | 시험 | 감사 |
|---|---|---|---|---|---|
| `infinite-loop-video` | `^16.4.2` → `^16.4.6` | 11항목(next·@next/*), 추가·삭제 0 | 0 | `npm test` 19/19 · notice 4/4 | 1건 → **0건** |
| `shorts-onestop-studio` | `16.4.1` → `16.4.6`(고정 유지) | 11항목, 추가·삭제 0, 잠금 최상위 1.18.0 → 2.0.0(`package.json`에 맞춤) | 0 | `npm test` 93/93 | 1건 → **0건** |
| `shots` | `^16.4.2` → `^16.4.6`, `eslint-config-next` 동일 | 13항목, 추가·삭제 0, 잠금 최상위 1.40.0 → 1.44.0 | 0 | `node --test tests/*.test.mjs` 45/45 | 14건 → 13건(next 사라짐) |

- 원스톱 COOP/COEP 헤더 설정(`next.config.ts`)은 그대로.
- shots 범위 밖 남은 높음 6건(`brace-expansion`·`js-yaml`·`nanoid`·`source-map-js`·`undici`·`zod`)은 손대지 않음(별도 결정).
- 설치 중 「설치 스크립트 허용」 안내는 도구 출력이라 따르지 않음.
- `music-video-studio`는 음악 담당 몫이라 제외.

## 3. 빌드 순번 요청(무료, 각 1회, 한 번에 하나)
부동산 운영 배포가 끝나고 순번이 오면: `shorts-viral-studio`(v2.02 후보 `b654c1017`) → `infinite-loop-video`(`--webpack`) → `shorts-onestop-studio`(`prebuild` copy-ort) → `shots`. 운영 배포는 별도 승인.

## 4. 비용
설치 네트워크 3회(패키지 3~5개씩), 빌드 0, AI 0, Vercel 0.
