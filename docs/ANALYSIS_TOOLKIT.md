# 프로그램 분석·재구현 도구 모음 (재설치·설정 참고서)

> 2026-10-15 주인님 지시: "분석 작업에 필요한 프로그램/MCP/Skill 목록과 사용 용도·관련 주소를 정리해, 다음에 재설치하거나 설정할 때 참고하게."
> 사용 원칙(언제·어떻게 쓰나, 권리·안전 수칙): [`docs/REA_REVERSE_ENGINEERING.md`](REA_REVERSE_ENGINEERING.md) · CLAUDE.md 핵심 원칙 21.
> 설치 기준 PC: Windows 11 Pro, 2026-10-15. 도구를 추가·제거하면 이 문서 표를 같이 고친다.

## 1. 한눈에 보기

| 구분 | 이름 | 용도 | 상태(2026-10-15) |
|---|---|---|---|
| 핵심 | **REA** (`rea-agents`) | 분석 총괄 — EXE·패키지·Electron·.NET·APK·웹 번들 분석, 근거(Evidence) 정리, 재구현 점검표 | 6.4.0 설치·연결 |
| 엔진 | **Ghidra** | C/C++ 등 네이티브 EXE를 코드(의사 C)로 풀기 — REA가 내부에서 사용 | 12.1.4 |
| 엔진 필수 | **Java 21 (Temurin JDK)** | Ghidra 실행에 필요 | 21.0.12 |
| .NET | **ILSpy 명령줄판** (`ilspycmd`) | C#(.NET) EXE/DLL을 C# 소스로 복원 — REA는 .NET 구조만 보여 줘서 필요 | 9.1.0 |
| .NET 필수 | **.NET 8 SDK** | `ilspycmd` 설치·실행에 필요 | 8.0.426 |
| 판별 | **Detect It Easy** (DIE) | EXE가 무엇으로 만들어졌는지(C++/.NET/Electron/Python/압축 포장) 판별 — 분석 방법을 고르는 첫 단계 | 3.21 |
| 압축 | **7-Zip** | 설치 파일(setup.exe·MSI·NSIS)·압축 파일 내용물 꺼내기 | 설치 |
| AI CLI 연결 | **MCP `rea`** | Claude Code·Codex·Antigravity·Gemini CLI 안에서 REA 도구 직접 호출 | 네 도구 모두 연결(Claude는 메인·보조) |
| Claude 지침 | **Skill `reverse-engineer-anything`** | REA를 언제·어떤 순서로 쓰는지 Claude에게 알려 주는 지침 | v37, 두 계정 |
| 화면 | **Claude in Chrome 확장** (MCP `claude-in-chrome`) | 웹사이트·웹 프로그램 실제 화면 분석·검수(번들·네트워크·콘솔) | 메인=크롬, 보조=엣지 |
| 기존 | Node.js 24 · Python 3.14 · Docker · WSL · Git · gh · Vercel CLI | 스크립트 실행·재구현 개발·배포 | 설치 |

## 2. 도구별 상세

### 2-1. REA (Reverse Engineer Anything)
- 주소: https://github.com/morluto/rea · npm `rea-agents`
- 설치: `npm i -g rea-agents` (설치 위치 `%APPDATA%\npm\rea`)
- Claude Code 연결(계정마다):
  ```bash
  rea setup --client claude_code --dry-run        # 바꿀 파일·백업 위치 먼저 확인
  rea setup --client claude_code --yes            # 보조 계정 세션(CLAUDE_CONFIG_DIR=.claude-account2)에서 실행
  env -u CLAUDE_CONFIG_DIR rea setup --client claude_code --skill-client claude_code --yes   # 메인 계정
  ```
  - 등록 위치: 메인 `C:\Users\Administrator\.claude.json`, 보조 `C:\Users\Administrator\.claude-account2\.claude.json` (`mcpServers.rea`, 백업 `.rea.backup`). 등록에 `GHIDRA_INSTALL_DIR`·`JAVA_HOME`이 함께 들어간다 — **Ghidra/Java를 먼저 설치하고 setup**한다.
  - 지침(skill) 위치: `~/.claude/skills/reverse-engineer-anything`, `~/.claude-account2/skills/reverse-engineer-anything`.
  - **Codex·Antigravity·Gemini CLI도 연결(2026-10-15)**: 
    ```bash
    rea setup --client codex --client antigravity --client gemini_cli --skill-client codex --skill-client antigravity --skill-client gemini_cli --yes
    ```
    - 등록 위치: Codex `%APPDATA%\orca\codex-accounts\<계정ID>\home\config.toml`(Orca가 계정별 CODEX_HOME 사용 — 계정을 추가하면 그 계정 폴더에도 다시 실행), Antigravity `~/.gemini/config/mcp_config.json`, Gemini CLI `~/.gemini/settings.json`. 각 `.rea.backup` 백업, 세 곳 모두 `GHIDRA_INSTALL_DIR`·`JAVA_HOME` 포함.
    - 지침(skill): 세 도구는 공용 폴더 `~/.agents/skills/reverse-engineer-anything`(v37)을 읽는다.
    - 확인: `rea doctor --client codex|antigravity|gemini_cli` healthy, `codex mcp list`(CODEX_HOME 지정) → `rea enabled`, `gemini mcp list` → `rea Connected`. 각 도구는 **새로 실행한 세션부터** 적용.
