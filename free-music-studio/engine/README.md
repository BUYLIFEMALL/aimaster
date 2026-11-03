# AI 무료음악 자동화 — 내 PC 엔진 0.1

회원 PC에서 ACE-Step 1.5(MIT)로 노래를 만들고, 사이트(https://free-music-studio.buylife.xyz)가 그 엔진을 부르게 하는 작은 Node 프로그램입니다. 원본 앱 코드는 가져오지 않고 새로 썼습니다.

## 실행 (0.1 — 개발·시험용)
필요: Node 20 이상, `uv`(파이썬 패키지 도구), 디스크 20GB 여유.
```
cd free-music-studio/engine
node src/main.mjs
```
1. 연결 문이 `http://127.0.0.1:47821`에 열리고, 터미널에 **6자리 연결 코드**가 나옵니다.
2. 처음 한 번 ACE-Step 고정 버전(`ca1e85f`)을 받아 `uv sync`로 설치합니다(수 분). 데이터 위치: 윈도우 `%LOCALAPPDATA%\FreeMusicEngine`, 맥 `~/Library/Application Support/FreeMusicEngine`.
3. 「✔ 준비됨」이 나오면 사이트에서 노래를 만들 수 있습니다. 음악 모델(약 10GB)은 첫 생성 때 자동으로 받습니다.

이미 설치된 ACE-Step으로 시험하려면 `FMS_ACESTEP_DIR`(폴더)·`FMS_PYTHON`(그 폴더 파이썬)을 함께 지정합니다. `FMS_DATA_DIR`로 데이터 위치를 바꿀 수 있습니다.

## 장치
| PC | 모드 |
|---|---|
| NVIDIA 그래픽카드(윈도우 x64) | 고품질 — `cuda`, 언어 모델 켬 |
| Apple Silicon 맥 | 고품질 — `mps`(실물 미검증) |
| 그래픽카드 없는 PC·Intel 내장 그래픽 | CPU 모드 — 언어 모델 끔 |
| Intel 맥 | 미지원(음악 모델·PyTorch 없음, 2026-11-03 맥미니 확인) |

## 연결 문(사이트가 부르는 주소)
| 주소 | 토큰 | 하는 일 |
|---|---|---|
| `GET /status` | 필요 없음 | 상태(`ready`·`stage`·`mode`·`paired`) |
| `POST /pair` `{code}` | 필요 없음(사이트에서만) | 연결 코드 → 토큰. 5번 틀리면 1분 잠금, 쓴 코드는 바뀜 |
| `POST /release_task` · `POST /query_result` · `GET /v1/audio` | `Authorization: Bearer <토큰>` | 내부 ACE-Step으로 그대로 전달(파일 업로드 포함, 60MB까지) |
| `GET /library` · `POST /library/save {id, file, title}` · `GET`·`DELETE /library/<id>` | `Authorization: Bearer <토큰>` | 내 PC 보관함 — 완성 음원을 저장 폴더에 「곡 제목.mp3」로 복사(ACE-Step 임시 폴더는 시간이 지나면 지워짐). 곡 번호(사이트 「모든 음악」 기록 id) → 파일 경로는 `데이터 폴더\library-index.json`. 0.1.1의 `데이터 폴더\library\<uuid>.mp3`도 시작할 때 읽음 |
| `POST /library/pick-folder` · `POST /library/folder {path, move, titles}` · `POST /library/reveal` | `Authorization: Bearer <토큰>` | 0.1.2 저장 폴더 — 기본 `음악\AI 무료음악`. PC에 폴더 고르기 창(윈도우 FolderBrowserDialog·맥 osascript) → 쓰기 시험 뒤 바꾸기(기존 노래 옮기기 선택) → `데이터 폴더\settings.json`에 기억. reveal은 탐색기로 열기 |

- 허용 사이트: `https://free-music-studio.buylife.xyz` + 내 PC 개발 주소(`localhost`·`127.0.0.1`). 다른 사이트의 요청은 403.
- 내부 ACE-Step은 `127.0.0.1:47822`에서 실행마다 새 키를 걸고 돌아, 연결 문을 거치지 않은 요청은 받지 않습니다.
- 브라우저는 처음에 「로컬 네트워크 접근 허용」을 한 번 묻습니다(허용은 브라우저마다 따로).

## 시험
`node --test tests/` — 장치 고르기·허용 사이트·연결 코드·토큰 비교(5개).

## 0.2에서 할 일
설치 파일(윈도우 exe·맥 dmg)로 묶기, `uv` 함께 넣기, 작업 표시줄 아이콘·연결 코드 창, 자동 시작, 압축 파일 무결성 확인, 사이트 버전 배지와 맞추기.
