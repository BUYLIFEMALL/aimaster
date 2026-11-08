# 맥미니 인수인계 — Claude Code → Codex (2026-11-07)

## 2026-11-09 대기 상태 정정 — v1.18 공감 1건은 11월 7일 완료
- 주인님이 전달한 「맥미니 전달 / 이웃 소통v1.18 확인에서 공감1건 진행 / 아직 대기」는 과거 상태. **2026-11-07 지정 글 buylifeacademy/223268943950 공감1건 성공**을 기존 프로그램 AGENTS 맨 위·역할 최근 완료·루트 HANDOFF 성공 항목과 대조해 확인했다.
- 근거: 작업 `6f932d4b-8b6a-4e77-927a-c287d0f5e989` state=succeeded, 당시 네이버 새로고침 후 aria-pressed=true/class on·확장 resultState=succeeded. 이것은 11월7일 검수 결과이며 11월9일 새 공감을 실행했다는 뜻이 아니다.
- 당시 최종 상태: 전체 일시정지·상한1·댓글끔·09~22시. 남은 검수는 새 글 대상 이웃/감시 설정 후 자동 승인·자동 순회 완주(당시 directory=[]·monitor=null), 정독 중 탭 전환/복귀. **현재 탭 공감1건 성공과 자동 운영 전체 성공은 구분**한다.
- 아래의 공감 대기/미완료 문구는 최초 인수인계 당시 기록으로 보존한다. 완료된 공감을 대기 작업으로 다시 요청하거나 같은 글에서 재실행하지 않는다. 이번 작업은 기록 대조·문서 정정만, 네이버 동작·AI·빌드·배포·푸시 없음. 비용 없음.

작성: Claude Code(맥미니) · 세션 `claude-mac-20261101-blog` [역할: mac-mini]
받는 쪽: 맥미니 Codex · 세션 `codex-mac-20261107-test-analysis` (역할 파일 `docs/roles/mac-mini.md` 「2026-11-07 담당 지정」)
주인님 지시(2026-11-07 채팅): 「너가 하던 작업을 맥미니 codex에서 나누어서 할꺼니까 지금까지 한 작업과 인수인계 문서 만들어줘」

> 이 문서 하나만 읽고 이어갈 수 있게 썼다. 상세 근거는 각 줄의 링크·커밋에서 확인한다.

## 0. 먼저 알아 둘 것 (공통 규칙)
- 작업 폴더는 SMB `/Volumes/gt1_mega/Antigravity/AIMaster` 하나뿐(맥 로컬 복제본 금지). `npm`·빌드·확장 ZIP·Vercel 배포·DB 쓰기·푸시는 **윈도우 세션에 요청**한다(푸시는 주인님 「푸시해」가 있을 때만).
- 커밋: 일반 파일 `node scripts/commit-paths.mjs "<메시지>" <경로>... --as <세션>`, 공용 문서(HANDOFF 등) `node scripts/safe-commit.mjs --begin <파일> --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" <파일> --as <세션>`. 커밋마다 `git ls-files | wc -l` = `git ls-tree -r HEAD --name-only | wc -l` 확인(이번 세션 마지막 14,887).
- 실제 동작(초대·공감·발송)은 **승인 뒤 1건씩**, 결과가 불확실하면 다시 실행하지 않는다. 비밀번호 입력·보안문자 우회 금지, 로그인 「로그인」 버튼은 주인님이 누른다. 「제한」·로그인 풀림·계정 불일치가 보이면 멈추고 기록.
- `naver-cafe-recruit` **코드는 맥미니가 고치지 않는다**(윈도우 [역할: blog]가 판정 규칙 담당) — 결과만 기록.
- 주인님이 지정하지 않은 아이디로는 초대를 보내지 않는다. 비밀번호·키 값은 적지 않는다.
- 보고: 한국어 존댓말, 동그라미 숫자 금지, 끝에 비용 리포트, 요청함(`node scripts/dev-requests.mjs report|ask`)에 올린 내용은 채팅에도 같이 쓴다.

