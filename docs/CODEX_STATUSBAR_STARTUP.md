# Codex 새 터미널 상태바 자동 적용 지침

2026-10-14 주인님 확정. 구현: `codex-statusbar` v1.05(2026-10-15 항목별 색상 수정). 이 지침은 새 Codex 세션에서도 유지합니다.

## 표시 형식

```text
[모델명] [effort] | 5h [잔여%] ([리셋까지 남은 시간]) | weekly [잔여%] ([리셋까지 남은 시간]) | context [잔여%]
GPT-6.1-Sol high | 5h 17% (0h 34m) | weekly 5% (3d 4h 14m) | context 23%
```

실제 모델명과 effort를 사용합니다. 모델명과 effort 사이에는 공백 한 칸, 항목 사이에는 ` | `, 시간 단위 사이에는 공백 한 칸을 유지합니다. 1시간 미만도 `0h 34m`으로 표시합니다. 예시 수치를 고정하지 않습니다. `5h`·`weekly`·`context`는 모두 잔여 비율입니다. Orca의 별도 `사용%` 표시와 혼동하지 않습니다.

색상은 모델명·effort 베이지(`#DECCA1`), 5h·weekly 분홍(`#D07E8E`), context 살구색(`#D89E7B`), 구분자 회색(`#787878`)입니다. `src/format.mjs`의 `colorFooter()`에서 적용하며 전체 행을 단색으로 덮어쓰지 않습니다. 표시 문자열의 폭 조절 후 색상을 붙입니다. 기존 실행 중인 세션에는 소급 적용되지 않으며 다음 Codex 실행부터 표시됩니다.

## 새 터미널에서 자동 적용되는 경로

이 PC의 `codex`·`codex.cmd`는 사용자 npm의 `@openai/codex/bin/codex.js`를 거칩니다. 설치된 대화형 실행 분기는 매번 `D:/Antigravity/AIMaster/codex-statusbar/src/run.mjs`를 새로 불러오고, 이 모듈이 `src/format.mjs`의 현재 표시 코드를 사용합니다. 새 실행마다 형식을 다시 입력할 필요가 없습니다. PowerShell·명령 프롬프트·Orca 터미널에서 같은 npm 실행기를 쓰면 동일하게 적용됩니다. vendor의 `codex.exe`를 직접 실행하면 이 분기를 거치지 않습니다.

```powershell
codex.cmd -C "D:\Antigravity\AIMaster" --sandbox danger-full-access --ask-for-approval never
```

이 지침은 모델·effort·권한·로그인 설정을 변경하지 않습니다. 기존 실행 중인 프로세스는 이전 모듈을 이미 불러온 상태이므로 새 표시 코드는 다음 Codex 실행부터 적용됩니다. 사용자 작업 중인 세션을 강제 종료하지 않습니다.

## 다른 CLI가 작업을 시작할 때 확인할 것

1. 이 문서와 [실행기 README](../codex-statusbar/README.md), [전용 AGENTS](../codex-statusbar/AGENTS.md)를 읽고 확정 형식을 유지합니다.
2. `Get-Command codex.cmd`로 실제 npm 실행기 경로를 확인합니다. `npm --prefix D:\Antigravity\AIMaster\codex-statusbar run install-launcher`로 연결 대상과 백업 해시를 검증합니다. 정상 설치 상태에서는 실행기를 다시 덮어쓰지 않습니다.
3. npm으로 Codex를 업데이트한 뒤 설치 분기가 없어졌다면 위 설치 명령으로 복구합니다. 다른 체크아웃을 가리키거나 외부 변경이 감지되면 임의로 덮어쓰지 말고 원인을 확인합니다.
4. `npm --prefix D:\Antigravity\AIMaster\codex-statusbar test`와 `npm --prefix D:\Antigravity\AIMaster\codex-statusbar run build`, 실제 새 대화형 터미널 표시와 `codex.cmd --version`을 확인합니다. 검수 중 AI 요청을 보내지 않습니다.

본인 계정의 읽기 전용 `account/rateLimits/read`로 리셋 시각을 확인합니다. 인증 파일·API 키를 출력하거나 다른 계정으로 폴백하지 않습니다. 확인되지 않은 시각은 만들어 표시하지 않습니다. 좁은 창에서도 시간과 구분자 공백을 없애지 않고 모델명부터 줄입니다. 모든 항목이 들어가지 않는 폭에서는 생략 표시합니다.

로컬 실행기이므로 적용 대상은 이 PC의 npm 실행기입니다. 다른 PC·다른 npm 설치에는 설치 절차가 필요하며 Vercel·DB 배포 대상이 아닙니다.
