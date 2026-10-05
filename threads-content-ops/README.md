# Threads 콘텐츠 운영 자동화 (PC 앱)

> AIMaster 프로그램 slug 예정값: `threads-content-ops` · 최초 출시 버전: `v1.01`

## 목적

여러 Threads 계정을 운영하는 회원이 자신의 API 키와 자신의 Meta Developers 앱을 연결하여, 콘텐츠 초안 작성·검토·예약·발행 이력을 하나의 Windows 데스크톱 앱에서 관리하도록 만든다. 이 프로그램은 AIMaster 전체 사이트 안에 등록되는 새 서브프로젝트이며, 회원·이용권한·결제·API 키·카탈로그는 AIMaster 공용 체계를 그대로 사용한다.

이 폴더는 기존 `threads/`, `threads-comment-reply/`, `threads-affiliate-poster/`, `threads-easy-planner/`와 완전히 분리된 새 프로그램이다. 기존 프로그램의 파일·DB 데이터·배포를 변경하지 않는다.

## 현재 단계

1단계 기반 편입 진행 중이다. `desktop/`에는 사용자가 지정한 `boksajang/threads-auto` 원본을 별도 사본으로 가져왔으며, 아직 AIMaster 인증·권한·키 관리로 전환하지 않았다. 원본의 Codex CLI 의존, 상표·저작권 표기, 외부 서비스 수집 기능은 출시 전에 교체 또는 제거 대상으로 관리한다.

## 목표 아키텍처

- **AIMaster 루트 웹**: 로그인, `threads-content-ops` 이용 권한, 결제/구독, 카탈로그, 다운로드, 개인 액세스 토큰 발급, 회원별 API 키·Threads 앱 자격증명 관리
- **Windows 데스크톱 앱**: 콘텐츠 작업 화면, 로컬 초안/예약/실행 이력, 공식 Threads API 호출 조율
- **서버 API**: 개인 액세스 토큰과 프로그램 이용 권한을 동시에 확인한 뒤 회원 본인 API 키만 사용
- **Threads 연동**: 회원이 직접 만든 Meta Developers Threads 앱의 `threads_app_id`/`threads_app_secret`만 사용. 운영자 공용 앱·공용 API 키는 사용하지 않는다.

## 단계별 범위

| 단계 | 범위 | 상태 |
| --- | --- | --- |
| 1 | 원본 편입, 독립 폴더·문서·위험요소 분리 | 진행 중 |
| 2 | AIMaster 개인 액세스 토큰 연결 및 이용권한 검증 | 예정 |
| 3 | 회원별 AI 키로 초안 생성, 단일 Threads 계정 수동 발행 | 예정 |
| 4 | 예약 발행·로컬 실행 이력·다계정 운영 | 예정 |
| 5 | 선택 기능(YouTube/RSS, 제휴 상품, Chrome 확장) 개별 심사 | 예정 |

## 실행 전 유의사항

- `desktop/package.json`은 Node.js 24.15 이상을 요구한다.
- 네이티브 모듈과 C# Native Messaging 호스트가 포함되어 있으므로, 의존성 설치나 설치 파일 생성 전 보안 검토를 먼저 한다.
- 원본 저장소 루트에는 별도 `LICENSE`/`NOTICE` 파일이 없었다. 원저작자에게 상업적 이용·변경·재배포 권한을 확인한 뒤 제품 코드로 전환한다.
- 앱 재시작만으로 자동 발행이 재개되면 안 되며, 예약/자동화는 기본 OFF로 시작한다.

상세 실행 계획은 [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)를, 작업 규칙은 [AGENTS.md](AGENTS.md)를 참고한다.
