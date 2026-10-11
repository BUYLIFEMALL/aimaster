# v1.76 — 숨겨진 편집기 대기와 실행 만료 검수

## 확인된 장애

일반 회원의 1장 검수 원고 `0591ccb4-136c-4ffd-95c9-f92c354860fb`, 실행 `892c502b-2172-48b1-9da2-d7f84275de83`는 본문 입력11/11 후 `imageAi [20261010.4/locate]`에서 실행 연결 만료로 실패했습니다. 최종 발행은 하지 않았고 published_at/post_url은 NULL입니다. 당시 worker heartbeat는 계속 갱신됐지만 페이지 명령의 실행 기한은 주입 시각의 값으로 고정됩니다. 2장 원고는 수정·저장·직접 검수까지 완료한 draft이며 아직 전송하지 않았습니다. 3·4장 준비는 미실행입니다. 5장 원고의 v1.75 prepared18/18 증거는 별개이며 보존합니다.

Chrome은 숨겨진 페이지의 반복 타이머를 지연시킵니다. 원고 탭을 숨긴 당시 경과와 부합하는 원인 후보이며 실제 타이머 간격을 계측한 것은 아닙니다. 동일 editorCommand를 실행하는 모의 검사에서 페이지의 setTimeout을 1분씩 지연시키면 기존 v1.75 코드가 같은 만료 오류로 실패합니다. 참고: [Chrome 타이머 설명](https://developer.chrome.com/blog/timer-throttling-in-chrome-88/), [확장 메시지 API](https://developer.chrome.com/docs/extensions/develop/concepts/messaging).

## 수정

- extension/editor.js: 짧은 wait를 페이지 setTimeout 대신 chrome.runtime.sendMessage로 worker에 요청합니다. 확인 응답 전후에 기존 실행 번호/기한을 검사합니다. worker 연결 실패 시 즉시 중단하며 페이지 타이머로 우회하지 않습니다. 진단 build는20261011.1입니다.
- extension/background.js: editorWait는 같은 확장 ID·네이버 HTTPS 탭에서만 허용합니다. 1~1000ms 대기를 허용하며 실행 중에는 같은 activeTask의 runId/탭/작성 단계와 기한을 대기 전후에 확인합니다. 실행 임대를 연장하거나 서버 확인을 생략하는 새로운 권한을 부여하지 않습니다. 기존 웹 브리지는 categories만 허용합니다.
- 서버 API·회원 키·환경변수·DB 스키마 변경 없음. 준비 모드의 최종 발행 차단 유지. BLOG/올인원 코드 수정 없음.
- 전체 검사에서 발견한 test-category-selection.cjs의 오래된 저장 모의도 현재 PostSaveClient와 서버 저장 확인 응답을 사용하도록 갱신했습니다. sourceEpoch 누락은 검사 환경 문제였으며 실제 저장 프로그램의 오류로 기록하지 않습니다.

## 자동 검사와 릴리스

새 editor 검사4개와 worker 시나리오3개 추가. 기존 v1.75를 직접 로드했을 때 숨겨진1/5장 타이머 검사는 실패하고, 수정 후 editor10개/worker37개 통과합니다. 연결 종료 후 추가 AI 표시0·기한 만료 중단·다른 실행/탭/출처 차단도 확인했습니다. 전체 scripts/test-*.cjs를 Node test runner로 실행해131개 통과(독립 스크립트 검사 집계 포함, worker37개와 중복 합산하지 않음). JS 문법·로컬 npm run build/TypeScript 통과.

코드/확장/ZIP v1.76을 준비했습니다. 운영 배포·DB3개 릴리스 필드 동시 갱신·라이브ZIP200/14파일 일치·PC 확장 적용은 실제 완료 후 아래에 기록합니다. 이 문서의 코드 수정/모의 검사만으로 실제 Chrome 문제가 해결됐다고 주장하지 않습니다.

## 이어서 할 일

1. v1.76 운영 배포/ZIP/DB 확인 후 queued/publishing0을 확인하고 이 PC의 에이전트 확장만 새로고침합니다. 기존 원고를 삭제/이동하지 않습니다. 다른 PC는 ZIP 재다운로드→기존 폴더 덮어쓰기→chrome://extensions 새로고침이 필요합니다.
2. 1장 실패 원고를 회원 화면에서 확인 후 준비 모드·비공개·예약 없음으로 재전송합니다. 새 탭과 입력/AI 표시/설정/서버 prepared ACK를 확인하며 숨겨진 탭 조건도 별도로 검사합니다. 실제 최종 발행 금지.
3. 2→3→4장 원고의 실제 준비 확인. 4장 원고 BODY1 이미지에는 깨진 글자가 있어 개별 교체 검수가 필요합니다. 생성 이미지 장수·HTTP200만으로 품질 통과를 선언하지 않습니다.
4. 개별 교체·삭제/부분 실패 복구는 별도 실제 화면 증거를 남깁니다. 이미 성공한 이미지의 일괄 재생성은 하지 않습니다.

라이브: https://naver-blog-agent.vercel.app
