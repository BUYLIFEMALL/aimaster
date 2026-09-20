# VideoToGIF

상세페이지용 동영상을 고품질 GIF로 변환하는 AIMaster 서브프로젝트입니다.

## 아키텍처 (2026-09-20부터 — 서버리스 변환으로 전환)

**변환은 서버가 아니라 사용자 브라우저 안에서 처리됩니다** (`@ffmpeg/ffmpeg`,
ffmpeg.wasm). 영상 파일은 어디로도 업로드되지 않고, FFmpeg 코어(WASM, 약
25~30MB)만 CDN(jsdelivr)에서 받아와 그 자리에서 실행합니다.

**왜 이렇게 바꿨나**: 처음엔 "브라우저 → Vercel API → Render 워커(FFmpeg)" 구조였는데,
운영해보니 문제가 계속 겹쳤다 — Vercel Functions의 요청 본문 100MB 제한, Render
Blueprint가 이 저장소(`aimaster`) 전체의 git push마다 워커를 재배포해서 처리 중이던
작업이 계속 유실되는 문제, Render 무료 플랜(0.1 vCPU)의 극도로 느린 처리 속도, 두
서버(Vercel/Render) 간 비밀값(`VIDEOTOGIF_WORKER_SECRET`) 불일치로 인한 인증 실패
등. 사용자와 상의 후 서버를 아예 없애고 브라우저에서 직접 처리하는 방식으로
재구현했다 — 서버 인프라 문제 자체가 통째로 사라진다.

- 브라우저 처리라 처리 속도는 사용자 기기 성능에 좌우된다(느린 기기에선 더 오래
  걸릴 수 있음) — 대신 업로드 자체가 없어서 대용량 파일 전송 지연이 없고, 서버
  비용이 전혀 들지 않는다.
- 결과물(GIF)은 서버에 저장되지 않고 브라우저 메모리의 Blob URL로만 존재한다 —
  페이지를 벗어나면 사라지므로, 그 자리에서 바로 다운로드해야 한다. 이력 저장
  기능은 없다.

## 구현된 범위

- MP4/MKV/AVI/MOV/WebM/FLV/WMV/M4V/TS 업로드(파일 선택만, 서버 전송 없음)
- 40/50fps와 160~800px 너비 설정
- 최대 20개 파일, 파일당 200MB(브라우저 메모리 기준 안전값)
- FFmpeg 2-pass palettegen/paletteuse 최적화 및 8MiB 품질 래더(원본 해상도부터
  단계적으로 낮춰가며 8MiB 이하가 될 때까지 재시도)
- AIMaster 프로그램 권한(구독/수동 부여/회원 등급) 검사는 로그인 게이트
  (`requireProgramAccess()`)로 그대로 유지 — `/dashboard` 진입 자체는 여전히
  로그인 필요

## 실행

```bash
npm install
npm run dev
```

별도 워커 프로세스가 필요 없습니다 — 변환은 브라우저에서 처리됩니다.

## 남아있는 미사용 리소스 (정리 대상, 급하지 않음)

레거시 서버 아키텍처의 흔적으로 아래가 공유 Supabase DB에 남아있는데, 새 코드는
전혀 참조하지 않습니다. 실제로 지울지는 별도로 확인 후 진행할 것(데이터 삭제는
사용자 확인 필요 원칙):
- `videotogif_conversions` 테이블
- `videotogif-uploads`, `videotogif-results` Storage 버킷
