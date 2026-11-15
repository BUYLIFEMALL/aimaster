# 맥미니 요청 — GIF 변환 v1.29 맥 실물 확인 (렌더러 설치 · V4 화면 녹화 · 다른 브라우저)

> 요청: 윈도우 Claude Code 영상 담당 `claude-win-video`, 2026-11-15. 주인님 지시: 「테스트할 게 있으면 맥미니 쪽으로 요청할 내용과 인수인계 문서 만들어줘」.
> 대상: `video-to-gif` v1.29(운영 배포 `video-to-lbnh8gr5q`, 2026-11-15). 비용 없음(빌드·AI 호출 없음).
> 맥미니 규칙(`docs/MAC_MINI_AGENT_PLAYBOOK.md`): `npm`·빌드·배포·DB 쓰기 금지, 코드에 문제가 있으면 고치지 말고 기록만 해서 윈도우 영상 담당에 넘긴다. 브라우저는 Claude Code = 맥미니 크롬.

> **2026-11-15 주인님 세션 지정 정정:** 현재 맥미니 Codex 검수 브라우저는 **ego lite**입니다(「Chrome이 아니고 ego(lite) 브라우저야 정정해놔」). 아래 원 요청의 Chrome 지정은 이 세션에서 ego lite로 대체합니다. 이전 Chrome 도구 오류 기록은 당시 시도 기록이며 ego lite의 오류가 아닙니다.

## 0. 배경 — 이번에 바뀐 것
- 로컬 렌더러 설치 스크립트가 예전에는 **크롬 경로 한 곳에만** 연결 정보(native messaging)를 등록했다. v1.29부터는 4곳에 등록한다.
  - 맥: `~/Library/Application Support/{Google/Chrome, Chromium, Microsoft Edge, Naver/Whale}/NativeMessagingHosts/xyz.buylife.gif_renderer.json`
  - 삭제 스크립트(`uninstall-mac.sh`)도 4곳을 모두 지운다.
- 원본 연결 파일은 `~/Library/Application Support/BuylifeGifRenderer/xyz.buylife.gif_renderer.json`에 먼저 만든 뒤 4곳에 복사한다.
- 윈도우에서 확인한 것(2026-11-15, 이 PC): 4곳 레지스트리 등록 → ego lite에 확장 v1.29 설치 → 「로컬 렌더러 가동 중 · Ext v1.29 · Host 1.30」 → 5초 영상 GIF 변환 약 6초 성공.
  - ego lite와 Aside는 실행 파일 안에 크로미움·크롬 경로가 둘 다 들어 있다(정적 확인).
- 윈도우에서 못 한 것:
  - 맥 설치 스크립트 실물
  - V4 「화면에서 바로 녹화」 실제 녹화: 자동 조작 클릭은 브라우저가 화면 공유 요청을 열어 주지 않아, 사람이 직접 눌러야 한다
  - 웨일(agy 전용 브라우저)
  - Aside 실제 연결

## 1. 렌더러 v1.29 다시 설치 (맥 터미널)
```bash
curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash
ls -la ~/Library/Application\ Support/{Google/Chrome,Chromium,Microsoft\ Edge,Naver/Whale}/NativeMessagingHosts/xyz.buylife.gif_renderer.json
cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/xyz.buylife.gif_renderer.json
```
기대 결과:
- 마지막 안내가 「쓰는 브라우저(크롬·엣지·웨일·ego lite 등)에서 …」로 나온다.
- 파일 4개가 모두 있다.
- JSON의 `path`가 `…/BuylifeGifRenderer/host.pl`이고, `allowed_origins`가 `chrome-extension://efgimakonmphcdojhiegemjmpbokpcgk/`이다.

## 2. 크롬 연결 확인 (맥미니 크롬, 시험 계정 `buylifemall@naver.com`)
1. https://video-to-gif.buylife.xyz 첫 화면의 다운로드 센터에서 아래 4가지를 확인한다.
   - 「선택 · 설치 안 해도 바로 사용 가능」 배지
   - 「더 빠르게 쓰기」 버튼(이미 설치돼 있으면 처음부터 펼쳐져 있음)
   - 공식 최신 v1.29
   - 상태 표시
2. 확장이 v1.29가 아니면 「확장프로그램 받기 (ZIP)」로 받아 풀고, `chrome://extensions`에서 기존 폴더에 덮어쓴 뒤 새로고침한다.
3. 기대 결과: 「로컬 렌더러 가동 중 · 최신 버전 · Ext v1.29 · Host 1.30 (MAC)」
4. https://video-to-gif.buylife.xyz/dashboard 에 `video-to-gif/local-renderer/test/samples/silent.mp4`를 넣고 「초고속 렌더 시작」을 누른다.
   - 기대 결과: 대기열에 「완료 (약 2.5MB)」가 뜨고 다운로드가 된다.
   - 스튜디오 오른쪽에 「⚡ 내 PC 고속 변환 · 사용 중」이 보인다.

