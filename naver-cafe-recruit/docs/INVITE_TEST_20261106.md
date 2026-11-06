# 카페 회원 모집 첫 실물 초대 시험 기록 (2026-11-06, 맥미니)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini] · 요청: `docs/REQUEST_20261106_MACMINI_INVITE_TEST.md`
환경: ego lite 작업 공간 10번 「카페 모집 첫 실물 초대」, 프로필 BUYLIFE, 확장 **v1.02**(배포 ZIP을 `~/Downloads/naver-cafe-recruit-extension-v1.02`에 풀어 압축해제 로드, id `nkneaeehonnhndoichbhmipcbmjepene`, 오류 없음)
계정: 사이트 `buylifemall@gmail.com`(관리자), 네이버 = 카페 「바이라이프」 매니저 계정. 받을 아이디: `buylifemall`(주인님 지정)
결론: **초대는 0건 보냈다.** 확장이 카페 첫 화면에서 「초대」 메뉴 주소를 찾지 못하는 구조라 초대 단계까지 가지 못했다(아래 §3). 코드는 고치지 않았다.

## 1. 준비 단계(요청 1~3번) — 정상
| 단계 | 결과 |
|---|---|
| 확장 로드 | v1.02 설치, 팝업 제목 옆 `v1.02` |
| ⚙️ 모집 방식·설정 | 「👋 B. 아는 사람」 켜짐(기본 켜져 있었음), 하루 상한 20 → **1**로 바꿔 「설정 저장」 → 「저장했습니다.」, 새로고침 뒤에도 1 유지. 시간대 09:00~22:00 그대로. 「오늘 보낸 초대: 0건.」 |
| 👥 초대할 사람 모으기·승인 | 텍스트 칸에 `buylifemall` → 「목록에 넣기」 → 「1명을 넣었습니다.」(상태 「검토 전」) → 「✅ 이 목록 승인(1명)」 → 「1명을 승인했습니다. 확장이 하루 상한·시간대 안에서 초대합니다.」(상태 「✅ 승인」) |

## 2. 카페 첫 화면(`https://cafe.naver.com/buylife`) 관찰
- 네이버 로그인 정상(머리글 「내소식·내정보 보기」, 카페정보에 「바이라이프 | 매니저」). 보안문자·제한 문구 없음(`isBlocked` 기준 false).
- 왼쪽 카페정보 칸 문구: 「카페정보 | 나의활동 | 바이라이프 | 매니저 | 2023.04.03. 개설 | 카페소개 | 카페등급 | 씨앗3단계 | 카페멤버수 | 2,770 비공개 | 초대 | 카페 글쓰기 | 카페 채팅」
- **「초대」 링크의 실제 모양(위쪽 문서, 틀 밖)**:
  - `<a href="#" class="link_invite" onclick="inviteMember();clickcr(this, 'cia*i.invite', '', '', event);return false;">초대</a>`
  - `inviteMember` 함수 원본: `moveIframePage('/CafeInviteCheck.nhn?m=check&clubid=30954788');`
  - 즉 **`href`에 `CafeInvite*.nhn?clubid=` 주소가 없고**, 클릭 때 카페 안쪽 틀(`cafe_main`)을 `/CafeInviteCheck.nhn?m=check&clubid=30954788`로 옮기는 방식이다. 페이지 전체(위쪽 문서 + 읽을 수 있는 틀)의 `a[href]`를 `findInvite` 정규식으로 훑어도 **일치 0건**.
- 틀 목록: `cafe_main` = `https://cafe.naver.com/MyCafeIntro.nhn?clubid=30954788` 등(초대 관련 틀 없음).

## 3. 확장 「이 카페로 초대 시작」 결과
- `extension/background.mjs` `start()`는 현재 탭 `a[href]`에서 `findInvite()`로 초대 주소를 찾는데, §2대로 주소형 링크가 없어 **`invite = null` → 「이 카페에서 「초대」 메뉴를 찾지 못했습니다. 초대 메뉴가 보이는 카페에서 눌러 주세요.」로 멈추는 구조**다(코드 경로상 확정).
- 실측 보조 확인: 팝업 페이지(`popup.html`)를 작업 공간의 다른 탭으로 열어 「시작」 메시지를 보냈더니 두 번 모두 「초대할 내 카페 화면(cafe.naver.com)을 연 상태에서 눌러 주세요.」가 나왔다(확장 권한으로 카페 탭을 활성화한 뒤에도 같음). 이것은 시험 방법 때문에 활성 탭 판정이 팝업 탭으로 잡힌 것으로 보이며, **주인님이 카페 탭에서 확장 아이콘을 직접 눌렀을 때의 문구는 아직 확인하지 못했다**(예상: 위 「초대 메뉴를 찾지 못했습니다」).
- 받는 아이디 `buylifemall`에게 초대 알림은 가지 않았다. 설정 화면 「오늘 보낸 초대: 0건」.