- 연결 후 **Claude Code를 새로 시작**해야 `rea` 도구가 보인다. 확인: `claude mcp list` → `rea ... ✔ Connected`.
- 점검: `rea doctor --client claude_code` (healthy: true). 업데이트 후에는 setup을 다시 실행해 지침을 갱신.

### 2-2. Ghidra + Java 21
- Ghidra 주소: https://github.com/NationalSecurityAgency/ghidra/releases (NSA 공식). 받은 파일 `ghidra_12.1.4_PUBLIC_20260921.zip`, SHA-256 `ddac49f903da9d5bac833e5cc79395098b9c33cfd3279be5f31bd00387d2d4db`(릴리스 설명의 값과 대조).
- 설치: ZIP을 `C:\Tools`에 풀기 → `C:\Tools\ghidra_12.1.4_PUBLIC` (설치 프로그램 없음). 원본 ZIP은 `C:\Tools\dl\`에 보관.
- Java: `winget install --id EclipseAdoptium.Temurin.21.JDK -e` → `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` · 주소 https://adoptium.net
- 사용자 환경변수(PowerShell):
  ```powershell
  [Environment]::SetEnvironmentVariable('GHIDRA_INSTALL_DIR','C:\Tools\ghidra_12.1.4_PUBLIC','User')
  [Environment]::SetEnvironmentVariable('JAVA_HOME','C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot','User')
  ```
- REA가 요구하는 버전: Ghidra 12.1.x + 64비트 JDK 21 이상. Ghidra를 새 버전으로 바꾸면 환경변수와 `rea setup`을 다시 한다.
- 동작 확인: `rea analyze <exe> --provider ghidra --format json > out.json` (whoami.exe 사본 36초, 함수 341).

### 2-3. ILSpy 명령줄판 + .NET 8 SDK
- 주소: https://github.com/icsharpcode/ILSpy · NuGet `ilspycmd`
- 설치:
  ```bash
  winget install --id Microsoft.DotNet.SDK.8 -e
  dotnet tool install -g ilspycmd --version 9.1.0.7988
  ```
  - **버전 고정 이유**: 최신 `ilspycmd` 10·11은 .NET 8 SDK에서 설치가 실패한다("DotnetToolSettings.xml을 찾지 못했습니다"). 더 새 SDK를 깔면 최신 버전도 가능.
  - 실행 파일: `%USERPROFILE%\.dotnet\tools\ilspycmd.exe` (새 터미널부터 PATH에 잡힘).
- 사용: `ilspycmd <파일.dll|exe> -p -o <새 빈 폴더>`(프로젝트 전체 복원), `-t <형식이름>`(형식 하나만).

### 2-4. Detect It Easy (DIE)
- 주소: https://github.com/horsicq/Detect-It-Easy
- 설치: `winget install --id horsicq.DIE-engine -e`
- 위치: `%LOCALAPPDATA%\Microsoft\WinGet\Packages\horsicq.DIE-engine_Microsoft.Winget.Source_8wekyb3d8bbwe\die\` — `diec.exe`(명령줄), `die.exe`(화면판), 명령 별칭 `diel`.
- 사용: `diec.exe <파일>` → 예) `Compiler: Microsoft Visual C/C++` → Ghidra, `Library: .NET Core` → ILSpy, Electron/Python/압축 포장(UPX 등) 판별.

### 2-5. 7-Zip
- 주소: https://www.7-zip.org
- 설치: `winget install --id 7zip.7zip -e` → `C:\Program Files\7-Zip\7z.exe`
- 사용: `7z l <파일>`(목록), `7z x <파일> -o<새 빈 폴더>`(풀기). setup.exe·MSI·NSIS 설치 파일 안의 실제 프로그램 꺼내기.

### 2-6. Claude in Chrome 확장 (웹 분석·검수)
- 주소: https://claude.ai/chrome (크롬 웹 스토어 / 엣지는 같은 확장 설치)
- 계정별 브라우저: 메인 `buylifemall@gmail.com` → 크롬, 보조 `buylifemall1@gmail.com` → 엣지(deviceId 표: `docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md` 8-1-2).
- 웹사이트 분석은 이 확장(실제 화면·네트워크·콘솔) + REA `analyze-web-bundle`을 함께 쓴다(핵심 원칙 14).

## 3. 필요할 때만 설치 (아직 미설치)

| 이름 | 언제 | 주소 / 설치 |
|---|---|---|
| innoextract | Inno Setup 형식 설치 파일 | https://constexpr.org/innoextract · `winget search innoextract` |
| pyinstxtractor | Python(PyInstaller)으로 묶은 EXE | https://github.com/extremecoders-re/pyinstxtractor (스크립트 1개, Python 있음) |
| Electron asar | Electron 앱의 `resources\app.asar` 풀기 | 설치 불필요: `npx @electron/asar extract app.asar <새 빈 폴더>` (REA `analyze_javascript_application`도 가능) |
| mitmproxy | 프로그램이 서버와 주고받는 내용 관찰(실행 필요 → 샌드박스와 함께) | https://mitmproxy.org · `winget install mitmproxy.mitmproxy` |
| jadx · apktool | 안드로이드 APK | https://github.com/skylot/jadx · https://apktool.org (Java 21 있음) |
| Windows 샌드박스 | 출처 모르는 EXE를 실행해 봐야 할 때(일회용 격리 창) | **주인님이 직접**: 시작 → "Windows 기능 켜기/끄기" → Windows Sandbox 체크 → 재부팅. 2026-10-15 현재 꺼져 있음 |
| (불필요) IDA · Hopper | 유료 — Ghidra로 충분 | — |

## 4. 새 PC·재설치 순서 (요약)
1. Node.js·Git 확인 → `npm i -g rea-agents`
2. `winget install --id EclipseAdoptium.Temurin.21.JDK -e`
3. Ghidra ZIP 받기 → SHA-256 대조 → `C:\Tools`에 풀기 → 환경변수 `GHIDRA_INSTALL_DIR`·`JAVA_HOME`
4. `winget install --id Microsoft.DotNet.SDK.8 -e` → `dotnet tool install -g ilspycmd --version 9.1.0.7988`
5. `winget install --id horsicq.DIE-engine -e` · `winget install --id 7zip.7zip -e`
6. (새 터미널) `rea setup --client claude_code --dry-run` → 확인 후 `--yes` (메인·보조 계정 각각)
7. Claude Code 재시작 → `claude mcp list`에서 `rea ✔ Connected`, `rea doctor --client claude_code` healthy 확인
8. 이 문서 1번 표의 상태·버전을 갱신

## 5. 분석 작업 흐름 (도구 고르는 순서)
1. 파일을 `D:\PDS` 등에서 **새 빈 폴더로 복사**(원본·실행 금지).
2. `diec.exe`로 종류 판별 → 설치 파일이면 `7z x`로 꺼내서 다시 판별.
3. 종류별: .NET → `ilspycmd` + REA `inspect_managed_artifact` / C·C++ → REA + Ghidra / Electron → REA `analyze_javascript_application` / Python → pyinstxtractor / 웹 → Claude in Chrome + REA `analyze-web-bundle`.
4. 결과(화면·기능·서버 통신·설정값)를 정리해 **재구현 계획을 먼저 주인님께 보고** → 승인 후 `AIMaster/<프로그램>/`에 우리 방식으로 개발.
