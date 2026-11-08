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
### 2026-11-08 Codex 맥미니 A-6 검수 결과
- 세션: `codex-mac-20261107-test-analysis` · 주인님 「진행해」로 기존 음악 담당과 desktop 범위 분리 승인. 사이트 v1.43, 윈도우 담당의 엔진 버전 변경을 반영해 **0.7.5**로 제작.
- 파일: `desktop/release/AI-Free-Music-Engine-0.7.5-mac-x64.dmg` · **110,894,973바이트(110.89MB)** · SHA256 `7f09e12c6af52f51bad272eb6e0b93324df1b8979836fc7b3ab8a4a189ac05cd` · `hdiutil verify` 정상. 서명·공증 없음, 로컬 제작본 실행에서는 보안 확인 창이 나타나지 않음(다른 기기의 Gatekeeper 통과를 보장하지 않음).
- 설치: `/Applications/FreeMusicEngine.app`. 최종 DMG 설치본 실행 후 **4.14초에 로컬 상태 서버 응답**, 한국어 상태 창 정상. **음악 엔진 준비 완료 시간은 측정 불가**: ready=false·stage=미지원.
- 사이트 연결: 로컬 상태 `paired=true` 확인. 주인님 제공 v1.43 PC 검사 화면과 로컬 장비 일치: macOS 15.8.1, Intel i7-8700B 3.20GHz·12논리코어, RAM64GB, 여유233GB, MP3 도구 있음, darwin x64. GPU·그래픽 메모리·장치는 확인 불가. 검수용 ego 작업 공간은 종료(기존 사용자 탭은 유지).
- **프롬프트 정정**: 「Intel CPU로 느리게 생성」은 현재 코드와 다름. 기존 `engine/src/device.mjs`가 Intel 맥을 명시적으로 거부한다. 이번에는 그 제한을 변경하지 않음. 10초 생성은 실행하지 않았으며, Apple Silicon/MPS·arm64 패키지·자동 시작은 미검수.
- 실패와 수정: 256px 아이콘의 `Icon must be at least 512x512` → mac 전용 1024px 생성. 패키지 앱이 ready 전 SIGTRAP 종료 → Mac afterPack에서 Electron Helper 4종의 폴더·실행 파일·CFBundleExecutable 이름을 일치시켜 수정. mac 데이터 경로·SIGTERM 종료·open-url 처리·미지원 표시도 보완. 참고: https://github.com/electron-userland/electron-builder/issues/9771 (외부 코드 복사 없음).
- 검증: Mac helper 보정/멱등성 및 Windows no-op 명시 시험 **2/2 통과**, 문법 검사 통과, 최종 패키지 엔진 소스39개가 공유 원본과 일치, 진단용 코드 제거 확인. 최종 DMG 재설치·실행 통과. 전체 저장소 시험 통과를 뜻하지 않음.
- 공유 환경 복구: Windows `desktop/node_modules`를 원래대로 돌려놓고 electron.exe PE 확인. Mac 의존성·실패한 옛 DMG는 ignored `.mac-build/`에 분리, DMG 볼륨 연결 해제. npm install을 잘못 루트에서 한 번 실행한 건은 추적 파일 변경 없이 원래 Windows 선택 의존성 무결성 검증·복구. 루트 `node --test` 오실행은 해당 프로세스 트리 종료, 전체 시험 결과로 채택하지 않음(`docs/ERROR_LESSONS.md`).
- 남은 일: **DMG 제작·앱 실행·연결 검수만 완료**, Mac 음악 생성 지원 완료 아님. Intel 지원 방침/Apple Silicon 실물 확보 후 검수와 다운로드 공개 범위를 결정. 윈도우 담당은 기존 Windows 의존성으로 0.7.5 exe 작업 재개 가능. Mac 버튼·engine-latest.json 등록·매뉴얼·사이트 배포는 그 결정 후 담당 세션에서 처리. 「설치할 수 없습니다」는 설치 성공과 혼동되므로 「음악 생성 미지원」 문구 개선 제안(사이트 코드는 이번 변경 안 함).
- 자동화 수치: 설치·앱 실행·로그인·연결 **4단계 분류**(로그인·보안 확인은 사용자), 이 장비는 미지원이므로 매일 조작·생성 동의 횟수 측정 불가. 비용: 외부 유료 API·배포 없음.

### 후속 환경 대기 결정(2026-11-08)
주인님 「다음에 환경이 준비되는 것으로 하고 처리해」. A-6의 남은 Apple Silicon/arm64 생성 검수·Mac 공개는 환경 준비 후 재개. x64 설치·실행·연결 성공 기록은 유지하며 음악 생성 지원 완료로 표시하지 않는다.