## 4. 초대 화면 직접 열기(관찰만, 요청 7번 대비)
- 위쪽 탭 주소로 `https://cafe.naver.com/CafeInviteCheck.nhn?m=check&clubid=30954788`를 열면 **제목 「네이버 카페」, 본문 글자 0자, 틀 0개(빈 화면)**. 초대 화면은 카페 틀 안(`moveIframePage`)에서만 그려지는 것으로 보인다.
- 그래서 「아이디」 탭·`input._naverIdList`·「초대하기」·「초대링크」 버튼 모양은 이번에 확인하지 못했다. 카페 첫 화면에서 「초대」를 실제로 눌러(사람 클릭) 틀 안 화면을 보는 것은 다음 회차에 주인님과 같이 본다.

## 5. 윈도우(판정 규칙 담당)에 전달 — 고쳐야 할 점(코드는 손대지 않음)
1. **초대 메뉴 찾기**: `findInvite(hrefs)`만으로는 현재 PC 카페 화면을 못 찾는다. `a.link_invite`(또는 `onclick`에 `inviteMember`) 존재 + 카페 번호는 `onclick`/`inviteMember` 원본의 `clubid=` 또는 카페 전역값에서 읽는 방식 추가가 필요하다. 그 뒤 이동은 `s.inviteHref`로 탭 주소를 바꾸는 대신 **카페 틀을 `/CafeInviteCheck.nhn?m=check&clubid=<번호>`로 옮기거나**(`moveIframePage` 또는 `https://cafe.naver.com/buylife?iframe_url=/CafeInviteCheck.nhn?m=check%26clubid=<번호>` 형태) 틀 안에서 `inviteInFrame`을 돌려야 한다. 위쪽 탭 주소로 직접 열면 빈 화면이다(§4).
2. 판정 문구(`classify`)는 초대 단계에 가지 못해 **이번 회차에 실측 문구 없음** — 1번을 고친 뒤 다시 1건 시험이 필요하다.
3. 「추가」 절(모드 A-1 명단 모으기)은 초대 시험이 먼저라는 요청 순서대로 **이번 회차에 진행하지 않았다**(설정 「A. 카페 활동 회원 명단」은 켜지 않은 상태 그대로).

## 6. 남긴 상태
- 작업 공간 10번은 카페 첫 화면 탭 하나로 정리해 주인님께 넘김(확장이 일할 때 잠긴 전체화면 문제를 피하려고 닫지 않고 두었음 — 다음 회차 끝에 `finish({keep:[]})`).
- 웹 설정: 상한 1 · B 켜짐, 승인 1명(`buylifemall`). 시험이 끝나면 상한을 원래(20)로 되돌릴지 주인님께 여쭌다.
- 캡처: 맥미니 임시 폴더(`ncr-settings.png`·`ncr-targets.png`·`cafe-home.png`), 문구는 위에 그대로 옮김.
- 비용: 없음.