### 브라우저 메모(중요)
- 이번 작업은 모두 **ego lite**(맥미니)에서 했다. 두 확장(카페 모집 v1.02, 이웃 소통 v1.18)이 **ego에 설치돼 있고**, 네이버(`buylifemall` 매니저 계정)·AIMaster 관리자 계정(`buylifemall@gmail.com`) 로그인도 ego에 있다.
- CLAUDE.md 브라우저 표상 Codex 기본은 엣지다. 이 작업을 엣지에서 하려면 엣지에 두 확장 설치·네이버/사이트 로그인이 새로 필요하다 → **주인님께 「이 세션은 ego 사용」 지정을 받거나 엣지 준비를 요청**한다(세션 지정 브라우저 보조 지침).
- ego 조작: `ego-browser nodejs <<'EOF' … EOF` (먼저 `ego-browser skill` 안내 읽기). 한 작업 = 작업 공간 하나(`taskSpace("이름")`), 끝나면 `task.finish({keep:[]})`. 주인님 손이 필요할 때만 `task.handOff()` → 「계속」 받으면 `takeOverTaskSpace(id)`.
- 확장이 일하는 동안 내 작업 공간이 열려 있으면 「잠긴 전체화면」이라 확장이 새 탭을 못 연다 → 확장에 맡길 때는 작업 공간을 `finish`로 닫는다.
- 확장 새로고침(폴더 선택 창 없이): ego 탭에서 `chrome://extensions/` 열고 `page.evaluate`로 `chrome.developerPrivate.reload('<확장 id>', {failQuietly:false}, cb)`, 확인 `getExtensionInfo(id, cb)`(경로·버전·오류 수). macOS 키 입력 자동화(osascript)는 다른 창(Orca)으로 새어 **쓰지 않는다**.
- 확장 팝업 페이지(`chrome-extension://<id>/popup.html`)를 탭으로 열어 `chrome.storage.local.get(null)`로 상태를 읽을 수 있다. 단 **카페 확장 「시작」은 활성 탭 기준이라 에이전트가 메시지로 시작하면 주인님 다른 탭을 잡는다 → 시작은 주인님이 카페 탭에서 아이콘으로 직접**.
- React 화면의 시간·숫자 칸은 `page.fill`만으로는 저장되지 않을 수 있다 → 값 설정 + `input`/`change` 이벤트, 저장 뒤 새로고침해 값이 남았는지 확인.

## 1. 이번 세션에서 끝낸 일 (2026-11-06 ~ 07)
| 일 | 결과 | 기록·커밋 |
|---|---|---|
| 상태바 5시간 칸 복구 | 맥미니 상태바 스크립트 최신판 설치(서버값 없으면 캐시, 캐시도 없으면 「5h 100%」) | `docs/CLAUDE_STATUSBAR.md` `ccd884feb`·`dc754d50e` |
| `competitor-analysis` v1.12 실물 확인 | 「공동구매」 45곳(후보 40) → 스캔 5곳, 네이버 밖 주소 건너뛰고 계속 ✅, 판정 점수·「주제 약함 20점」 ✅ | `competitor-analysis/AGENTS.md` `533548e27` |
| 카페 모집 하루 상한 | 1 → 20 되돌림(주인님 「20으로 해」) | 설정 화면 |
| 카페 모집 초대 1·2·3회차 | 모두 **초대 0건**. 회차별 원인 확정·윈도우 전달(아래 §2-2) | `naver-cafe-recruit/docs/INVITE_TEST_20261106.md` `7dbf99ecc`·`ac02c8489`·`afabdb300`·`2343a5d73`·`ecec82be6`, HANDOFF `75a37f739`·`191661071`·`bae0f8c84` |
| 이웃 소통 v1.18 확장 연결 | 설치본 = v1.18 ZIP(19개 파일 동일). 설정에서 블로그 `buylifemall` 연결(「연결된 기기 … buylifemall · 만료 2026-12-06」) | 이 문서 |
| 이웃 소통 자동 운영 | 「공감만·댓글 끔·자동·공감 상한 1·09:00~23:00·60분·통합 동의」 저장 → 22시 이후라 실행 안 됨 → 주인님 「지금 끄기」로 **⏸ 전체 일시정지** | 이 문서 |

## 2. 남은 일 (우선순위 순)

### 2-1. 이웃 소통 v1.18 자동 운영 맥 실물 확인 — **⏸ 일시정지 상태, 주인님이 계실 때**
- 프로그램: https://blog-neighbor-care.buylife.xyz/today (관리자 계정), 확장 id `mlgmdgpajoickcpaomjpmdidanejkchc`(ego, v1.18, 경로가 다른 PC `/Volumes/D/…`로 기록돼 있어 ego 재시작 때 사라질 수 있음 — 사라지면 v1.18 ZIP을 다시 로드 요청).
- 현재 저장된 설정: 공감 켬·댓글 끔·자동 모드·공감 상한 1·댓글 상한 3·09:00~**23:00**·60분 간격·통합 동의 체크. 오늘 공감 0. 확장 알람 `bnc-autopilot` 10분 주기.
- 순서: 주인님 참관 시간 확인 → 「🤖 자동 운영」 「▶ 다시 시작」(1번) → 내 작업 공간은 닫고 확장이 순회 탭(`/run`)을 여는지 기다림 → 공감 1건 → 순회 탭에서 다른 탭으로 옮길 때 **끄지 않고 잠시 멈추는지** → 「⏸ 전체 일시정지」 → 「▶ 다시 시작」 동작 → 다시 일시정지.
- 측정: 처음 설정 단계 수·매일 조작 횟수·동의 횟수(자동화 최소 설정 정책). 「🤖 자동 운영」 칸은 제목을 눌러야 펼쳐짐(윈도우 「항상 펼침」 미배포 대기와 같은 현상).
- 끝나면: 동작 끝 23:00 → 22:00, 공감 상한 원래값(30)·댓글 켬 여부는 주인님께 여쭤 되돌림. 기록 `blog-neighbor-care/AGENTS.md`·루트 HANDOFF·역할 파일·요청함 report.

