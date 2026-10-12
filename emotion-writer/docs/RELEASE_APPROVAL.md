# 운영 연결 승인 대상 — 감성 글귀 이미지 v1.01

코드·화면 구현, 테스트 및 로컬 빌드를 먼저 완료합니다. 다음 두 작업은 루트 AGENTS.md §2의 사전 승인 대상입니다: “환경변수/DB 스키마 변경”. 승인 전 실행하지 않습니다.

1. 공유 DB `public.user_api_keys`의 `user_api_keys_provider_check`에 `pixabay`, `pexels` 두 값만 추가. 기존 제공처 값은 유지하고 회원 행·키 값·RLS는 바꾸지 않습니다. SQL: `supabase/migrations/*_emotion_writer_personal_photo_keys.sql`.
2. 새 Vercel 프로젝트 `buylife/emotion-writer`에 AIMaster 공용 DB 연결 환경변수 세 개를 설정: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. 이미 사용하는 동일 공용 DB의 연결 값만 안전하게 복사하며 새 키 발급·키 교체·다른 프로젝트 환경변수 변경은 하지 않습니다. AI 공급사 키는 서버 환경변수로 넣지 않습니다.

승인 후 새 프로그램을 v1.01로 등록하고 표준 요금제/정상 회원 사용 권한 경로·본인 Gemini 키를 검수합니다. 무료 배지/특정 회원 사용기간을 임의 변경하지 않습니다. 정식 배포 주소는 `https://emotion-writer.buylife.xyz`로 준비하고 참고 주소 `emotion-writer.vercel.app`를 소유한 것처럼 변경하지 않습니다.
