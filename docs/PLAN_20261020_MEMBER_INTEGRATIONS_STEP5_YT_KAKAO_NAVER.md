# 개발 플랜 — 회원 연동 정보 공용 저장 ⑤단계: YouTube·카카오·네이버 로그인

- 작성: 2026-10-20 Claude Code(윈도우) · 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)
- 근거: 루트 `CLAUDE.md` 「회원 연동 정보 공용 저장·재사용 규칙」, [`MEMBER_INTEGRATIONS.md`](MEMBER_INTEGRATIONS.md) §5, ④단계 완료 후 주인님 「진행해」
- 상태: 플랜 보고 — 승인 후 구현

## 1. 조사 결과 (코드 기준)
| 플랫폼 | 프로그램 | 버전 | 자기 표 | 앱 키(회원 본인) | 요청 권한 | 토큰 |
|---|---|---|---|---|---|---|
| YouTube | 유튜브 댓글(`youtube-auto-reply`) | v1.13 | `ytreply_accounts`(회원당 1개, 채널) | `google_client_id`·`secret` | `youtube.force-ssl` | 1시간 + 갱신 토큰 |
| YouTube | shots(`shots`) | v1.21 | `youtube_accounts` | 같은 `google_client_id`·`secret` | `youtube.upload`+`youtube.readonly` | 1시간 + 갱신 토큰 |
| 카카오 | 카카오 포스팅(`kakao_auto_poster`) | v1.23 | `user_kakao_accounts` | `kakao_rest_api_key`·`client_secret` | `talk_message` | 갱신 토큰(바뀌어 돌아옴, 만료일 있음) |
| 네이버 로그인 | 네이버 카페(`naver-cafe-poster`) | v1.23 | `ncafe_accounts` | `naver_client_id`·`secret` | (네이버는 권한 이름 없음) | 갱신 토큰 |

**Threads·Instagram과 다른 점**: 세 플랫폼 모두 짧은 접근 토큰을 **갱신 토큰(refresh_token)** 으로 다시 받는다. 갱신 토큰은 **발급한 앱(Client ID)으로만** 쓸 수 있으므로, 공용 계정은 `app_ref`가 지금 회원이 등록한 앱 ID와 같을 때만 쓴다(앱 키를 바꾼 회원은 자기 표로).

카카오·네이버는 지금 쓰는 프로그램이 하나씩뿐이다 — 이번에는 **공용 표에 등록(이중 기록)해 메인 「내 연동 정보」에 보이고, 다음에 만드는 프로그램이 바로 가져다 쓸 수 있게** 하는 것이 목적이다.

## 2. 설계
1. Threads·Instagram과 같은 방식: 연결 콜백 이중 기록 → 읽는 곳은 공용 계정(권한·`app_ref` 일치·재연결 필요 아님) 먼저 → 없으면 자기 표. 해제는 공용 행도 삭제(설정 안내 문구).
2. **토큰 갱신은 읽은 곳에 기록**: 공용 계정이면 `updateMemberAccountToken`(새 접근 토큰·만료, 카카오처럼 갱신 토큰이 바뀌면 그것도), 갱신 실패(폐기)는 `markMemberAccountNeedsReconnect`.
3. YouTube 권한은 두 프로그램이 달라(관리 vs 업로드) 지금은 각자 자기 표를 쓰게 된다 — 권한은 합치지 않는다(③·④단계 규칙). 나중에 Google 「추가 권한 요청(include_granted_scopes)」으로 한 번에 받는 개선은 개선 목록에 남긴다.
4. 기준 공용 부품은 바꾸지 않는다(필요한 함수가 이미 있음). 사본 3개 추가 등록(`youtube-auto-reply`·`kakao_auto_poster`·`naver-cafe-poster`, shots는 이미 있음).

## 3. 순서 (한 프로그램씩 빌드 → 배포)
| 순서 | 프로그램 | 내용 |
|---|---|---|
| 5-1 | 유튜브 댓글 v1.14 | 이중 기록·공용 우선(`force-ssl`)·갱신 공용 반영·해제 |
| 5-2 | shots v1.22 | 같은 방식(`upload`+`readonly`) |
| 5-3 | 카카오 포스팅 v1.24 | 같은 방식(`talk_message`), 바뀐 갱신 토큰 저장 |
| 5-4 | 네이버 카페 v1.24 | 같은 방식 |
| 끝 | 백필 4개 + DB 버전 | 운영 DB 쓰기 — 코드 배포 후 승인받아 크롬 SQL Editor, 그다음 크롬 화면 검수 |

## 4. 검수
- 프로그램마다 tsc·build(테스트 있으면 실행)·사본 검사. 크롬(관리자): 각 설정 화면 연결 표시, 메인 「내 연동 정보」에 YouTube·카카오·네이버 표시. **실제 업로드·댓글 답글·카카오 발송·카페 글쓰기·해제·재연결은 하지 않는다.**

## 5. 비용
- 유료 API 호출 없음. Vercel 빌드 4회(순차). DB 표 변경 없음, 운영 DB 쓰기는 백필 1회 묶음(승인 필요).

## 6. 위험과 대응
- 갱신 토큰을 두 곳(자기 표·공용 표)에 두면 카카오처럼 갱신 때 토큰이 바뀌는 플랫폼은 한쪽이 옛 토큰이 된다 → 읽은 곳에만 기록하고, 공용이 실패하면 자기 표로 넘어가므로 멈추지 않는다(최악은 「다시 연결」 안내).
- Google은 다시 동의할 때만 갱신 토큰을 준다 → `saveMemberAccount`가 같은 앱이면 기존 갱신 토큰을 지킨다(이미 구현).
