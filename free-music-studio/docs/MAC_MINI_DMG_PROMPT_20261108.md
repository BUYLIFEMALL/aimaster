# 맥미니 전달 프롬프트 — AI 무료음악 엔진 맥 설치 파일(dmg) 만들기·실물 확인 (백로그 A-6, 2026-11-08)

> 주인님 지시(2026-11-08 「맥미니에 전달할 프롬프트 만들어줘」). 아래 「프롬프트」 칸을 맥미니 Claude Code에 그대로 붙여 넣는다.
> 작성: [역할: music] 윈도우 세션 `claude-win-20261024-music`. 결과는 맥미니 세션이 이 문서 맨 아래 「결과」 칸과 `docs/roles/mac-mini.md`에 남긴다.

## 프롬프트

```
너는 맥미니 Claude Code야. 작업 폴더는 SMB 공유 /Volumes/gt1_mega/Antigravity/AIMaster 하나만 써(맥 로컬 복제본 금지).
먼저 docs/MAC_MINI_AGENT_PLAYBOOK.md, free-music-studio/AGENTS.md(맨 위 「4. 버전」), 이 문서(free-music-studio/docs/MAC_MINI_DMG_PROMPT_20261108.md)를 읽어.

[할 일] AI 무료음악 자동화 엔진(Electron, free-music-studio/desktop + free-music-studio/engine)의 맥 설치 파일(dmg)을 만들고, 이 맥미니에 설치해 실제로 켜지는지 확인한다(백로그 A-6).

[예외 — 주인님 승인] dmg는 macOS에서만 만들 수 있어서, 이번 일에 한해 맥미니에서 npm install·electron-builder 실행을 허용한다(평소 규칙 「npm·빌드는 윈도우에 요청」의 예외). Vercel 배포·DB 쓰기·git push는 하지 않는다 — 윈도우 음악 세션(claude-win-20261024-music)이 이어서 한다.

[중요한 사실]
- 이 맥미니는 Intel(i7-8700B), Apple Silicon이 아니다. 그래서 음악 엔진(ACE-Step)은 CPU로만 돌고 매우 느리다. 그래픽 가속(MPS) 품질·속도 확인은 이 장비로 할 수 없다 — 「Apple Silicon 미검증」으로 남긴다.
- 엔진 버전은 0.7.4(free-music-studio/engine/src/main.mjs의 VERSION). 윈도우 설치 파일은 desktop/package.json 「dist」(electron-builder --win nsis). 맥용 설정은 아직 없다.

[순서]
1. 시작 전 git status --porcelain -- free-music-studio 로 다른 세션 미커밋 변경이 없는지, docs/ACTIVE_WORK.md에 free-music-studio 줄이 없는지 확인. 있으면 멈추고 주인님께 알린다. 없으면 ACTIVE_WORK에 내 줄을 넣는다.
2. free-music-studio/desktop/package.json의 "build"에 mac 설정을 추가: target dmg(x64 — 이 장비가 Intel. arm64는 만들 수는 있어도 여기서 실행 확인 불가라 x64만), icon은 build/icon.png(필요하면 .icns 변환), category public.app-category.music. 서명·공증(notarize)은 하지 않는다(인증서 없음 — 주인님 결정으로 코드 서명은 하지 않음). "scripts"에 "dist:mac": "node scripts/make-icon.mjs && electron-builder --mac dmg --x64" 추가. 윈도우 설정·dist 명령은 건드리지 않는다.
3. cd free-music-studio/desktop && npm install && npm run dist:mac. 실패하면 오류 원문을 그대로 기록하고 원인을 찾아 고친다(같은 오류로 3번 넘게 반복하지 말고 멈춰서 보고).
4. release/ 안의 dmg를 열어 응용 프로그램 폴더에 설치 → 처음 열 때 「확인되지 않은 개발자」 경고가 뜨면 우클릭 → 열기(주인님께 화면으로 안내). 엔진 창이 뜨는지, 엔진 상태가 「준비」까지 가는지(처음엔 uv·ffmpeg·ACE-Step 실행 환경을 받느라 오래 걸림) 본다. 실패하면 데이터 폴더의 <엔진>-log.txt부터 읽는다.
5. 맥미니 크롬에서 https://free-music-studio.buylife.xyz/engine 열기(주인님이 로그인) → 엔진 창의 연결 코드 6자리로 연결 → 「PC 검사」에 CPU·메모리·「Apple 맥」 장치가 맞게 나오는지 확인.
6. (선택, 시간이 되면) 곡 만들기에서 10초짜리 연주곡 1곡 — CPU라 오래 걸리면 「완료」까지만 확인하고 걸린 시간을 적는다. 중간에 멈춰도 실패로 단정하지 않는다.
7. 결과를 이 문서 맨 아래 「결과」 칸과 docs/roles/mac-mini.md에 적고, 바꾼 파일(desktop/package.json, 이 문서)을 node scripts/commit-paths.mjs "<메시지>" <경로>... --as <내 세션> 으로 커밋한다(push는 윈도우 세션이 묶어서). 커밋 직후 git show --stat HEAD | tail -1 로 바뀐 파일 수 확인. ACTIVE_WORK 내 줄 삭제.

[지켜야 할 것] 화면에 보이는 모든 문장은 한국어(진행 안내는 「~하겠습니다./~했습니다.」). 동그라미 숫자 금지. 비밀번호·키는 적지 않는다. 경로 없는 커밋·git add -A·--no-verify 금지. 주인님 로그인·보안 경고 허용은 주인님이 직접.

[보고] 끝나면 채팅에: dmg 파일 이름·크기, 설치·실행 결과(엔진 준비까지 걸린 시간), PC 검사 화면 값, (했다면) 10초 곡 걸린 시간, 실패와 원인, 커밋 번호, 윈도우 세션이 할 일(dmg를 사이트 public/downloads에 올리고 engine-latest.json에 맥 항목 추가·배포).
```

## 윈도우 음악 세션이 이어서 할 일 (맥미니 결과가 오면)
- dmg를 `free-music-studio/public/downloads/`에 두고 `engine-latest.json`에 맥 항목(`mac: { url, sizeMb, sha256 }`) 추가 → 「내 PC 엔진」 다운로드 센터에 맥 버튼(운영체제 자동 판별) → 사이트 배포(빌드 1회, 주인님 승인 범위).
- 매뉴얼(`/guide`) 설치 안내에 맥(「확인되지 않은 개발자」 → 우클릭 열기) 추가.

## 윈도우 음악 세션 메모 (2026-11-08 17:40)
- 엔진 버전이 **0.7.5**로 올라갔습니다(`engine/src/main.mjs`, 그림 그래픽 메모리 표시). 작업 중인 `desktop/package.json`의 `version`도 0.7.5로 맞춰 두었으니 dmg는 0.7.5로 만들어 주세요. 이 파일은 맥미니 세션이 커밋합니다(윈도우는 손대지 않음).
- 맥미니 `npm install`로 `desktop/node_modules`가 맥용이 되어 윈도우 설치 파일을 만들 수 없습니다. 끝나면 ACTIVE_WORK 줄을 지워 알려 주세요 — 윈도우가 다시 `npm install` 뒤 0.7.5 exe를 만듭니다.

## 결과
(맥미니 세션이 적는다)
