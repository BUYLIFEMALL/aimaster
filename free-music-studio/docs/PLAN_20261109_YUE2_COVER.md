# 플랜 — YuE2 커버(원곡 멜로디 받아 적기) · 엔진 0.8.0 (백로그 B-5)

2026-11-09 주인님 「추천대로 진행해」(요청함 f5e8945c 승인완료).

## 배경
- YuE2 공식이 2026-09-25부터 제로샷 커버를 지원한다. SheetSage2가 원곡의 멜로디를 ABC 악보로 받아 적고, YuE2가 `cot:"melody"` + 그 악보로 새 스타일·가사를 부른다.
- 우리 엔진이 쓰는 yue2.cpp(YuE2-Studio, MIT)에 `--transcriber` 옵션과 `POST /transcribe`(multipart `audio`, `melody_only`)가 있다. 결과는 `{"abc":"X:1..."}`이다. 실행 파일 v3.8.5에서 문자열로 확인했다.
- 모델: YuE2·SheetSage2·MERT 모두 CC BY-NC 4.0(비상업)이다. 회원 PC가 공식 저장소에서 직접 받는다.

## 결정(추천안)
| 항목 | 결정 |
|---|---|
| 실행 도구 | YuE2-Studio v3.4.0 → **v3.8.5**(zip 335,700,794B, sha256 `edd6c371…a1a9`, 구성 같음 `resources/yue2-cpp`·`cuda13`) |
| 모델 | 노래 모델 Q8·BF16·VAE는 해시가 같아 **다시 받지 않음**. 커버 전용으로 `SheetSage2-Q8_0.gguf`(105,629,856B)와 `MERT-v2-FullSong-Q8_0.gguf`(902,283,712B)를 리비전 `e630f2b8…`에서 **처음 커버할 때만** 받음 |
| 화면 | 「가져온 음악」 커버에 엔진 고르기: ACE-Step(소리 바탕·상업용) / YuE2(멜로디 받아 적기·비상업용). YuE2는 가사 필수, 「원곡 따르기」 세기는 숨김 |
| 상업용 표시 | YuE2 커버 결과는 비상업용(엔진 표시 그대로) |
| 사양 | 지금 YuE2와 같음(윈도우 + NVIDIA 8GB 이상, 드라이버 580 이상) |

## 구현
1. `yue2-catalog.json`: runtime v3.8.5 + `version`, 받아 적기 모델 2개(`cover`)
2. `yue2.mjs`
   - 실행 도구 판 기록(`runtime/.version`). 판이 다르면 다시 받되, 받아 둔 cuBLAS DLL은 보존
   - 결과 읽기: 새 서버의 세 번째 조각(latents, octet-stream)은 무시
   - 커버: 받아 적기 모델 준비 → `--transcriber`로 켜기 → `/transcribe`(melody_only) → `abc` → `/synth`(`abc`, `cot:"melody"`)
3. `main.mjs`: 원곡 폴더를 YuE2 실행에 넘김, 기능 `yue2cover`, VERSION 0.8.0
4. `gateway.mjs`: `/queue/edit`가 커버에 한해 `engine:"yue2"`를 받음(비상업)
5. 사이트: `enqueueEdit`에 엔진, 커버 화면에 엔진 고르기·안내

## 검수
- 엔진 시험: 결과 3조각 읽기, 받아 적기 결과 읽기, 커버 요청 본문(`abc`·`cot`), 판 다를 때 다시 받기 판단
- 사이트 시험·tsc·로컬 빌드
- **마스터PC 실물**: 한국어 원곡 1곡으로 YuE2 커버(이 PC는 NVIDIA 없음). 같은 PC에서 YuE2 새 곡 만들기도 다시 확인(실행 도구 판 올림)

## 비용
- 개발·시험: 없음(공개 파일·로컬 시험)
- 배포: Vercel 빌드 1회(사이트 v1.55 + 엔진 설치 파일 0.8.0) — 배포 때 승인
- 회원: 없음(내 PC 엔진). 처음 커버 때 약 1GB를 받음, 실행 도구를 다시 받을 때 약 336MB
