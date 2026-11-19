# MOV-SVS-RELEVANCE-UI-CLARITY 결과 — 쇼츠 분석기 거르기 안내 문구 보강 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 / 시도 / 계획 / 배정 | MOV-SVS-RELEVANCE-UI-CLARITY / A1 / P9 / 1 |
| CAT / ROLE / WORKSPACE | 유튜브(영상) / CC-MOVIE-01 / 메인 Windows `D:\AIMaster` |
| 기준 / 결과 SHA | `929ff67bb` / **`c31b91095`**(4파일, 미푸시) · 점유 등록 `235edb562` → 해제(이 결과와 같은 시점) |
| 근거 | 맥미니 P2·P3 지적(Master msg_12d2a01d3966) |
| 제출 상태 | ready_review |

## 1. 바꾼 것
| 지적 | 고친 내용 | 파일 |
|---|---|---|
| 토글이 언제 적용되고 할당량을 쓰는지 불분명 | 토글 옆 「(다음 검색부터 적용 · 다시 검색하면 할당량 약 102유닛 사용)」 — 문구는 `RELIGION_TOGGLE_NOTE` 한 곳 | `src/lib/youtube/shortsSearch.ts`, `src/components/studio/SearchStep.tsx` |
| 종교 제외 0건인데도 토글 조언 | `emptyResultMessage(excluded)`: 종교 제외 > 0일 때만 「종교 영상 제외를 끄고 다시 검색하면…(검색 할당량 사용)」, 아니면 「검색어나 기간을 바꿔 보세요」 | 같은 두 파일 |
| 다 걸러졌는데 「아직 검색 결과가 없습니다」와 오류 띠가 같이 보임 | 0개 결과 때 위 오류 띠(`setError`) 삭제, 결과 카드 한 곳에서만: 이번 세션에 검색을 마쳤으면(`excluded` 있음) `emptyResultMessage`, 검색 전이면 기존 「아직 검색 결과가 없습니다…」 | `SearchStep.tsx` |
| 기록 | 미배포 대기 줄에 보강 내용 덧붙임 | `docs/IMPROVEMENTS.md` |

검색 호출·검색 조건·거르기 규칙·외부 요청·운영·배포 변경 0. 진행 중 로컬 빌드 없음 확인 후 편집, 재빌드 안 함.

## 2. 검증(폴더 `shorts-viral-studio`)
| 명령 | 결과 | 종료코드 |
|---|---|---|
| `node --test tests/relevance.test.mjs` | 8/8(기존 6 + 새 2: 빈 결과 문구 4경우·토글 안내) | 0 |
| `npm test` | 17/17 | 0 |
| `npx tsc --noEmit -p .` | 오류 0 | 0 |

## 3. 미확정
- 실제 화면 모양(토글 옆 글이 좁은 화면에서 줄바꿈되는 모습) — 빌드·배포 전이라 미확인.
- 앞 작업의 빌드 상태는 그대로: SVS `npm run build` 종료코드 1(Next 16.4.2 보안 정지), YVS 미실행 — 이번 수정으로 바뀌지 않음.

---

## A2 (배정 2, 기준 c31b91095, 결과 SHA `9b3d91af5`) — 맥미니 잔여 P2(msg_88a6abd7abc2) — ready_review
| 지적 | 고친 내용 |
|---|---|
| 「바로 적용·할당량 0」이 종교 옵션까지 포함하는 것처럼 읽힘 | 검색 조건 아래 안내를 `SEARCH_HELP_LINES` 4문장으로 분리: 검색 할당량 / **영상 길이·최소 조회수·최대 구독자 필터 = 지금 결과에 바로·할당량 0** / 도배·다른 언어·무관 = 검색할 때 자동 제외(추가 할당량 없음) / **「종교 영상 제외」 = 지금 결과에는 적용되지 않고 다음 검색부터**. 토글 옆 안내(`RELIGION_TOGGLE_NOTE`)는 그대로 |
| 전부 제외 때 이유 요약이 머리글과 본문에 두 번 | `headerExcludedSummary(excluded, videos.length)`: 남은 쇼츠가 있을 때만 머리글에 요약, 0개면 숨기고 본문 `emptyResultMessage` 한 곳에만 |

- 파일: `src/lib/youtube/shortsSearch.ts`(상수·함수 추가), `src/components/studio/SearchStep.tsx`(안내 1줄·머리글 1줄 교체), `tests/relevance.test.mjs`(새 2), `docs/IMPROVEMENTS.md`.
- 검증: `node --test tests/relevance.test.mjs` 10/10 · 0, `npm test` 17/17 · 0, `npx tsc --noEmit -p .` · 0.
- 범위 밖 0: 설치·Next 업그레이드·빌드·운영·검색 호출 변경.
- 미확정: 실제 화면(좁은 폭에서 4문장 줄바꿈) — 빌드·배포 전.
