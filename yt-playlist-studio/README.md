# Youtube Playlist 자동화 (YouTube Playlist Automation)

> **버전**: `v1.03`  
> **공식 도메인**: `https://youtube-playlist.buylife.xyz` (기존: `https://yt-playlist.buylife.xyz`)  
> **플랫폼**: AIMaster 통합 서브프로젝트

## 주요 기능
- **Web Audio 기반 10종 오디오 스펙트럼 비주얼라이저** (막대, 대칭, 미니, 원형, 선형, 파형, 필드, 라디알, 듀얼)
- **8종 감성 필터 & 10종 오버레이 & 6종 EDM FX & 14종 파티클 시스템**
- **유튜브 설명란용 챕터 타임라인 원클릭 복사**
- **Gemini Imagen 3 AI 배경 1클릭 자동 생성**
- **WebCodecs + mp4-muxer 기반 1080p MP4 브라우저 GPU 가속 고속 렌더링**
- **File System Access API 디스크 직접 스트리밍 저장 지원**


## 2026-10-16 DB 연동 변수 호환 — v1.04 (yt-playlist-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
