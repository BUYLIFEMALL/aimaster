# AI 무료음악 자동화 — 마스터PC 엔진 오류 대응 인수인계 (2026-11-04)

> 담당: [역할: music] Claude Code(윈도우(미니PC)) · 세션 `claude-win-20261024-music`
> 대상: 내 PC 엔진(`free-music-studio/engine`) 0.1.6 → **0.1.11**, 마스터PC(RTX 5080 16GB · Windows 11 Pro 한국어 · i7-13700K · 64GB)
> 결과: 0.1.11로 작업 대기열 실물 확인 끝 — 2곡 차례로, 완성·보관함 저장·「모든 음악」 자동 기록·FLAC/MP3 320k, [취소] → 「취소됨」, 만드는 중 엔진 껐다 켜기 → 「중단됨」·[다시 하기] 모두 정상.

## 1. 한 줄 요약

**세 가지 원인이 겹쳐 있었고, 하나를 풀면 다음 원인이 드러났다.** ① 예전 엔진이 연결 문을 잡고 있음 → ② 예전 엔진이 남긴 음악 엔진(python)이 내부 번호를 잡고 있음 → ③ 음악 엔진이 한국어 윈도우 기본 글자 방식(cp949)으로 긴 줄표(—)를 못 써서 실패. 그리고 ④ 엔진이 음악 엔진의 실패 이유를 버리고 있어 ③을 늦게 찾았다.

## 2. 처리 과정 (시간 순)

| 차례 | 증상(화면·엔진 창) | 확인한 것 | 원인 | 조치 | 엔진 |
|---|---|---|---|---|---|
| 1 | `node src/main.mjs` → `Error: listen EADDRINUSE 127.0.0.1:47821` | `Invoke-RestMethod http://127.0.0.1:47821/status` → `version : 0.1.0` 응답. `Get-NetTCPConnection`은 「찾지 못함」, `netstat -ano \| findstr 47821`은 `FIN_WAIT_2 49524`만 | 아주 예전 엔진 0.1.0이 뒤에서 켜져 있었음(창 없음) | `taskkill /PID 49524 /T /F`로 끄고 0.1.6 실행 | 0.1.6 |
| 2 | 대기열 2곡이 넣자마자 「실패」(이유: 「음악 엔진이 곡을 만들지 못했습니다」), 엔진 상태 「멈춤」, 엔진 창 `⚠ 음악 엔진이 멈췄습니다(코드 1)` | 엔진이 음악 엔진 출력을 버리고 있어 이유를 볼 수 없었음 | (아직 모름) | 음악 엔진 출력을 데이터 폴더 `acestep-log.txt`에 남기게 함, 「이미 켜져 있음」 한국어 안내 | 0.1.7 |
| 3 | 같은 증상 | `acestep-log.txt`에 `[Errno 10048] error while attempting to bind on address ('127.0.0.1', 47822)` | 예전 엔진 창을 닫아도 **그 엔진이 띄운 음악 엔진(python)이 남아** 고정 내부 번호 47822를 잡음. 새 음악 엔진은 켜지자마자 꺼지고, 엔진은 **남은 옛 음악 엔진의 `/health` 응답에 속아 「준비됨」**, 옛 음악 엔진은 새 실행 키를 몰라 요청 실패 | 켤 때 47822를 잡은 python·uv를 `netstat`으로 찾아 끄기, 켜진 뒤 2초 뒤에도 우리 음악 엔진이 살아 있는지 확인, 엔진 종료(Ctrl+C·창 닫기·SIGHUP/SIGBREAK) 때 음악 엔진도 `taskkill /T /F` | 0.1.8 |
| 4 | 같은 증상(정리 안내 줄 없음) | 기록에 다시 `Errno 10048 … 47822` | **이 PC는 `netstat`에 그 프로그램의 `LISTENING` 줄이 안 보여** 번호로 찾기가 실패. 또 음악 엔진이 오류 뒤에도 잠시 살아 있어 「2초 확인」도 통과 | 내부 번호를 **실행마다 비어 있는 번호**(`pickFreePort`)로 바꿔 부딪힘 자체를 없앰, 남은 음악 엔진은 실행 명령 이름(`acestep-api`·`acestep.api_server`)으로 `Get-CimInstance Win32_Process`에서 찾아 끔 | 0.1.9 |
| 5 | 음악 엔진은 정상 실행(`Uvicorn running on http://127.0.0.1:62544`), 그런데 곡이 3초 만에 「실패」, 기록에 오류 없음 | ACE-Step 코드 `acestep/api/http/query_result_service.py` — 실패한 작업은 `result[0].error`에 이유를 넣어 준다 | 엔진(`runner.mjs` `parseTaskState`)이 그 이유를 버리고 일반 문장만 표시 | 실패 이유를 대기열 「이유」 줄·엔진 창에 그대로 붙임 | 0.1.10 |
| 6 | 이유: `'cp949' codec can't encode character '\u2014' in position 36: illegal multibyte sequence` | — | 음악 엔진(파이썬)이 한국어 윈도우 기본 글자 방식 cp949로 진행 문구를 쓰는데 긴 줄표(—)가 cp949에 없음 | 음악 엔진을 `PYTHONUTF8=1`·`PYTHONIOENCODING=utf-8`로 실행(`acestep.mjs` `PYTHON_UTF8_ENV`, 설치판 `launch`와 시험판 `FMS_PYTHON` 둘 다) | **0.1.11** |
| 7 | 1번 곡 「만드는 중 · 2분 22초」 → 완료(03:13→03:20, XL 모델 첫 내려받기 포함 약 7분) | 「모든 음악」 자동 기록, FLAC·MP3 320k 버튼 | — | [취소] → 「취소됨」, 만드는 중 창 닫고 다시 켬 → 「중단됨」·[다시 하기] 확인 | 0.1.11 |

