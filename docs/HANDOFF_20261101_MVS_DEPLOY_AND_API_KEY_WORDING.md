# 인수인계 — 뮤직비디오 배포 위험과 API 키 암호화 문구 (2026-11-01)

작성: Claude Code(윈도우) `claude-win-20261029-statusbar` [역할: 미지정]. 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`).
주인님 지시: 「인수인계 문서로 남겨서 다른 cli도 참고해서 작업 할수 있도록 해놔」. **두 건 모두 미처리이며 담당 세션은 정해지지 않았다.** 착수 전에 `docs/ACTIVE_WORK.md`에 줄을 넣는다.

## 1. `music-video-studio` 다음 배포 실패 위험

### 상태
- 작업 폴더의 `music-video-studio/src/components/edit/Composition.tsx`가 미커밋 수정 상태다.
- 이 코드는 `@/lib/edit/renderTrace`를 불러오는데 `music-video-studio/src/lib/edit/renderTrace.ts`가 없다.
- `deploy`는 작업 폴더를 올리므로, 그대로 배포하면 빌드가 실패할 수 있다(빌드로 재현하지는 않았다).
- 현재 운영(v1.26)은 영향 없다. HEAD 커밋의 파일에는 이 코드가 없다.

### 원인(추정)
- 이 파일은 공용 사본이다. 기준 `ai-video-studio/components/edit/Composition.tsx`, 항목 `video-edit-composition`(`scripts/check-shared-modules.mjs:249`).
- 기준은 `cbfe705af`(2026-10-25)에서 렌더 추적을 넣으며 `ai-video-studio/lib/edit/renderTrace.ts`를 함께 추가했다. `renderTrace.ts`는 공용 등록부에 없다.
- `--sync`가 사본만 덮어쓰고 커밋되지 않은 상태로 보인다. 누가 실행했는지는 확인하지 못했다. 2026-10-31 보고의 「다른 세션이 고치다 커밋하지 않음」은 이 추정으로 바로잡는다.
- `node scripts/check-shared-modules.mjs`는 통과한다. 파일 내용만 비교하므로 사본이 불러오는 파일이 없는 것은 잡지 못한다.

### 다음 첫 단계
1. 다른 세션 작업인지 `docs/ACTIVE_WORK.md`, `git log`로 확인한다. `git checkout`으로 되돌리지 않는다.
2. `music-video-studio`도 렌더 추적이 필요한지 판단한다. 필요하면 `renderTrace.ts`를 공용 항목으로 등록해 사본까지 맞추고, 아니면 기준에서 추적 호출을 프로그램별로 분리한다. 기준 파일만 고치고 `--sync`하는 규칙은 그대로다.
3. `tsc`, `npm test`, `npm run build`를 로컬에서 통과시킨 뒤 커밋한다.
4. 재발 방지로 공용 사본 점검에 「불러오는 파일 존재 여부」 검사를 추가할지 검토한다.

### 함께 나갈 미배포 대기
`docs/PENDING_DEPLOYS.md`의 `music-video-studio` 줄(`fde4c94bf`, `30a53cbc2`). `1fd38e029`(키 저장 문구), `04afb0c91`(최종 렌더 안내 정리, 다른 세션 커밋)도 함께 나간다. 다음 버전 v1.27. Vercel 빌드 1회는 사전 승인이 필요하다.

## 2. API 키 「암호화」 안내 문구

### 확인한 사실
- `music-video-studio/src/lib/apiKeys.ts`는 `user_api_keys.api_key`를 복호화 없이 그대로 읽어 사용한다.
- 운영 DB를 서비스 키로 읽기 전용 집계했다: `provider=gemini` 31행 중 13행이 Google 키 형식(`AIza`)으로 읽혔다. 즉 **적어도 이 13건은 앱 수준 암호화 없이 읽힌다.** 나머지 18행의 형식은 확인하지 않았다. 키 값은 출력하지 않았다.
- `supabase/migrations/`에서 `encrypt`·`pgsodium`·`vault` 검색 결과가 없다(루트 폴더 한정). 디스크 수준 암호화(Supabase 인프라)는 별개이며 이번에 확인하지 않았다.
- 다른 프로그램의 키 읽기 코드는 전수 확인하지 않았다.

### 문구가 남은 곳
| 프로그램 | 파일 |
|---|---|
| `shots` | `src/app/(dashboard)/settings/page.tsx:104`, `src/app/(dashboard)/guide/page.tsx:91` |
| `threads-easy-planner` | `src/app/(dashboard)/settings/page.tsx:61` |
| `insta_auto_poster` | `src/app/(dashboard)/cardnews/settings/page.tsx:171`, `src/app/(dashboard)/guide/page.tsx:314` |
| `style-dna-analyzer` | `src/app/(dashboard)/settings/page.tsx:183`, `src/app/(dashboard)/guide/page.tsx:281` |
| `react-ui-showcase` | `src/app/settings/SettingsClient.tsx:134` |

검색 범위는 위 5개 프로그램의 `src/app`이다. **전체 프로그램 검색은 아직 하지 않았으므로 더 있을 수 있다.** `music-video-studio`는 `30a53cbc2`, `1fd38e029`로 고쳤고 미배포 상태다.

### 결정이 필요한 것 (주인님)
- A안: 문구를 사실대로 고친다(예: 「본인 계정에 연결해 보관하며 다른 회원에게 보이지 않습니다」). 빌드는 프로그램별 다음 배포 때 함께.
- B안: 실제 앱 수준 암호화를 도입한다. `user_api_keys`는 모든 프로그램이 함께 쓰므로 전 프로그램 읽기 코드와 기존 키 이관이 필요한 큰 작업이다. 운영 DB 변경은 사전 승인 대상이다.

### 다음 첫 단계
1. 전체 프로그램에서 `암호화` 문구를 검색해 이 표를 완성한다.
2. `user_api_keys`의 RLS와 다른 프로그램의 읽기 코드를 대조한다.
3. 주인님 결정 뒤 진행한다. **키 값을 문서·채팅·로그에 남기지 않는다.**

## 3. 작업 후
이 문서의 해당 절에 처리 결과·커밋을 적고, 프로그램별 `docs/IMPROVEMENTS.md`와 루트 `docs/HANDOFF.md`를 갱신한다.

프로그램: https://music-video-studio.buylife.xyz
