# v1.63 탭 닫힘·재시작 검수 기록

운영 주소: https://naver-blog-agent.vercel.app

## 확인한 문제와 수정

Chrome 확장 오류 화면에서 `Uncaught (in promise) Error: No tab with id: 693809025.` 및 `background.js:1`을 직접 확인했습니다. 이 기록만으로 최초 실패가 발생한 특정 API 호출을 단정하지 않았습니다. 모든 탭 조회·이동·스크립트 주입 경로와 비동기 이벤트를 조사·보완했습니다.

- 탭 존재를 확인하되 조회 이후 실행 전 탭 소실도 처리합니다. 닫힘/교체 참조만 정리하며 연결 정보·원고·체크포인트·미보고 결과를 보존합니다.
- 저장 변경을 순차 처리하고 세션 저장 시 현재 탭 번호를 대조하여 이전 탭 응답이 새 세션을 덮어쓰지 않게 합니다.
- Chrome `onUpdated`의 Tab을 사용해 이벤트 처리 중 추가 조회를 없앴습니다. 이벤트·타이머·시작점의 Promise 실패를 처리하며 상태 저장 실패도 처리합니다.
- 작성 재시작은 `EDITOR_INTERRUPTED`, 작성/로그인 중 탭 소실은 `EDITOR_TAB_CLOSED`, 최종 발행 이후는 `PUBLISH_UNCERTAIN`으로 중지합니다. 자동 재입력/재발행하지 않습니다.
- 성공 결과를 먼저 보관합니다. 서버 결과 보고 실패가 이미 확정된 발행 성공을 실패로 바꾸지 않으며 다음 폴링은 결과 보고만 재시도합니다.
- 빈 프레임 응답을 상태 안내로 처리하고 권한 오류는 숨기지 않습니다. 카테고리 조회 뒤 요청 웹 탭이 닫혀도 성공 조회 결과를 보존합니다.

Chrome API의 Promise 실패 처리 및 Tab 이벤트 정의는 [공식 Tabs 문서](https://developer.chrome.com/docs/extensions/reference/api/tabs), 주입 응답은 [공식 Scripting 문서](https://developer.chrome.com/docs/extensions/reference/api/scripting)를 확인했습니다.

## 자동 검수

`npm run test:extension-tabs` 16개 시나리오는 실제 background.js 전체를 VM에 로드하고 Chrome API/웹 큐를 모의 실행합니다. 탭 닫힘/교체/조회 후 소실/포커스 이동 중 소실/잘못된 프레임 응답/권한 오류/본인 편집기 재연결/로그인 대기 중 소실/본문 입력 중 소실/final 클릭 중 소실/worker 재시작/늦은 세션 저장/성공 결과 보고 통신 실패/닫힌 요청 웹 탭/이벤트 및 저장 실패를 확인했습니다.

같은 검사를 `node scripts/test-extension-tabs.cjs 96a35d20`으로 이전 코드에 실행하면 첫 시나리오에서 editorTab=1 잔존으로 실패합니다. 수정 코드는 전부 통과합니다. `test:extension`, `test:publishing`, `test:edit-save`, background 및 검사 JS 문법 검사, `npm run build`(타입/컴파일 포함) 통과. extension/scripts는 기존 Next ESLint 대상 제외이므로 린트 통과를 주장하지 않습니다.

## 실제 PC 확인과 한계

- PC 로컬 확장 ID `jghcffojjhpadflbhmdbophincpciajm` 새로고침 후 v1.63 표시를 직접 확인했습니다.
- 기존 No tab 오류 1건을 확인·기록한 후 삭제했으며 새 오류 발생 여부를 별도로 관찰합니다.
- DevTools는 열렸으나 keyboard 입력이 `window_not_focused`로 실패했습니다. 허용된 한 번의 restore 후에도 실패했고 semantic set-value도 실제 반영되지 않았습니다. 실제 네이버 입력/탭 소실 재현은 통과로 주장하지 않습니다.
- 시험 회원의 운영 원고는 draft 57건/failed 1건으로 대기/발행 중 원고 없음 확인. 보존 표본 2건: 검수용 `7e261a30-f5d3-4199-b150-5d732401f02c` draft, 기존 `c637563d-45c7-4206-b59f-8206bceaa3b4` failed. 본문 MD5 `94299701e2197e9e13840b72afee3152`, 이미지 MD5 `93e462b86d458556965c363b381bc1cc`. 본문/이미지/상태는 수정하지 않았습니다.
- 최종 발행·유료 호출·키/환경변수/DB 스키마 변경은 없습니다. DB 변경은 프로그램 버전 메타데이터에 한정합니다.

## 운영 배포

코드/패키지/manifest/ZIP v1.63 준비. 커밋·푸시·프로덕션 배포 후 DB 버전·라이브 ZIP HTTP200/manifest/소스 해시·공개 버전 API·기존 원고 지문을 확인하고 아래에 결과를 이어서 기록합니다.

다른 PC 적용: 최신 ZIP 재다운로드→기존 폴더에 덮어쓰기→`chrome://extensions` 새로고침.
