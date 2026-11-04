# [윈도우 → 맥미니 요청] naver-cafe-recruit 확장 만들기 전 네이버 화면 실물 확인 (2026-11-05)

작성: 윈도우 `claude-win-blog` [역할: blog] · 대상: 맥미니(ego, 시험 계정 `buylifemall@naver.com` 본인 로그인 상태)
이유: 확장이 누를 버튼·읽을 칸을 추측으로 만들지 않는다(봇 탐지 회피 원칙 `docs/PLATFORM_PATTERNS.md` §20, `blog-neighbor-care`의 검수된 DOM 프로필 방식). 아래는 **읽기·관찰만** — 초대·게시 버튼은 누르지 않는다.

## 지금 상태
- 운영 DB 적용 완료(`ncr_settings`·`ncr_targets`·`ncr_sent`, `ncr_dispatch`·`ncr_cleanup`). 확장 계약: 초대 전 `next_target({cafe_id})` → `{phase:'invite', naver_id}` / `{phase:'waiting', reason:'outside_window'|'daily_cap'|'limited_today'}` → 화면 결과 확인 뒤 `sent_mark({cafe_id, naver_id, result:'sent'|'failed'|'limited', detail})`. A 수집은 `targets_add({source_mode:'extract', rows:[{naver_id,nickname,member_grade,cafe_id,board_name,article_title}]})`.
- 웹 v1.01 뼈대(미배포). 화면은 로컬 빌드 통과.

## 확인할 것 (화면마다 주소·구조·문구를 캡처와 함께 기록)
1. **카페 멤버 초대 화면**(내가 운영하는 시험 카페 기준): 들어가는 주소, 초대 대상 아이디 넣는 칸, 초대 메시지 칸 유무, 보내기 버튼, **보낸 뒤 성공 표시**, 실패·제한 문구 원문(권한 없음·하루/월 한도 초과·초대 금지 회원 등). 프레임(iframe) 구조와 카페 번호(club id) 위치.
2. **가입 카페 목록**: 로그인 상태에서 내가 가입·운영한 카페 목록이 나오는 화면 주소와 각 카페의 번호·이름·운영자 여부 표시.
3. **게시판 목록**: 카페 안 게시판(menu id·이름) 목록이 나오는 곳.
4. **글 목록의 작성자 정보**(모드 A): 글 목록·글 화면에서 작성자 아이디·닉네임·등급이 어디에 어떤 형태로 있는지, 「공유 가능한 글」을 구분할 수 있는 표시가 있는지, 탈퇴 회원·매니저 표시.
5. **보안문자·로그인 풀림·계정 불일치**가 어떻게 보이는지(멈춤 조건).

## 결과 남길 곳
- `naver-cafe-recruit/docs/DOM_CHECK_20261105.md`(새 파일)에 화면별 표 + 캡처 경로. 코드 파일은 고치지 않는다(이 폴더는 윈도우가 작업 중, `docs/ACTIVE_WORK.md`).
- 끝나면 `docs/HANDOFF.md` 맨 위에 한 줄 + 요청함 report.
