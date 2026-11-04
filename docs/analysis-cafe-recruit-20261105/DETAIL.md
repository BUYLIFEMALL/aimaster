# 네이버 카페 아이디 추출기 · 카페 초대장 발송 2.0 상세 분석 — 기능·로직·동작 방식 (개발 참고용)

작성: 2026-11-05 맥미니 Claude Code `claude-mac-20261101-blog` (역할 mac-mini) · 주인님 지시 「자세하고 면밀히 … 분석해서 문서화」 · 새 카페 회원 모집 프로그램(가칭, 플랜 채팅 제시 — 결정 대기) 개발 참고
분석표: [`EXT-MKT-08`·`EXT-MKT-10`](../EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) · 지침: [마케팅 예외](../MARKETING_AUTOMATION_EXCEPTION_POLICY.md) §3·§4 · [최상위 규칙 §8](../TOP_RULE_PERSONAL_ACCOUNT_API.md)

> **방법·범위**: `D:\PDS\Program_dev\네이버 카페 아이디 추출기\`·`카페 초대장 발송 프로그램 2.0\` 을 **실행하지 않고** 복사본에 `rea inspect-managed-members`(rea 6.5.0)를 돌려 함수별 「호출 순서 + 문자열」로 흐름을 재구성했다. 아이디 추출기: 클래스 16·함수 128·호출 2,467·문자열 308. 초대 발송기: 클래스 22·함수 162·호출 3,019·문자열 384. 원본 코드는 옮기지 않았다. 아이디·비밀번호 파일, 결과·발송내역 파일 내용은 열지 않았다.
> 두 프로그램은 같은 제작사(문의 카카오톡 `tosany`)이고 로그인·카페 불러오기 코드가 거의 같다. 앞서 분석한 `nbcl`·`nbbb`(다른 제작사)와는 구조가 다르다.

## 0. 먼저 결론 — 개발 방향에 영향을 주는 발견 3가지
| # | 발견 | 왜 중요한가 | 지침 |
|---|---|---|---|
| 1 | **숨은 네이버 아이디를 우회 경로로 얻는다.** 카페 글 목록에는 닉네임·회원키(`memberKey`, 암호화)만 나온다. 아이디 추출기는 「카페 글을 블로그로 스크랩」 화면(`CafeScrapContent.nhn`)을 열어 그 안의 `source_blogId` 값을, 초대 발송기는 글 정보 API(`cafe-articleapi/v2.1 … tc=cafe_member_profile`)의 `writer.id`를 읽어 **화면에 공개되지 않은 실제 아이디**를 꺼낸다. 업데이트 내역의 「카페 공유 가능한 게시글만 ID 조회 가능」(2026-03-11)이 이 방식 때문이다 | 초대는 네이버 아이디가 있어야 보낼 수 있어서, **이 우회가 프로그램 전체의 전제**다 | 마케팅 예외 §4 「로그인·우회로만 보이는 것은 제외」에 해당 → **그대로 만들 수 없음, 주인님 결정 필요** |
| 2 | **새 기기 로그인 보안 확인을 자동 통과.** 로그인 뒤 네이버 메일함(`mail.naver.com/json/list`)에서 「새로운 환경에 / sign-in on a new」 알림 메일을 찾아 열고 본문 링크 「예」를 자동으로 누른다. 2단계 확인이 걸리면 「120초내 수동 로그인」 | 계정 보호 장치를 프로그램이 대신 승인 | 보안 확인 우회 금지(최상위 동작 조건) → **만들지 않음** |
| 3 | **초대는 화면 조작 없이 요청을 직접 보낸다.** `CafeInviteNaverIdResult.nhn`에 `clubId`·`naverIds`를 바로 POST. 네이버가 주는 제한 문구 4개로 다음 카페·계정으로 넘어간다 | 초대 권한(카페 운영진)·하루/월 한도가 네이버에 이미 있음 | 우리 방식은 회원 브라우저의 실제 초대 화면에서 사람처럼, 제한 문구가 뜨면 그날 중지 |

→ **새 카페 프로그램 플랜의 「추출」 단계를 다시 정해야 한다**(§7 선택지).

## 1. 네이버 카페 아이디 추출기
### 1-1. 기술
- .NET 윈폼 + Selenium(`UndetectedChromeDriver` — 탐지 회피 크롬), 크롬 개발자 도구 명령(`ExecuteCdpCommand`)
- **로그인은 브라우저**, 그 뒤 **목록·메뉴·등급·아이디 조회는 프로그램이 직접 HTTP 요청**(브라우저 쿠키를 복사해 씀, 크롬 113 사용자 에이전트, `X-Cafe-Product: pc/mweb` 헤더)
- 사람 흉내: `SimulateHumanBrowsing`(무작위 스크롤 후 맨 위로), `SimulateMouseWander`(마우스 떠돌기), `CDP_Type`(한 글자씩 `Input.dispatchKeyEvent`·무작위 간격 — 로그인 칸 입력용), `CDP_PressEnter`
- 사용 허가: 별도 로그인 화면(`Login` 클래스 — 회원가입·비밀번호·접속 시각 확인), 시작 때 업데이트 확인

### 1-2. 흐름
```
로그인(아이디·비밀번호를 CDP로 한 글자씩 → 새 기기 알림 메일 자동 승인 → 안 되면 120초 수동)
 → 가입_카페_불러오기: join-cafes/groups?page=N (cafeName·cafeId·cafeUrl, lastPage까지)
 → 회원이 카페 선택(더블클릭) → 카페_메뉴추출: SideMenuList?cafeId= (menuName·menuId·menuType·boardType B/L/T/I…)
 → 전체_작업: 「결과 yyyy-MM-dd HHmmss」 폴더 만들고 카페·게시판마다(또는 「전체글보기」)
    게시판_탐색: 멤버_등급_여부(CafeMemberLevelInfo — 「등급을 사용하지 않는 카페」 확인)
      → ArticleListV2dot1.json?search.clubid&menuid&page&perPage=50 (페이지 범위만큼)
      → 글마다 memberKey 중복 제외(HashSet), writerNickname·subject·memberLevel·menuName
      → 거르기: 탈퇴 멤버 제외 · 새싹 등급 제외 · 매니저 기본 제외(업데이트 내역) · 등급 범위
      → 회원_ID추출(글마다): 무작위 대기 → CafeScrapContent.nhn?clubid&articleid… → source_blogId 값 = 아이디
         실패 「ID 조회 불가한 게시글」, 재시도 2번
 → 결과 파일 저장(아이디·닉네임·등급·게시판·제목)