### 2-2. 카페 모집 초대 4회차 — **윈도우 수정 대기**
- 받는 사람: `kkuleomi24`(주인님 지정, 카페 「바이라이프」 비회원). 프로그램 「👥 초대할 사람」에서 **승인 상태 그대로**, 이전 `buylifemall` 줄은 「제외」. 하루 상한 20, 시간대 09:00~22:00(22시 넘으면 주인님 지시로만 늘림, 끝나면 되돌림).
- 회차별 원인(모두 확정):
  - 1회차: 확장이 PC 카페 첫 화면 「초대」(`a.link_invite` `onclick="inviteMember()"`)를 못 찾음 → 윈도우 `5b3f05ab9`로 해결.
  - 2회차: 바깥 주소 `?iframe_url_utf8=…CafeInvite.nhn…` 때문에 맨 위 창도 초대 틀로 오판 → 윈도우 `c833d18c5`(경로로만 판별)로 해결.
  - 3회차: 초대 틀(`/CafeInvite.nhn`)이 **`window.Event`를 객체로 덮어** `inviteInFrame`의 `new Event("change")`가 `TypeError` → 「초대하기」 전에 끝나 「초대 화면을 찾지 못해 멈췄습니다…보내지 않았습니다.」. 또 **「아이디 추가」는 빈 입력 칸을 하나 더 만드는 버튼**(목록 추가 아님). 받는 쪽 알림 없음(주인님 확인).
- 윈도우에 요청한 수정(HANDOFF `bae0f8c84`): `createEvent("HTMLEvents")` 또는 `new InputEvent`로 교체, 함수 `try/catch`로 오류 문구 반환, 「아이디 추가」 클릭 제거.
- 윈도우가 고치면: 공유 폴더 `naver-cafe-recruit/extension` → ego 설치 폴더 `~/Downloads/naver-cafe-recruit-extension-v1.02`로 `rsync -rc --delete` 후 `diff -rq`로 동일 확인 → `developerPrivate.reload('nkneaeehonnhndoichbhmipcbmjepene')` → 카페 첫 화면 탭을 앞에 두고 **주인님이 아이콘 → 「이 카페로 초대 시작」** → 팝업 상태·「📊 보낸 결과」·틀 안 결과 문구 원문 기록 → 받는 쪽 「내소식」 확인은 주인님.
- 초대가 분명해지면: 요청 문서 순서 7번(「초대링크」 버튼 모양 관찰만, 링크를 다른 곳에 붙여 넣지 않음) + 「추가」 절(설정 「A. 카페 활동 회원 명단」 켜기·책임 고지 동의 → ☕일상TALK 글 목록 → 「이 게시판 작성자 명단 모으기」 2~3페이지).
- 결과는 `naver-cafe-recruit/docs/INVITE_TEST_20261106.md`에 「## 4회차」, 루트 HANDOFF 한 줄. 요청 원문: `naver-cafe-recruit/docs/REQUEST_20261106_MACMINI_INVITE_TEST.md`(윈도우 작성, 읽기만).

### 2-3. 대기(주인님 결정·다른 세션)
| 일 | 기다리는 것 | 근거 |
|---|---|---|
| 올인원 이미지 1장 시험(1달러 미만, 실행 전 알림) | 시험 계정 OpenAI 키 등록 — 요청함 `58e1d618` | `docs/DEPLOY_REQUEST_20261103_BLOG.md` |
| `competitor-analysis` 「공동구매」 매칭 가점 | 주인님 선택 | `competitor-analysis/AGENTS.md` 맨 아래 |
| 카톡 자동발송 `koms` | 진행 범위 주인님 지정 | `docs/analysis-programdev-batch-20261027/REPORT.md` M15 |
| BLOG FREE 배지 확인 | 주인님이 켠 뒤 상세·접근 확인 | 역할 파일 |
| 30일 열외 26개 배포 | 윈도우 배포 | `docs/PENDING_DEPLOYS.md` |
| 12월 모델 교체 묶음 A | 12-05 점검 | `docs/PLAN_20261103_MODEL_MIGRATION_DEC.md` §6 |
| ego lite 업데이트 | 주인님 승인 | 출력에 `[ego-browser:notice]` 뜨면 여쭘 |

## 3. 남긴 상태(2026-11-07 새벽)
- ego 작업 공간: 주인님 것 0·1번, 오늘의 소통 탭만 남은 4번(주인님 소유로 남음, 필요 없으면 주인님이 닫아도 됨). 내가 연 공간은 모두 닫음.
- 카페 모집 설정: 상한 20 · 09:00~22:00 · B(아는 사람)·C 켜짐, A 꺼짐. 확장 꺼짐(`running:false`).
- 이웃 소통: 확장 연결됨, 자동 운영 ⏸ 일시정지(시간대 09:00~23:00으로 남아 있음 — §2-1 끝나면 되돌림).
- 커밋은 모두 로컬, **푸시 안 함**.
- 비용: 이번 세션 전체 없음(빌드·AI 호출·배포 0).
