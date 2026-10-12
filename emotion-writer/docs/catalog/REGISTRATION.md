# 프로그램·썸네일 등록 기록

2026-10-12 / Codex / 주인님 요청: “프로그램 등록하고 썸네일 등록해줘”.

- 등록: `감성 글귀 이미지`, slug `emotion-writer`, v1.01, 멀티미디어 분류, NEW 배지. ID `8ebf5939-c04d-4923-898f-4392b71d4a25`.
- 사용 권한 기준은 기존 일반 회원 프로그램 기준을 재사용했습니다. FREE 배지·회원 사용기간·API 키는 변경하지 않았습니다.
- 1개월 10,000원 / 2개월 20,000원 / 3개월 30,000원 기본 요금제를 등록했습니다.
- 준비된 `20261012040558_emotion_writer_catalog.sql`을 DML로 실행했습니다. 목록 설명에 `[운영 준비 중]`을 명시했습니다. 앱 URL은 목표 주소 `https://emotion-writer.buylife.xyz`이며 아직 배포하지 않았습니다.
- 썸네일은 기존 플랫폼 보유 카드뉴스 실사 이미지(한국인 여성의 이미지 편집 장면, 16:9)를 재사용했습니다. 신규 AI 이미지 생성·유료 호출은 없습니다. 원본 출처: `program-images/catalog/cardnews-studio-thumbnail.jpg?v=1791711618466`.
- 로컬 자료 `emotion-writer-thumbnail.jpg`를 기존 `scripts/upload-program-thumbnail.mjs`로 전용 `program-images/catalog/emotion-writer-thumbnail.jpg`에 업로드하고 DB URL에 캐시 버전 `?v=1791779388817`을 붙였습니다.
- DB 재조회: 프로그램/버전/분류/썸네일 및 활성 요금제 3개 확인. 공개 썸네일 HTTP 200, image/jpeg 확인.
- 운영 목록 `https://www.buylife.xyz/programs?q=감성`: HTTP 200, 프로그램명·전용 썸네일 경로·운영 준비 문구 포함 확인. DB 데이터 반영이므로 루트 재배포가 필요하지 않습니다.

다음 단계: 본인 사진 키 CHECK 추가와 새 프로젝트 DB 연결 변수 3개 설정에 대한 기존 승인 대기. 승인 후 앱 배포·정상 회원 실제 생성/다운로드 검수, 운영 준비 문구 해제. 현재 등록 요청을 이 두 변경의 승인으로 해석하지 않습니다.
