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

코드 커밋2ea93dbe를 origin/master에 푸시하고 해당 커밋의 격리 worktree로 에이전트만 프로덕션 배포했습니다. 프로젝트prj_uns69mwxF4wJARy1ViF2Lgj0PzWT/team buylife 확인. dpl_G98H1G6twPW39TKiunXAhJQBzJEJ READY·운영alias 확인, 클라우드 빌드/타입도 통과했습니다. 배포URL https://naver-blog-agent-n2e67mc0z-buylife.vercel.app 입니다.

programs.version/extension_version/extension_download_url을 같은 SQL로 갱신했습니다. 릴리스 검사 실패0/경고0, 라이브ZIP HTTP200/manifest v1.76/실제14파일 소스와 줄바꿈 정규화 후 일치(디렉터리 항목 포함하면15개). login/버전API200,15분 범위 서버 error 로그 없음. 장기 무장애 증거나 실제 회원 준비 성공 증거로 간주하지 않습니다.

회원 queued/publishing0 확인 후 전용 Chrome 창에서 에이전트 확장 ID jghcffojjhpadflbhmdbophincpciajm의 새로고침만 실행했습니다. 실제v1.76·사용 설정됨·로드 경로 D:\Antigravity\AIMaster\naver-blog-agent\extension 확인. 다른 확장/기존 편집기 수정 없음. 기존 보호 원고5건과 새5장 prepared 원고의 상태/content/images MD5는 모두 이전 증거와 일치하며 published_at/post_url NULL입니다.

## 실제 Chrome 재검수 재개 조건

현재 검수 전용 창19532794는 일반Chrome PID25100입니다. 공유 창에서 다른 CLI가 화면을 바꾸므로 Chrome 메뉴의 새 창으로 별도 검수 창을 만들었습니다. 주소 Enter 입력은 처음 window_not_focused였고 restore1회도 해결되지 않았지만 주소 제안 항목 클릭으로 확장 화면에 접근했습니다. 별도 새 창에서는 Enter 이동도 확인했습니다. 접근성 호출 성공만으로 페이지 이동을 주장하지 않았습니다.

웹 프로그램 접속은 /login?redirect=%2Fdashboard로 이동했습니다. 회원 세션이 없어1장 재전송을 실행하지 않았습니다. 주인님께 buylifemall@naver.com 직접 로그인만 요청했으며 비밀번호/API 키/쿠키/토큰은 요청하거나 읽지 않습니다. 로그인 완료 응답 없이 관리자 계정/DB 쓰기로 대신 검수하지 않습니다. 따라서 실제1~4장 준비·개별 교체/삭제·부분 실패 복구는 아직 미완료입니다.5장 v1.75 성공 증거와 이번 자동 검사·배포 증거를 구분합니다.

## 이어서 할 일

## 로그인 복구 후 실제 추가 검사

로그인 화면 확인 뒤 정상 회원 세션이 복구됐고, 기존 검수 원고 보관함과 메인 블로그 buylifemall을 회원 화면에서 확인했습니다.1장 원고는 실행90e2cc5f-62c5-4c1f-b0cb-fcf67b912c2d로 재전송해 prepared11/11,2026-10-11T09:46:24.546Z 서버 ACK를 확인했습니다. 본문MD5 8cacdd28faf736b0c6904293ccedc4f7·이미지MD5 729ad6cacc556b9f6da13bd5f5419893, 비공개/예약없음/published_at/post_url NULL. 실제 네이버 원고·AI표시1개·태그/발행 설정 패널도 확인했고 최종 버튼을 누르지 않았습니다. 이 실행은 앞에 보이는 탭에서 완료됐으므로 숨겨진 상태 성공으로 간주하지 않습니다.

2장 원고는 실행1856376a-8918-4317-b528-155bdd576581에서 writing1/12 상태를 확인하고 확장 관리 탭을 선택해 네이버 탭을 숨겼습니다.12/12 입력까지 완료됐지만 imageAi [20261011.1/locate]의 AI 활용 스위치 부재로 failed,2026-10-11T09:50:38.751Z. 실행 기한 만료 오류와 구분하며 숨겨진 상태에서 UI 선택 문제를 추가 조사해야 합니다. 원고와 이미지 보존, 최종 발행 없음. 오래된 보관함 항목으로 재전송 시 저장 버전 충돌이 정상 차단됐고 웹 화면 새로고침·최신 원고 재열기로 복구했습니다. 전면 비교 실행fd76880e-6b70-4ffe-9517-f9589db5b118은2026-10-11T09:56:37.003Z prepared12/12·AI2·설정 패널·서버 ACK 통과했습니다. 본문/이미지 MD5 보존·최종 발행 없음. 후속v1.77은 본문 완료 후 작업 탭을 한 번 앞으로 가져와 실제 숨겨진3장 prepared13/13을 확인했습니다. 최신 증거는 FINAL_EDITOR_UI_2026-10-11.md와 IMAGE_TEXT_GUIDANCE_2026-10-11.md를 따릅니다.

4장 원고 BODY1 이미지를 다시 내려받아 깨진 글자가 있는 말풍선을 직접 확인했습니다. 장수·HTTP200 성공과 이미지 품질을 구분하며 개별 교체는 아직 실행하지 않았습니다.

1. v1.76 운영 배포/ZIP/DB/PC 갱신은 완료했습니다. 회원 로그인 복구 후 실제 화면의 계정과 준비 모드를 확인합니다. 다른 PC는 ZIP 재다운로드→기존 폴더 덮어쓰기→chrome://extensions 새로고침이 필요합니다.
2. 1장 실패 원고를 회원 화면에서 확인 후 준비 모드·비공개·예약 없음으로 재전송합니다. 새 탭과 입력/AI 표시/설정/서버 prepared ACK를 확인하며 숨겨진 탭 조건도 별도로 검사합니다. 실제 최종 발행 금지.
3. 2→3→4장 원고의 실제 준비 확인. 4장 원고 BODY1 이미지에는 깨진 글자가 있어 개별 교체 검수가 필요합니다. 생성 이미지 장수·HTTP200만으로 품질 통과를 선언하지 않습니다.
4. 개별 교체·삭제/부분 실패 복구는 별도 실제 화면 증거를 남깁니다. 이미 성공한 이미지의 일괄 재생성은 하지 않습니다.

라이브: https://naver-blog-agent.vercel.app
