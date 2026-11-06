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
