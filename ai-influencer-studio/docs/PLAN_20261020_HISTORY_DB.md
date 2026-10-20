# 개발 플랜 — 작업 히스토리를 회원 계정(DB)에 저장 (2026-10-20, Claude Code 윈도우)

주인님 승인: 「진행해줘」(추가개선 제안 2-1, 운영 DB 새 표 승인).

## 문제
작업 히스토리가 브라우저 localStorage에만 있어 다른 PC·브라우저에서 보이지 않고, 원본 이미지(base64)를 그대로 담아 저장 공간이 차면 저장이 실패한다.

## 방법
- 표 `aif_history`(id·user_id·image_path·captions jsonb·config jsonb·summary·created_at), RLS 본인 읽기만, 쓰기는 서버(서비스 키)만.
- 비공개 버킷 `aif-history`, 경로 `{userId}/history/{id}.jpg`, 보여 줄 때 1시간 서명 주소.
- 브라우저에서 긴 변 1440px JPEG로 줄여 `/api/history` POST(base64). 회원당 최근 30개, 생성 30일 지나면 자동 삭제(목록을 불러올 때 정리).
- `config`에서 사진 데이터(personImage·placeImage·productImages·lastResultImage)는 빼고 글자 설정만 저장 — 불러오기 때 직접 올린 사진은 복원되지 않음(얼굴 사진을 서버에 불필요하게 남기지 않기 위함).
- 기존 브라우저 히스토리는 처음 열 때 하나씩 계정으로 옮기고 브라우저에서 지움.

## 검수
tsc·시험·build, 운영 SQL 적용 후 크롬(관리자): 히스토리 API 목록·저장·삭제(비용 없는 작은 시험 이미지로 POST → 목록에 나타남 → 삭제), 30일 정리 코드 확인.

## 배포·비용
v1.20, DB 표·버킷 추가(크롬 SQL Editor). 유료 API 0, 운영 저장 용량 소량.
