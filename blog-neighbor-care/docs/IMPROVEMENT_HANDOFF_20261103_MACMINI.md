# 이웃 소통(blog-neighbor-care) 실제 시험 — 맥미니 인수인계 (2026-11-03)

- 넘기는 쪽: 윈도우 Claude Code `claude-win-20261101-blog` [역할: blog]
- 받는 쪽: 맥미니 Claude Code [역할: mac-mini] — 주인님 지시 「너가 하던 작업을 맥미니에서 할 예정」
- 프로그램: https://blog-neighbor-care.buylife.xyz
- 운영 버전: **v1.13** (커밋 `22c50cf67`, 확장 ZIP·DB `extension_version` 모두 v1.13)
- 운영 DB: `esgxyikcnnvmlhygjkth` (AIMaster 운영)

## 1. 지금까지 한 일

| 버전 | 내용 |
|---|---|
| v1.09 | 이웃 신청 수락 창 처리(`operateAcceptPopup`), 선택 권한 `admin.blog.naver.com` |
| v1.10 | 공감 준비 버튼, 실행 버전 표시 |
| v1.11 | `VersionStatus.tsx`(메인프로그램·확장프로그램 버전 구분 표시), 확장 칸 접기 |
| v1.12 | 공감 하트 처리 `likeChoice` — `.post-btn .my_reaction a.u_likeit_list_button[data-type="like"]`, 꺼져 있을 때만 1회 클릭 |
| v1.13 | 메인프로그램 칸 접기 `FoldablePanels.tsx` |
| DB | `20261102090000_bnc_extension_devices_list_fix.sql` 운영 적용 완료 |

실제 시험 결과
- 이웃 신청 수락: `restaurantwar` 자동 성공, `soriss-`는 주인님이 마지막에 직접 확인. 받은 신청 2명 남음(처리는 선택).
- 공감 1건째: 글 `223840483272` — 자동 실행이 멈춰 주인님이 직접 하트를 누르고, 승인 뒤 작업 `0632af27…`을 수동 성공 처리(`state=succeeded`, `bnc_execution_evidence` 기록 없음).
- 공감 2건째: 글 `223437735917` — 본문 없이 영상만 있는 글이라 중단.
- **공감 3건째(현재)**: 작업 `38ae2eeb-4b15-48bd-a642-517f35fd456b`, 글 `223406907419`, 상대 `buylifeacademy`, 상태 **`ready`**(2026-11-03 확인, 아직 실행 안 됨). 네이버에서 하트가 비어 있음.
- 실행 연결: 기기 `bb8724ae…`에 공감만 허용, 설정 revision 4~5, live_allowed true.

## 2. 미배포 대기(모두 커밋·푸시 완료, 다음 배포에 함께)

