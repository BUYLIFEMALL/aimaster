# 비상업용 음악 엔진(YuE2) 추가 플랜 (2026-11-04)

주인님 지시: 「상업적 허가가 안 된다 해서 뺀 모델 … 넣을 수 있나? 그게 더 음질 퀄리티가 높다면」「회원도 쓸 수 있게 해 주고」「구분만 하면 되잖아」「상업용/비상업용」「비상업모델도 사용 가능하게 추가해」.

## 1. 무엇을 넣나 (원본 `electron/native-engine.mjs`·`engines/native-catalog.json` 확인)

| 구성 | 내용 | 크기 | 이용 조건 |
|---|---|---|---|
| 실행 도구 | YuE2-Studio 3.4.0 휴대용 `yue-server.exe`(yue2.cpp, GGML) | 349MB(압축) | MIT |
| CUDA 라이브러리 | NVIDIA cuBLAS 13(`cublas64_13.dll`·`cublasLt64_13.dll`), 드라이버 580 이상 | 391MB | NVIDIA 재배포 조건(공식 주소에서 회원 PC가 직접 받음) |
| 음악 모델 | YuE2-3B Q8_0(그래픽 메모리 8GB 권장) / BF16(12GB 권장) | 3.8GB / 7.2GB | **CC BY-NC 4.0(비상업)** |
| 소리 복원 | YuE2-Vae-F32 | 0.5GB | CC BY-NC 4.0 |
| 커버용 악보 분석 | SheetSage2 Q8_0 | 1.0GB | CC BY-NC 4.0 |

모두 고정 주소·SHA-256으로 회원 PC 엔진이 공식 저장소(GitHub 릴리스·HuggingFace `Serveurperso/YuE2-GGUF`)에서 직접 받는다. 우리 서버에 두지 않는다. 경음악 LoRA는 1차에서 뺀다(연주곡은 ACE-Step으로).

## 2. 동작 (원본과 같은 순서)

1. 엔진이 빈 번호로 `yue-server.exe --model <백본> --vae <VAE> --host 127.0.0.1 --port <번호> --max-batch 1`(커버면 `--transcriber`) 실행, `GGML_BACKEND=CUDA0`, `YUE_CUDA_BACKEND=<cuda13\ggml-cuda.dll>`.
2. `/health` 대기(2분) → `/synth`에 `{style, lyrics, cot:"full", seed, lm_batch_size:1, synth_batch_size:1, output_format:"wav24"}` → `/job?id=` 0.5초마다 → `&result=1`로 multipart(JSON + 48kHz 24bit 스테레오 WAV).
3. 커버: `/transcribe`(원곡 → 악보 ABC) → `/synth`에 `abc`·`cot:"melody"`.
4. 결과 WAV를 보관함에 저장, 기록에 `engine: "yue2"`·`license: "noncommercial"`.
5. 진행 문구(`[AR] Score/Semantic`·`[NAR] Step n/m`)를 대기열 「만드는 중」 칸에.

## 3. 구분(상업용/비상업용)

- 엔진 고르기(「내 PC 엔진」 「사용할 엔진」 칸): **ACE-Step 1.5 · 상업용** / **YuE2 · 비상업용(수익 창출 영상·판매 불가)**.
- 곡 만들기·가져온 음악에서 엔진 선택 칸. YuE2를 처음 고르면 「비상업 목적으로만 쓰겠습니다」 동의 체크(이 브라우저 기억 + 곡 기록에 남김).
- 「모든 음악」·대기열·재생바에 「비상업용」 표시. DB `free_music_tracks`에 `license` 칸(`commercial`|`noncommercial`, 기본 commercial) — **운영 DB 칸 추가 1개(주인님 승인 필요)**.
- 지원 장치: NVIDIA(윈도우)만 1차. Apple·CPU는 「지원 안 됨」.

## 4. 단계

| 단계 | 할 일 | 확인 | 상태(2026-11-04) |
|---|---|---|---|
| A | 엔진 0.2.0: `yue2.mjs`(받기·SHA-256 확인·실행·`/synth`·`/job`·multipart·WAV 확인), 대기열 실행기가 `engine` 값으로 ACE-Step/YuE2 고르기, `/system`에 YuE2 「되는지·필요 공간」 | 엔진 시험 | ✅ `d411c0b26` — 엔진 시험 37개 통과(받기 확인값·결과 읽기·WAV·연주곡·대기열 구분은 가짜 응답, 진짜 `yue-server.exe` 실행은 C에서 처음) |
| B | 웹: 엔진 선택·동의·「비상업용」 표시, DB `license` 칸 | 시험·tsc·build | ✅ `2cac793c0` — 사이트 시험 47개·tsc·build 통과, DB 칸 운영 적용(`729d7defa`) |
| C | **마스터PC 실물**(주인님): 같은 가사로 ACE-Step XL vs YuE2 각 1곡 → 음질·한국어 발음·시간·그래픽 메모리 비교 | 캡처·청취 | ⏳ 대기 — 엔진 0.2.0 압축 `D:\PDS\Program_dev\free-music-src\free-music-engine-0.2.0.zip` |
| D | 배포(빌드 1회, 4단계 재생바와 함께) | 운영 화면 | ✅ v1.10 배포(`free-music-studio-pre6r21xo`, Ready) — C에서 YuE2 고르기 화면이 필요해 C보다 먼저 배포 |

**만든 구조(A):** YuE2 작업 차례가 오면 ACE-Step을 잠시 꺼 그래픽 메모리를 비우고(16GB에 XL과 BF16을 같이 올리면 모자람), 뒤 작업이 YuE2가 아니면 다시 켠다. 뒤에 있던 YuE2 작업이 취소돼도 ACE-Step 작업 차례에 다시 켠다. 진행 문구는 데이터 폴더 `yue2-log.txt`. 그래픽 메모리 12GB 이상은 BF16(최고 음질, 처음 약 8.4GB 받음), 8GB 이상은 Q8.

## 5. 비용

| 항목 | 비용 |
|---|---|
| 모델·실행 도구 받기 | 무료(회원 PC, 약 5~9GB) |
| 운영 DB 칸 추가 | 무료(승인 필요) |
| Vercel 빌드 | 1회(4단계와 묶음) |
| AI 호출 | 없음 |

## 6. 위험·주의

- 비상업 모델을 유료 구독 안에서 제공하면 「상업 이용」으로 볼 여지가 있다 → 표시·동의를 빼지 않는다(AGENTS.md 「꼭 지킬 것」).
- 원본 표기 `verifiedOnThisPC: false` — 원작자도 실물 검증 전 표시. 마스터PC C단계가 첫 실물.
- 받는 용량이 크다(최소 약 5GB) — 받기 전 저장 공간·진행률 표시, 중간에 끊기면 이어 받기.
- 파이썬이 아니라 C++ 실행 파일이라 cp949 문제는 없을 것으로 보이나, 진행 문구는 UTF-8로 읽는다.
