# 영상 담당 Next.js 보안 범위 조사 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 지시 | Master msg_1b3221ba40a2(MOV-SVS-YVS-LOCAL-BUILD 후속, 「SVS 안내 수정 뒤 영상 담당 Next 16.4.2 범위 조사만」) |
| 방법 | 읽기만: 각 폴더 `package.json`(선언), `package-lock.json`의 `node_modules/next`(잠금), `node_modules/next/package.json`(설치본), 저장소 문서 검색. 설치·재시도·빌드·배포·네트워크 0 |
| 기준 HEAD | 조사 시점 `64b3e165c` |
| 제출 상태 | ready_review |

## 1. 빌드 판정 기록(바뀌지 않음)
- SVS `npm run build`: **종료코드 1**(컴파일·타입·페이지 생성 뒤 `SecurityFatalError`로 정지) — 빌드 성공으로 판정하지 않음.
- YVS: **미실행**(BLOCKED).

## 2. 영상 담당 프로그램별 범위(한 표)
| 프로그램 | `package.json` 선언 | 잠금 파일(`package-lock.json`) | 설치본 | 함께 묶인 패키지 | 판정 |
|---|---|---|---|---|---|
| `shorts-viral-studio` | `^16.4.2` | 16.4.2 | 16.4.2 | `eslint-config-next@^16.4.2` | **대상** — 로컬 빌드 실측 정지(종료 1) |
| `youtube-viral-studio` | `16.4.2`(고정) | 16.4.2 | 16.4.2 | `eslint-config-next@16.4.2` | **대상** — 미실행, 같은 버전 |
| `shots` | `^16.4.2` | 16.4.2 | 16.4.2 | `eslint-config-next@^16.4.2` | **대상**(같은 버전, 미실행) |
| `infinite-loop-video` | `^16.4.2` | 16.4.2 | 16.4.2 | 없음 | **대상**(같은 버전, 미실행) — 빌드 명령 `next build --webpack`(10-23 기록) |
| `music-video-studio` | `^16.4.2` | 16.4.2 | 16.4.2 | 없음 | **대상**(같은 버전, 미실행) — 음악 담당과 겹침 |
| `shorts-onestop-studio` | `16.4.1`(고정) | 16.4.1 | 16.4.1 | 없음 | **대상 가능성 높음** — 16.4.2보다 낮음, 미실행 |
| `video-to-gif` | `14.2.35`(고정) | 14.2.35 | 14.2.35 | `eslint-config-next@14.2.35` | 별도 — 14 → 16은 큰 버전 변경(10-23 묶음 F), 이번 범위 밖 |
| `ai-video-studio` | `14.2.35`(고정) | 14.2.35 | 14.2.35 | `eslint-config-next@14.2.35` | 별도(위와 같음) |

- 모두 `package-lock.json` 사용(pnpm·yarn 없음). 선언이 `^16.4.2`인 곳도 잠금이 16.4.2라 실제 설치는 16.4.2.
- `@next/*` 직접 선언은 없음(잠금 안의 `@next/*`는 `next`를 따라 바뀜).

## 3. 기존 보안 정책·선례 근거
| 근거 | 위치 @SHA | 내용 |
|---|---|---|
| 10-23 보안 업데이트 | `docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md` @c5e441d06 | 16.x → 16.4.2 일괄(49개 배포), 14.2.35는 「묶음 F: 큰 버전 변경, 별도 플랜·승인」, 공통 규칙(ACTIVE_WORK 등록·빌드 한 번에 하나·경로 지정 커밋·비용 범위 안) |
| 11-19 16.4.2 → 16.4.6 선례 ① | `ai-influencer-studio/docs/IMPROVEMENTS.md` 7줄(W01-NEXT, Master msg_819506e21b8b) | `package.json`·`package-lock.json`만, `next`와 `@next/*`만 변경(추가·제거 0), 공식 감사 권고 0건, 시험 통과, 빌드 미실행·미배포 대기 |
| 11-19 선례 ② | `ai-auto-blog/docs/IMPROVEMENTS.md` 3줄 | 16.4.6 보안 업데이트를 v1.89(`787c837b2`)로 배포 |
| 같은 정지 다른 버전 | `.ai/results/WS-20261117-13-S0-S2-CC-WORKSPACE-01.md` 17절 | Next **16.4.3**에서도 같은 `SecurityFatalError`(업그레이드 권고용 정지, `next/dist/lib/upgrade/nudge.js`) — 코드 오류 아님 |

## 4. 적용 범위 제안(실행은 승인 뒤)
- 대상 6곳(위 표 「대상」) 각각 `next`(+ 있으면 `eslint-config-next`)를 **16.4.6**으로 — 선례 ①과 같은 방식: `package.json`·`package-lock.json`만 변경, 다른 패키지 추가·제거 0.
- 순서 추천: 이번 작업과 이어지는 `shorts-viral-studio` → `youtube-viral-studio`(로컬 빌드 재배정과 연결) → 나머지(다음 배포 묶음 때).
- 필요한 승인: 의존성 설치(패키지 내려받기 = 네트워크), 잠금 파일 변경, 확인용 로컬 빌드(무료). Vercel 빌드는 각 프로그램 다음 배포 때 함께(추가 빌드 없음).
- 담당 겹침: `music-video-studio`(음악 담당)·`shots`는 같은 묶음 처리 시 담당 확인 필요.
- 14.2.35 두 곳(`video-to-gif`·`ai-video-studio`)은 10-23 「묶음 F」대로 별도 플랜.

## 5. 미확인
- 16.4.1·14.2.35가 실제로 같은 빌드 정지를 내는지(빌드 안 함).
- 16.4.6에서 정지가 사라지는지(선례 ①은 빌드 미실행, 선례 ②는 배포 성공 기록).
- 권고 내용 자체(네트워크 조회 안 함).
- Vercel 배포 빌드가 같은 정지를 내는지.