```
### 1-3. 결과 항목
아이디 · 닉네임 · 등급 · 게시판 이름 · 글 제목(2023-10 추가).

## 2. 카페 초대장 발송 2.0
### 2-1. 기술
아이디 추출기와 같은 로그인·카페 불러오기 + IP 바꾸기(`GetExternalIp`·`IP_Confirm`·USB 테더링 `getDevice`/`Tethering`·유동 IP 프로그램 단축키 `Alt_P` 흉내 `keybd_event`) + 여러 계정 대기열(`Queue`).
### 2-2. 입력
`1. 아이디 세팅 텍스트파일.txt`(탭 구분 아이디·비밀번호 여러 줄) · `2. 카페 리스트.txt`(초대 받을 내 카페 주소) · 대상: 「추출 카페 주소 + 게시판 + 추출 수」로 바로 뽑거나 `3. 타겟 아이디.txt` · 「ID 발송 제한수」·「카페 발송 제한수」·「로그인 전 대기 시간」.
### 2-3. 흐름
```
전체_작업: 업데이트 확인 → 계정 대기열 → 계정마다 [IP 바꾸기] → 로그인
 → 초대할 내 카페마다 Cafe_ID(CafeGateInfo.json?cluburl= → cafeId)
 → 대상 아이디마다:
    발송내역.txt(Read_DB)에 있으면 건너뜀(「발송된 계정 제외」)
    초대진행: POST m.cafe.naver.com/CafeInviteNaverIdResult.nhn  body clubId=…&naverIds=…
       (Referer CafeInviteNaverId.nhn?clubId=, X-Requested-With)
       result.success=True → 「초대장 발송 완료」 + Write_DB(발송내역.txt 한 줄 추가)
       실패 → result.message 기록, 네트워크 오류는 3번 재시도
    응답 문구로 다음 동작:
       「권한이 없습니다」 → 이 카페 대기열 뒤로(이 계정은 초대 권한 없음)
       「초대메일 월 발송건수를 초과」·「초대 금지」 → 이 카페 빼기
       「일일 허용된 카페 초대 수를 초과했습니다」 → 「계정 일일 할당량 도달」 → 다음 계정
       ID 발송 제한수 도달 → 다음 계정
 → 더 이상 초대 가능한 카페가 없으면 끝
