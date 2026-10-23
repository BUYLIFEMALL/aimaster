# 운영 연결 승인안 — AI 포토 리메이크 자동화 v1.01

기능 구현 요청은 승인되어 진행했습니다. 이 문서는 루트 AGENTS.md §2의 **환경변수 변경 사전 승인**을 위한 구체적인 목록입니다.

## 준비된 대상

- Vercel 팀: `buylife`, 로그인 운영 계정: `buylifemall`(메인 계정 기준).
- 새 프로젝트: `photo-remake-studio`, ID `prj_IMBywWlSqMCEBjOcvwp3gaMMml4J`.
- 로컬 폴더: `D:/Antigravity/AIMaster/photo-remake-studio`.
- 목표 도메인: `https://photo-remake-studio.buylife.xyz`.
- 새 DB 테이블·스키마·Storage 버킷·OAuth 앱·공용 Gemini 키는 만들지 않습니다.

## 승인받을 환경변수 연결

현재 새 프로젝트의 환경변수 목록은 비어 있습니다. 기존 AIMaster 공유 Supabase 프로젝트 `esgxyikcnnvmlhygjkth`에 연결하기 위한 3종만 등록합니다.

| 이름 | 사용 목적 | 공개 여부 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 기존 통합 로그인·회원 DB 주소 | 공개 설정 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 기존 회원 로그인용 공개 키 | 공개 설정 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버에서 회원 권한·본인 키를 조회/저장 | 서버 전용 비밀 |

기존 공유 연결 값은 변경하지 않고 새 프로그램에 재사용합니다. 로컬은 Git 제외 `.env.local`, Vercel은 이 새 프로젝트의 Production/Development에만 연결합니다. Preview는 운영 DB와 연결하지 않습니다. 실제 값은 채팅·문서·로그·커밋에 출력하지 않습니다. 회원 Gemini 키는 환경변수로 넣지 않습니다.

## 환경변수 승인 후 이어서 할 일반 작업

1. 기존 programs/pricing_plans에 준비된 등록 DML 실행. 이름 `AI 포토 리메이크 자동화`, slug `photo-remake-studio`, v1.01, 이미지 카테고리, 일반 최소등급, 기본 3요금제.
2. 로컬 실제 회원 로그인·본인 키 검수. 테스트 계정 본인 키만 사용하고 키/비밀번호 입력은 주인님이 직접 합니다.
3. 승인 반영 인수인계→커밋→푸시→프로덕션 배포→도메인 연결 및 확인. 배포 전 새 프로젝트 ID/폴더 확인.
4. 프로그램/버전/도메인/요금제/썸네일·권한 일치 확인. 실제 회원 복원·합성·다운로드·보관 및 휴대폰 폭 검수.

회원 등급·개별 사용기간은 임의 변경하지 않습니다. 테스트 계정에 새 프로그램 권한이 없으면 확인하고 필요한 부여 범위를 별도로 기록합니다. 기존 VIP 프로그램 매핑은 플랫폼 등록 관례에 따라 새 프로그램에도 적용합니다.