| 커밋 | 내용 |
|---|---|
| `d10d5ddd4` | 흰 버튼을 초록 배경(#dff1e8)+굵게, 중단·해제류 버튼은 빨강 `bnc-danger`, 글 목록 줄 간격 18px (`src/app/globals.css`, `extension/popup.css`, WorkRecords·FeedMonitor·reader-connection·ExtensionExecutionSettings) |
| `10bb71a9d` | 글 읽는 시간 중 15초 이내의 짧은 창 선택 해제는 허용, 넘으면 「Edge 창 선택이 N초 동안 풀려 멈췄습니다…」로 멈춤 (`extension/work-bridge.mjs`, 시험 NR13). 클릭 직전 확인·탭/본문 변경·최소화는 그대로 엄격 |
| `c49848f6b` | 영상 전용 글 기록 |
| `714730dca` | ERROR_LESSONS: 엣지는 상단 「업데이트」로 폴더 확장 버전이 안 오르고 카드의 「다시 로드」가 필요 |

시험 346개·tsc 통과 상태에서 커밋했습니다. 상세는 `docs/IMPROVEMENTS.md` 맨 아래 「미배포 대기」 항목.

## 3. 남은 일(순서대로)

1. **공감 자동 재시험** — 위 작업 `38ae2eeb…`.
   - 주의: 지금 회원 PC 확장은 v1.13이라 위 2번의 「포커스 허용」이 아직 안 들어 있습니다. 시험 중 엣지 창을 건드리지 않게 주인님께 부탁하거나, 포커스 허용이 필요하면 v1.14 배포 뒤 시험합니다.
   - 순서(주인님 조작): [엣지 확장 관리] `edge://extensions` 카드의 「다시 로드」 → [네이버] 글 탭 F5 → [확장프로그램] 「현재 탭 실행 연결」 → [확장프로그램] 「공감 실행」.
   - 결과는 캡처와 `bnc_jobs` 읽기로 대조합니다(`state`, `like_state`, `observed_at`).
2. **댓글 1건 시험** — [메인프로그램] 「웹·확장 실행 연결」에서 「댓글·답방」을 추가 허용해야 합니다(지금은 공감만 허용). 허용 저장은 주인님 동의 체크가 필요합니다.
3. **다음 배포 v1.14**(빌드 1회, 주인님 사전 승인 필요) — 미배포 대기 4건 + 아래 추가 항목을 함께.
   - N↗ 아이콘(주인님께 약속), 공감 준비 결과 문구를 버튼 근처로, 목록 조회 DB 시험 추가.
4. 정리: 공용 문서·역할 파일·HANDOFF, 예전 기기 2개 정리 안내, 재확인(v1.07로 실행돼 실패한 2회) 재시험, 스토어 등록 검토, 이웃 신청 2단계(별도 작업).
5. 원인 미확인: `public/downloads/blog-neighbor-care-extension-v1.10.zip`이 작업 폴더에서 바뀌어 있음 — 커밋에서 제외해 두었습니다. 덮어쓰거나 되돌리지 말고 원인만 확인합니다.

## 4. 맥미니에서 할 수 있는 일 / 윈도우에 요청할 일

맥미니 플레이북(`docs/MAC_MINI_AGENT_PLAYBOOK.md`) 기준입니다.

- 맥미니: 코드·문서 수정, `tsc`, 시험 실행(가능하면), 경로 지정 커밋(`node scripts/commit-paths.mjs`), 브라우저로 화면 확인, 주인님 캡처 판독.
- **윈도우에 요청**: `npm run -s build:extension`(ZIP), 버전 올리기 후 Vercel 배포, DB 쓰기(`extension_version` 등), 운영 DB 함수 적용, 푸시 묶음.
- 배포 절차(윈도우가 할 때 참고): 빌드 대기 확인 → `src/lib/version.ts`·`extension/popup.html`·`package.json`·`package-lock.json` 버전 → `npm run -s build:extension` → 시험·tsc → 경로 지정 커밋(ZIP latest·vX.YY·manifest·IMPROVEMENTS 포함) → `node scripts/deploy.mjs blog-neighbor-care --go --owner <세션>` → `--version-only --set-version` → `extension_version` 갱신 → `node scripts/check-extension-release.mjs blog-neighbor-care` OK 확인.

## 5. 꼭 지킬 것

- 네이버 조작은 주인님이 직접 하고 캡처로 확인합니다(Claude 브라우저 도구는 네이버 탭 접근이 막혀 있음). 비밀번호 입력 금지, 보안문자·제한이 나오면 멈춥니다.
- 실제 동작(공감·댓글)은 주인님 승인 뒤 **1건씩만**. 결과가 불확실하면 자동으로 다시 실행하지 않습니다.
- 작업 브라우저는 주인님이 지정한 **엣지**입니다(이 시험의 확장이 엣지에 설치돼 있음).
- 네이버 화면 저장본은 윈도우 `D:\PDS\naver-dom\`(타인 정보 포함, 저장소에 올리지 않음).
- 주인님께 안내할 때는 위치를 [메인프로그램] / [확장프로그램] / [네이버] / [엣지 확장 관리]로 밝힙니다.
- 결과는 `node scripts/dev-requests.mjs report`와 채팅에 함께 남기고, 비용은 빌드 1회라도 먼저 승인받습니다.

## 6. 비용

이번 인수인계까지 추가 비용 없음(마지막 빌드는 v1.13 배포 1회, 이미 승인·보고 완료).