```
### 2-4. 대상 아이디 추출(발송기 안)
`게시글_작성ID추출`: `cafe-articleapi/v2.1/cafes/{cafeId}/articles/{articleId}?tc=cafe_member_profile…` → `result.article.writer.id`. 추출기의 스크랩 화면 방식과 다른 두 번째 우회 경로.

## 3. 네이버 쪽 사실 (2024~2026 원본 기준, 개발 때 다시 확인)
| 항목 | 값 |
|---|---|
| 초대 제한 | 계정당 하루 50건 · 카페당 한 달 300건(원본 「필독 주의사항」) |
| 초대 권한 | 카페 운영진 권한이 있어야 함(「권한이 없습니다」) |
| 초대 방식 | 초대장이 **받는 사람 네이버 메일**로 감(「초대메일 월 발송건수」) |
| 카페 제한 문구 | 권한이 없습니다 · 초대메일 월 발송건수를 초과 · 초대 금지 · 일일 허용된 카페 초대 수를 초과했습니다 |
| 열람 범위 | 2024-04-23부터 가입한 카페만, 2026-03-11부터 공유 가능한 글만 아이디 조회 가능 |
| 가입 카페 목록 | `apis.naver.com/cafe-home-web/cafe-home/v1/config/join-cafes/groups/?page=` → `message.result.groups[0].cafes[]`(cafeName·cafeId·cafeUrl), `pageInfo.lastPage` |
| 게시판 목록 | `apis.naver.com/cafe-web/cafe2/SideMenuList?cafeId=` → `message.result.menus[]`(menuName·menuId·menuType·boardType) |
| 글 목록 | `apis.naver.com/cafe-web/cafe2/ArticleListV2dot1.json?search.clubid&search.menuid&search.page&search.perPage=50` → `message.result.articleList[].item`(memberKey·articleId·writerNickname·menuName·subject·memberLevel) |
| 등급 정보 | `apis.naver.com/cafe-web/cafe-mobile/CafeMemberLevelInfo?cafeId=` |
| 카페 주소 → 번호 | `apis.naver.com/cafe-web/cafe2/CafeGateInfo.json?cluburl=` → `message.result.cafeInfoView.cafeId` |

> 이 주소들은 네이버 공식 공개 API가 아니라 카페 웹 화면이 내부에서 쓰는 주소다. 예고 없이 바뀐다(원본 업데이트 내역에 「추출 막힘 대응」 반복).

## 4. 위험·문제점
| 항목 | 원본 | 우리 |
|---|---|---|
| 숨은 아이디 얻기 | 스크랩 화면·글 API로 비공개 아이디 추출 | §7 결정 전에는 만들지 않음 |
| 보안 알림 자동 승인 | 메일함을 읽어 「예」 자동 클릭 | ❌ 만들지 않음 |
| 여러 계정·비밀번호 파일 | 탭 구분 평문 | ❌ 회원 본인 계정 하나, 비밀번호 다루지 않음 |
| IP 바꾸기 | 테더링·유동 IP 단축키 | ❌ 기본 꺼짐 |
| 탐지 회피 크롬 | `UndetectedChromeDriver` | ❌ 회원의 평소 크롬 + 우리 확장 |
| 직접 요청 | 초대를 화면 없이 POST | 회원 화면에서 사람처럼 |
| 제한 뒤 계속 | 다른 카페·계정으로 넘어가 계속 | 제한 문구가 뜨면 그날 중지 |
| 동의 없는 초대 | 모르는 사람 메일함으로 초대장 | 정보통신망법 제50조(광고성 정보) 위험 — §7 |

## 5. 개발에 쓸 것
1. **가입 카페·게시판 자동 불러오기**: `naver-cafe-poster`의 약점(카페 번호·게시판 번호를 직접 찾아 넣음)을 없앤다 — 회원 확장이 회원 로그인 상태로 가입 카페 목록·게시판 목록을 읽어 고르게 함. **포스팅 프로그램에도 바로 쓸 수 있는 개선**(대상 회원 본인 카페, 공개 화면 정보).
2. **카페 주소 → 카페 번호**(`CafeGateInfo`) 자동 변환 — 같은 이유.
3. **네이버 제한 문구 4개 판정표**(§3) — 초대를 만들 경우 그대로 「그날 중지」 판정에 사용.
4. **보낸 기록으로 중복 초대 막기**(원본은 텍스트 파일) — 우리는 회원별 DB, 보관 기간은 주인님 지정 필요(플랜 질문 4).
5. 거르기 항목: 탈퇴 멤버·새싹 등급·매니저 제외·등급 범위.

## 6. 쓰지 않을 것
숨은 아이디 우회 추출(결정 전) · 보안 알림 메일 자동 승인 · 메일함 읽기 · 여러 계정 · 비밀번호 파일 · IP 바꾸기 · 탐지 회피 드라이버 · 초대 직접 POST · 제한 뒤 다른 계정·카페로 계속 · 원격 사용 허가.

## 7. 주인님 결정이 필요한 것 — 「초대 대상 아이디를 어디서 얻을까」
| 선택지 | 방법 | 지침 | 효과 |
|---|---|---|---|
| A. 원본 방식 | 가입 카페 글 → 스크랩 화면·글 API로 숨은 아이디 | 마케팅 예외 §4 「우회로만 보이는 것 제외」에 걸림 | 가장 많이 모음, 네이버가 막으면 끝 |
| **B. 회원이 아는 사람 (추천)** | 회원이 직접 넣은 아이디 + `blog-neighbor-care` 관계 기록의 **서로이웃 수락한 이웃**(블로그 아이디 = 네이버 아이디) | 관계가 있는 사람이라 동의에 가까움, 공개 정보 | 양은 적지만 안전, 기존 프로그램과 연계 |
| C. 초대 대신 홍보 글 | 가입 카페에 내 카페 소개 글(카페 규칙 안에서, `naver-cafe-poster`) | 문제 없음 | 초대 기능 없음 |

추천: **B**(필요하면 C와 함께). A는 주인님이 「관리자 지정 예외」로 명시하실 때만, 그 경우에도 공유 가능한 글 범위·하루 상한·제한 문구 즉시 중지를 지킨다.

## 8. 미확인
- 초대장에 회원 문구를 넣을 수 있는지(원본은 문구 칸 없음)
- 아이디 추출기의 등급 범위·페이지 수 기본값
- 보강: 윈도우 ILSpy로 `초대진행`·`게시판_탐색` 복원(코드 옮기지 않고 분기·숫자만)
