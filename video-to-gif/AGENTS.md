# VideoToGIF 에이전트 작업 지침

이 프로젝트는 AIMaster 공용 Supabase 인증·권한 체계를 사용하는 `video-to-gif` 서브프로젝트입니다. 작업 전 루트 `../AGENTS.md`와 `../CLAUDE.md`를 함께 읽습니다.

## 안전 규칙

- 코드·문서·로컬 테스트는 자율 진행합니다.
- 파일 삭제, DB 마이그레이션 적용, 환경변수 변경, 실제 운영 배포, 실제 변환 워커 공개는 사전 확인합니다.
- 원본 영상은 DB에 저장하지 않고 임시 디렉터리에서 처리 후 삭제합니다.
- 결과 GIF는 사용자별 Storage 경로에 저장하고 다운로드 권한을 분리합니다.

## 구현 원칙

- 프로그램 slug: `video-to-gif`
- **2026-09-20부터 변환은 서버(Render 워커)가 아니라 브라우저에서 `@ffmpeg/ffmpeg`
  (ffmpeg.wasm)로 직접 처리합니다.** 이전엔 Vercel API → Render Docker 워커 구조였는데,
  Vercel 요청 본문 100MB 제한·Render Blueprint가 이 저장소 전체 push마다 워커를
  재배포해 작업이 유실되는 문제·두 서버 간 비밀값 불일치 등이 반복돼 사용자와 상의 후
  서버를 제거하고 브라우저 처리로 전환했다(자세한 경위는 README.md 참고). **이제 이
  프로젝트에는 별도 워커/백엔드 변환 서버가 없다 — 새 기능을 추가할 때 워커를 다시
  만들지 말고, 브라우저 쪽 ffmpeg.wasm 로직(`components/ConverterWorkspace.tsx`)을
  확장할 것.**
- GIF는 2-pass `palettegen`/`paletteuse`를 사용합니다(브라우저 안에서 실행).
- 출력은 8MiB 이하가 될 때까지 해상도·팔레트를 단계적으로 최적화하며 영상 길이는 임의로 자르지 않습니다.
- 원본 영상과 결과 GIF 모두 서버/DB에 저장하지 않습니다 — 결과는 브라우저 메모리의
  Blob URL로만 존재하고 페이지를 벗어나면 사라집니다. 이력 저장이 필요해지면 그때
  다시 설계할 것(현재는 의도적으로 없음).
- 로그인 게이트(`requireProgramAccess()`)는 그대로 유지합니다 — `/dashboard` 진입 자체는
  여전히 AIMaster 프로그램 권한이 필요합니다.
- 권한이 필요한 레이아웃에는 `dynamic = "force-dynamic"`과 `fetchCache = "force-no-store"`를 함께 선언합니다.