## 2회차 (2026-11-06 저녁, 진행 중)
- 확장: 설치돼 있던 `~/Downloads/naver-cafe-recruit-extension-v1.02`(id `nkneaeehonnhndoichbhmipcbmjepene`)를 공유 폴더 `naver-cafe-recruit/extension`(윈도우 `5b3f05ab9` 포함)과 똑같이 맞춘 뒤 `developerPrivate.reload`로 새로고침 — 사용 중, 오류 0. (폴더 선택 창 자동 입력이 Orca 창으로 새어 중단하고 이 방법으로 바꿈.)
- 에이전트가 확장 메시지로 시작하면 활성 탭 판정이 주인님의 다른 창(`www.buylife.xyz` 탭)으로 잡혀 「초대할 내 카페 화면(cafe.naver.com)을 연 상태에서 눌러 주세요.」 → 주인님이 카페 탭에서 아이콘으로 직접 「이 카페로 초대 시작」.
- **결과: 확장 상태 `inviteHow:"menu"`, `cafeId:"30954788"`, `framePath:"/CafeInviteCheck.nhn?m=check&clubid=30954788"`(새 `findInvite`가 초대 메뉴·카페 번호를 찾음 ✅) → 그 뒤 「멈췄습니다: 로그인이 필요합니다.」**. 이 문구는 네이버가 아니라 우리 서버 `/api/recruit/extension`의 401(`{"error":"로그인이 필요합니다."}`). 같은 시각 사이트 화면·메인·`competitor-analysis`도 모두 로그인 화면 → **AIMaster 로그인이 풀린 상태**(오늘 두 번째, 17:2x 로그인 → 18시 전후 풀림). 카페 틀은 대문(`MyCafeIntro.nhn`) 그대로, **초대 0건**.
- 참고(윈도우): 서버 401로 멈출 때 문구가 「멈췄습니다: 로그인이 필요합니다.」뿐이라 네이버 로그인으로 오해하기 쉬움 → 「프로그램(buylife.xyz) 로그인이 풀렸습니다」처럼 구분하면 좋겠다(코드는 손대지 않음). 로그인 풀림 원인은 미확인(같은 브라우저에서 짧은 시간에 두 번).
- **2회차 두 번째 시도(주인님 재로그인 뒤 아이콘으로 「이 카페로 초대 시작」)**: 사이트 로그인 정상. 카페 틀이 초대 화면으로 이동 ✅ — 바깥 주소 `https://cafe.naver.com/buylife?iframe_url_utf8=%2FCafeInvite.nhn%253Fm%3Dview%2526clubid%3D30954788`, 틀 `https://cafe.naver.com/CafeInvite.nhn?m=view&clubid=30954788`.
  - 확장 멈춤 문구 원문: 「「아이디」 버튼을 찾지 못했습니다. (틀 /buylife · 화면: 게시판 목록 바로가기 본문 바로가기 웹 접근성이 좋은 모바일 웹에서 사용하겠습니까? 바이라이프 |쇼핑몰|폐쇄몰|공동구매중개|AI자동화|MAKE|n8n|MCP 카페홈 이웃 가입카페 새글 내소식 채팅 사용자 링크 바이라이프 내정보 보기 네이버톡 새 창 알림 서비스 더보기 전체글보기 카페 캘) 보내지 않았고 멈췄습니다.」
  - **원인(추정이 아니라 확인)**: `inviteInFrame`의 판별 `/CafeInvite\.nhn/i.test(location.href)`가 **바깥 문서에서도 참**(바깥 주소의 `iframe_url_utf8` 값에 `CafeInvite.nhn` 글자가 그대로 있음, 실측 `true`) → 바깥 문서가 `here:true`로 「아이디」 버튼을 못 찾아 `error`를 냈고, `results.find(x => x?.here)`가 그 결과를 먼저 골라 멈춤. 판별을 `location.pathname`(바깥은 `/buylife`) 기준으로 바꾸거나 `window.top === window`이면 건너뛰어야 함.
  - **틀 안 실행 흔적**: 틀의 `alert`가 확장 함수로 바뀌어 있고(`(m) => { window.__ncrMsgs.push(String(m)); }`) **입력 칸에 `buylifemall`이 입력된 상태**, `__ncrMsgs` = `[]`(알림·확인창 0건), 화면에 결과 줄 없음. 즉 틀 안 쪽도 동시에 돌아 아이디 입력까지는 했음. **「초대하기」를 눌렀는지는 확인 불가** — 결과 불확실이므로 다시 보내지 않음. 프로그램 「보낸 결과」는 「오늘 0/20건 · 아직 보낸 초대가 없습니다」(확장이 `sent_mark`를 안 보냄). 받는 계정 `buylifemall`의 네이버 「내소식」에 초대 알림이 왔는지로 확인 필요(주인님).
  - 초대 화면 구조(판정·입력 규칙용, 실측): 탭 `li.invite_type_list_link`(초대링크)·`li.invite_type_list_qr`(QR 코드)·`li.invite_type_list_id`(아이디) 각각 안에 `a[href="#"]`, 안내 「영리 목적의 광고를 전송하면 정보통신망법에 따라 처벌 받을 수 있습니다.」「카페 초대」「초대할 사람의 네이버 아이디를 입력하세요.」「내소식으로 초대알림이 전송됩니다.」「한 달에 최대 300명까지 초대할 수 있습니다.」, 입력 `input.layer_input._naverIdList`(placeholder 「아이디를 입력하세요.」), 버튼 `button.btn_input_add`(아이디 추가)·`button.btn_invite`(초대하기)·`button.btn_invite_close`(닫기). 「아이디」 찾기가 `button, a, [role=button]` 중 글자가 정확히 「아이디」인 것이라 `a` 로 맞을 수 있음. **「아이디 추가」 버튼이 따로 있음** — 입력 뒤 「아이디 추가」를 눌러 목록에 올려야 「초대하기」가 그 아이디를 보내는지 확인 필요(현재 확장은 입력만 하고 바로 「초대하기」).
  - 초대링크 버튼(요청 7번)·명단 모으기(「추가」 절)는 결과 불확실 상태라 진행하지 않음. 하루 상한은 20(주인님 지시로 이미 되돌림).
  - **발송 여부 확인(19:04, 주인님 화면)**: 받는 계정(= 매니저 본인 `buylifemall`) 카페 「내소식」에 다른 카페 공지 2건(「새로운 필독 공지가 있습니다.」 2시간 전, 「새로운 전체 공지가 있습니다.」 10-26)만 있고 **「바이라이프」 초대 알림 없음** → 「초대하기」가 눌리지 않았거나, 눌렸어도 본인 초대라 알림이 생기지 않았을 수 있음(구분 불가). 3회차는 **카페 회원이 아닌 다른 아이디**로 시험해야 결과가 분명함.