커밋: 0.1.7 `f879a234a` · 0.1.8 `b898c174f` · 0.1.9 `2f4569efb` · 0.1.10 `00be9bf44` · 0.1.11 `6d4a225c0` · 기록 `dc38a4410`·`26037048b`·`a8c20ecae`. 엔진 시험 28개. 압축: `D:\PDS\Program_dev\free-music-src\free-music-engine-0.1.N.zip`(미니PC, 윈도우 `tar.exe -a`로 `tests`·`node_modules` 빼고).

## 3. 주의사항 (다음 CLI가 꼭 지킬 것)

1. **음악 엔진 실패 이유를 절대 버리지 않는다.** ACE-Step `query_result`는 실패 시 `status: 2`와 `result`(JSON 문자열) 안 `[0].error`에 이유를 준다. 웹의 옛 방식(대기열 없이 만들기, `src/lib/engine.ts` `parseTaskState`)은 **아직 이유를 버린다 → 다음 배포 때 고칠 것**(`docs/IMPROVEMENTS.md`).
2. **파이썬 자식 프로세스는 항상 UTF-8 모드로 띄운다**(`PYTHONUTF8=1`, `PYTHONIOENCODING=utf-8`). 한국어 윈도우 기본은 cp949라 진행 문구·로그·파일 쓰기의 일부 글자(—, ’, 이모지 등)에서 바로 실패한다. 영어 윈도우·미니PC 시험에서는 드러나지 않을 수 있다.
3. **내부 번호를 고정하지 않는다.** 남은 프로세스와 부딪힌다. 0.1.9부터 내부 음악 엔진 번호는 실행마다 `pickFreePort()`. 연결 문(사이트가 부르는 47821)만 고정.
4. **`/health`가 대답했다고 우리 음악 엔진이 준비된 것이 아니다.** 다른(남은) 프로세스가 대답할 수 있다. 실행마다 다른 번호 + 자식 프로세스 생존 확인을 같이 쓴다.
5. **엔진을 끌 때 자식 프로세스 트리를 함께 끈다**(윈도우 `taskkill /PID <pid> /T /F`). 창 닫기(SIGHUP·SIGBREAK)도 처리한다. 안 그러면 python이 그래픽 메모리와 번호를 잡은 채 남는다.
6. **윈도우에서 포트로 프로세스를 찾는 방법을 믿지 않는다.** 마스터PC는 `Get-NetTCPConnection`·`netstat`에 듣고 있는 프로그램이 안 보였다(관리자 PowerShell에서도). 실행 명령 이름(`Get-CimInstance Win32_Process`의 `CommandLine`)으로 찾는다. **다른 프로그램은 끄지 않는다**(이름 조건 `acestep-api`·`acestep.api_server`만).
7. **오류 원인을 추측으로 고치지 않는다.** 이번에 「XL 모델 문제」로 짐작했지만 실제로는 번호·글자 방식이었다. 먼저 기록 파일(`%LOCALAPPDATA%\FreeMusicEngine\acestep-log.txt`, 켤 때마다 새로 씀)과 실패 이유를 본다.
8. **사이트는 브라우저가 켜진 그 PC의 엔진(`127.0.0.1`)에만 붙는다.** 마스터PC 엔진은 마스터PC 브라우저에서만 보인다(미니PC 화면 = Intel Arc·22코어, 마스터PC 화면 = RTX 5080·24코어로 구분).
9. 주인님께 PC 명령을 안내할 때: 한 번에 한 가지, 결과를 그대로 붙여 넣어 달라고 하고, `taskkill`은 확인된 PID만. 연결 코드는 엔진을 다시 켤 때마다 바뀐다.

## 4. 자주 쓴 확인 명령(마스터PC PowerShell)

| 목적 | 명령 |
|---|---|
| 지금 켜진 엔진 버전 | `Invoke-RestMethod http://127.0.0.1:47821/status` |
| 연결 문을 잡은 프로그램 | `netstat -ano \| findstr 47821` (이 PC는 안 보일 수 있음) |
| 특정 프로그램 끄기(트리 포함) | `taskkill /PID <번호> /T /F` |
| 음악 엔진 기록 열기 | `notepad %LOCALAPPDATA%\FreeMusicEngine\acestep-log.txt` |
| 엔진 켜기 | 압축 푼 폴더에서 `node src/main.mjs` |

## 5. 남은 일

- 웹 옛 방식 `parseTaskState`도 실패 이유 표시(다음 배포).
- 구성 바꾼 뒤 「준비됨」이 돼도 「다시 켜는 중」 안내가 남는 화면 문제(다음 배포).
- 「중단됨」 곡 [다시 하기] 누른 뒤 다시 완성되는지(선택 확인).
- 설치 파일(9단계)에서는 엔진 시작 전 「예전 엔진·남은 음악 엔진 정리」를 설치 프로그램 쪽에서도 한 번 더.
