# VideoToGIF 에이전트 작업 지침

이 프로젝트는 AIMaster 공용 Supabase 인증·권한 체계를 사용하는 `video-to-gif` 서브프로젝트입니다. 작업 전 루트 `../AGENTS.md`와 `../CLAUDE.md`를 함께 읽습니다.

## 안전 규칙

- 코드·문서·로컬 테스트는 자율 진행합니다.
- 파일 삭제, DB 마이그레이션 적용, 환경변수 변경, 실제 운영 배포, 실제 변환 워커 공개는 사전 확인합니다.
- 원본 영상은 DB에 저장하지 않고 임시 디렉터리에서 처리 후 삭제합니다.
- 결과 GIF는 사용자별 Storage 경로에 저장하고 다운로드 권한을 분리합니다.

## 구현 원칙

- 프로그램 slug: `video-to-gif`
- 변환은 FFmpeg Docker 워커에서 FIFO 순차 처리합니다.
- GIF는 2-pass `palettegen`/`paletteuse`를 사용합니다.
- 출력은 8MiB 이하가 될 때까지 해상도·팔레트를 단계적으로 최적화하며 영상 길이는 임의로 자르지 않습니다.
- 작업 상태를 `pending`/`processing`/`done`/`error`로 영속화합니다.
- 권한이 필요한 레이아웃/API에는 `dynamic = "force-dynamic"`과 `fetchCache = "force-no-store"`를 함께 선언합니다.