## 3회차 (2026-11-06 22:4x, 맥미니 `claude-mac-20261101-blog` [역할: mac-mini])
- **준비**: 설치 폴더 `~/Downloads/naver-cafe-recruit-extension-v1.02`를 공유 폴더 `naver-cafe-recruit/extension`(윈도우 `c833d18c5`)과 맞춤 — 다른 파일은 `background.mjs` 1개, 맞춘 뒤 `diff -rq` 동일. `developerPrivate.reload` → v1.02 · ENABLED · 오류 0.
- **받는 사람**: 주인님 채팅 지정 `kkuleomi24`(카페 「바이라이프」 비회원). 「👥 초대할 사람」에서 이전 `buylifemall` 줄은 「제외」, `kkuleomi24` 넣고 「이 목록 승인」 → 「1명을 승인했습니다. 확장이 하루 상한·시간대 안에서 초대합니다.」
- **시간대**: 22시가 넘어 주인님 「해봐」(오늘 시간대 23:00까지) 지시로 동작 끝 22:00 → 23:00 저장, 시험 뒤 22:00으로 되돌림(확인: `20 / 09:00 / 22:00`). 참고: 시간 칸에 `fill`만 하면 화면 값만 바뀌고 저장되지 않음(값 설정 + `input`/`change` 이벤트를 보내야 저장됨) — 웹 화면 쪽 관찰, 코드는 손대지 않음.
- **시작**: 주인님이 카페 첫 화면 탭에서 아이콘 → 「이 카페로 초대 시작」. 22:46 팝업 「초대: ▶ 실행 중 · 초대 준비 중」, 카페 틀이 초대 화면으로 이동 ✅ — 바깥 `https://cafe.naver.com/buylife?iframe_url_utf8=%2FCafeInvite.nhn%253Fm%3Dview%2526clubid%3D30954788`, 틀 `https://cafe.naver.com/CafeInvite.nhn?m=view&clubid=30954788`.
- **틀 안 상태(22:47~22:49 30초마다 관찰, 변화 없음)**: 「아이디」 탭 화면, `input._naverIdList` 값 `kkuleomi24`(확장이 입력함), **아이디 목록에는 `kkuleomi24` 없음**(「아이디 추가」로 올라간 줄이 보이지 않음), 결과 줄·알림 없음.
- **확장 멈춤 문구 원문(`chrome.storage.local` `run.message`)**: 「초대 화면을 찾지 못해 멈췄습니다(네이버 화면이 바뀌었을 수 있습니다). 보내지 않았습니다.」 — `running:false`, `done:0`, `inviteHow:"menu"`, `framePath:"/CafeInviteCheck.nhn?m=check&clubid=30954788"`.
- **프로그램 「보낸 결과」**: 「오늘 0/20건 · 아직 보낸 초대가 없습니다.」(`sent_mark` 없음). 지시대로 다시 보내지 않음.
- **해석(윈도우 전달, 코드 손대지 않음)**: 이 문구는 `step()`에서 `results.map(x => x.result).find(x => x?.here)`가 비었을 때 나온다. 그런데 틀 안에는 아이디가 입력돼 있으므로 `inviteInFrame`이 틀 안에서 **시작은 했지만 결과를 돌려주지 못한 것**(입력 뒤 단계에서 함수가 예외로 끝났거나, 그 사이 틀 문서가 바뀌어 결과가 사라짐)으로 보인다. 경로 판별(2회차 원인)은 이번엔 문제 아님. 확인할 것: ① 「아이디 추가」 `button.btn_input_add` 클릭이 실제로 목록에 올리는지(이번 화면엔 목록 없음 — 프로그램적 `input.value` 변경을 네이버가 인식 못 해 추가가 안 됐을 가능성) ② `inviteInFrame`을 `try/catch`로 감싸 오류 문구를 `{here:true, error}`로 돌려주기 ③ `executeScript` 결과에 `here` 없는 틀만 있을 때 틀별 `documentId`/오류를 기록.
- **발송 여부**: 「초대하기」 클릭 여부는 확인 불가 — 받는 계정 `kkuleomi24` 「내소식」 알림으로 주인님 확인 필요. 결과가 분명해지기 전이라 초대링크 버튼(요청 7번)·명단 모으기(「추가」 절)는 진행하지 않음.
- **남긴 상태**: 작업 공간 3번 닫음(`finish({keep:[]})`). 하루 상한 20 · 시간대 09:00~22:00 · `kkuleomi24` 승인 상태(확장 꺼짐). 비용 없음.
