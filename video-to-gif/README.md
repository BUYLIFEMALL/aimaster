# VideoToGIF

상세페이지용 동영상을 고품질 GIF로 변환하는 AIMaster 서브프로젝트입니다.

## 구현된 범위

- MP4/MKV/AVI/MOV/WebM/FLV/WMV/M4V/TS 업로드
- 40/50fps와 160~800px 너비 설정
- 최대 20개 파일, 파일당 200MB 검증
- FIFO 작업 큐와 SSE 진행률 스트림
- FFmpeg 2-pass palettegen/paletteuse 최적화 및 8MiB 품질 래더
- Supabase `videotogif_conversions` 상태 저장
- private Storage 업로드와 1시간 만료 signed download URL
- AIMaster 프로그램 권한(구독/수동 부여/회원 등급) 검사

## 실행

```bash
npm install
npm run dev
```

FFmpeg 워커는 별도 프로세스로 실행합니다.

```bash
cd worker
npm install
npm run dev
```

환경변수는 `.env.example`와 `worker/.env.example`을 참고하세요. 워커 운영 배포에는 `worker/Dockerfile`을 사용합니다.

## 현재 운영 전 준비

1. 워커를 별도 호스트에 배포하고 `VIDEOTOGIF_WORKER_URL` 및 동일한 secret을 설정합니다.
2. 200MB 업로드 운영을 위해 브라우저→Storage resumable upload(TUS) 방식으로 전환합니다.
3. 실제 로그인 계정으로 업로드→변환→signed download 전체 흐름을 검증합니다.
