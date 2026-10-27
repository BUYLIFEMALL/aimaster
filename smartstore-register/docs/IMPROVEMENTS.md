# 스마트스토어 상품등록 자동화 — 개선 기록


> **미배포 대기 (2026-10-27, v1.04 배포 뒤)**: 전시 상태 라디오 실제 이름이 `vm.singleChannelProductMap[channelServiceType].channelProductDisplayStatusType`라 못 찾던 것 → 라디오는 이름 끝부분으로도 찾음(`radio`). / 판매자센터 첫 화면이 45초 안에 안 뜨면 무조건 「로그인 확인」 문구를 내던 것 → 15초에 상품 등록 주소로 한 번 더 이동, 실패 시 실제 열린 화면 주소·제목 기록(`openCreateTab`). / 스마트 에디터 「등록」 뒤 닫힘이 20초를 넘겨 실패 → 사진 올리는 중 표시가 사라질 때까지 기다리고 닫힘 45초·15초에 한 번 더 누름(`extension/background.js` editorDone). / PC 「임시저장」 버튼은 `progress-button="vm.createTempSave()"`(ng-click 버튼은 휴대폰 전용 visible-xs라 숨김) → 두 모양 모두 찾고 확인 창이면 「확인」(`extension/background.js` submit). / 배송 택배사·배송비 칸이 selectize(숨은 select + 덮은 목록)라 v1.04 확장의 값 바꾸기가 되돌려짐 → 화면 목록을 열어 글자가 정확히 같은 보기를 누르고 화면 값으로 확인(`extension/background.js` select). / 「스토어 기본값」 저장 직후 배송비 고르기 상자가 잠깐 옛 값으로 보이던 표시 문제 수정(`DefaultsForm.tsx` select에 key). 저장 값은 정상이었음.
## 2026-10-26 v1.01 뼈대 (Claude Code 윈도우 `claude-win-sdp`)
1. **로직·기능**: 상세설명은 E3 HTML이 서버에 저장되지 않아 「섹션 이미지를 순서대로」 넣는 방식으로 설계(섹션 순서 `section_sequence` 따름). 네이버 「HTML 작성」이 `<style>`을 지우므로 확장이 넣을 HTML은 칸 안 스타일만 써야 함(0-2단계 시험으로 확정).
2. **UI·편의**: 칸 미리보기 표에서 필수값(*)·빠진 값 경고를 보내기 전에 보여 줌. 처음 사용자는 「입력만/임시저장까지」를 권장 문구로 안내.
3. **연계**: 상세페이지 자동화 상품을 그대로 읽음(같은 DB, 본인만). 상품소싱 → 상세페이지 정상가 연결을 그대로 탐. 쿠팡용은 같은 구조로 복사.
- 주의: Claude 크롬 확장은 스마트스토어센터를 열지 못함(안전 제한) — 화면 검수는 주인님 캡처·저장본·확장 결과 기록으로.