## 3. V4 화면 녹화 (사람 클릭 필요)
1. 같은 스튜디오 화면에서 「화면에서 바로 녹화」를 누른다.
   - 자동 조작으로 눌러 선택 창이 안 뜨면, **주인님께 직접 눌러 달라고 요청한다.**
   - 브라우저 보안 장치이므로 우회하지 않는다.
2. 처음이면 맥 「시스템 설정 › 개인정보 보호 및 보안 › 화면 기록」에서 크롬을 허용해야 할 수 있다. 이 허용은 **주인님이 직접** 한다(보안 설정이라 에이전트가 바꾸지 않음). 허용 뒤 크롬을 다시 시작해야 할 수 있다.
3. 탭·창·전체 화면 중 하나를 고르고 「공유」를 누른 뒤 5~10초 후 멈춘다. 15초가 지나면 저절로 멈춘다.
4. 기대 결과:
   - 대기열에 녹화본(webm) 1개가 들어간다.
   - 「초고속 렌더 시작」을 누르면 GIF가 완료되고 다운로드가 된다.
   - 오류 문구가 없다.
5. 기록할 것: 녹화 길이, GIF 크기, 화면 기록 권한 안내가 떴는지, 걸린 시간.

## 4. 다른 브라우저 (설치돼 있을 때만, 없으면 「미설치」로 기록)
| 브라우저 | 누가 조작 | 확인 |
|---|---|---|
| 네이버 웨일 | agy 전용 브라우저 — 맥미니 agy 세션 또는 주인님 | 확장 ZIP을 `whale://extensions`에 설치 → 첫 화면 「로컬 렌더러 가동 중」 |
| Aside | 주인님 지정이 있을 때만 | 확장 설치 → 「로컬 렌더러 가동 중」 |
| Microsoft Edge | 맥미니 미설치(2026-10-17 기준) | 미설치면 생략 |

## 5. 결과 기록과 돌려주기
- `video-to-gif/docs/IMPROVEMENTS.md` 맨 위에 「> **영상 담당께 (맥미니, 날짜)**: …」 한 줄로 1~4 결과를 적는다.
  - 통과 여부, 오류 문구, 걸린 시간, 미설치 브라우저를 함께 적는다.
- 커밋: `node scripts/commit-paths.mjs "<메시지>" video-to-gif/docs/IMPROVEMENTS.md --as <세션>` (내 파일만, 푸시 안 함). 커밋 직후 파일 수를 확인한다(맥미니 SMB 규칙).
- 채팅에는 윈도우 영상 담당(`claude-win-video`)에게 넘길 결과 한 줄을 남긴다.
- 실패하면 설치 스크립트·확장을 고치지 말고 오류 문구와 `ls` 결과만 남긴다. 고치는 일은 윈도우에서 Windows판·Mac판을 함께 한다.

## 2026-11-15 맥미니 결과 — ego lite 직접 변환

| 항목 | 판정 | 실제 확인 |
|---|---|---|
| 브라우저 | 정정 완료 | 사용자 지정 ego lite, 사용자 열린 공간8의 /dashboard, 로그인 kkuleomi24@naver.com(원 요청 Nav계정과 다름을 구분) |
| 웹 v1.29 | 확인 | 운영 UI v1.29·💾0B/500MB 표시. 메뉴 최신v1.26은 기존 미배포 수정 대상 |
| 내 PC 고속 변환 | 미검수 | 확장관리 실제 목록에 GIF 확장 없음. 운영 ZIP과 저장소 local-renderer/extension 파일 전체 일치·manifest v1.29 확인. 기존 맥 Host설치 통과와 확장 설치 여부를 구분 |
| silent.mp4 브라우저 변환 | UI 완료 | 5.0초·3.69MB 입력, 기본560px/40fps, WASM 실제 실행1회→완료2.53MB. 버튼 최초 클릭은 뷰포트 오류로 미실행, 현재 상태 확인 후 실제1회 실행 |
| 다운로드·캡처 | 미확인 | UI 완료 뒤 다운로드 시점 task space not found:8, 공간목록에서도8없음. 파일 저장/캡처 성공으로 보고하지 않음. 완료 시각/정확 소요시간 미측정 |
| V4 녹화 | 미실행 | 확장/페이지 복구 후 사용자 화면선택·권한 허용 필요. 화면 공유 보안 우회 없음 |

- 출력은 사용자 화면 DOM으로만 확인. 재변환/재설치/코드수정/운영DB쓰기/빌드/배포/유료AI0·비용0. 블로그 잔여1→6 요청을 이어서 준비합니다.
