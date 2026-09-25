# 대시보드·Chrome 확장 초안 연동

버전: extension v1.0.35

## 흐름

1. 사용자가 대시보드 생성 기록에서 초안을 선택한다.
2. `선택한 초안 확장으로 보내기`를 누른다.
3. Chrome 확장에서 `웹 초안 새로고침`을 누르고 초안을 선택한다.
4. `선택한 웹 초안 불러오기`로 제목·본문·키워드를 채운다.
5. 필요한 경우 확장에서 Gemini 대표 이미지를 새로 생성한 뒤 네이버 편집기에 입력한다.

이미지 데이터는 서버에 복제하지 않는다. 사용자의 Gemini API 키로 확장에서 다시 생성한다.

## 권한과 데이터

- 기존 `naver_blog_seo_drafts`를 재사용한다.
- migration `supabase/migrations/20260925093443_extension_draft_handoff.sql`이 `extension_handoff_at`, `extension_imported_at`을 추가한다.
- 웹 전송 준비 API는 현재 로그인한 사용자 소유 초안만 갱신한다.
- 확장 API는 검증된 확장 토큰의 동일 사용자 ID 초안만 조회·불러오기 기록 처리한다.
- 네이버의 최종 발행 버튼은 자동화하지 않는다. 사용자가 확인 후 직접 발행한다.
- 웹 초안을 불러와 네이버 편집기 입력을 시작하면 `진행 중`, 검증 완료 시 `입력 완료`, 오류 시 `재확인 필요` 상태가 대시보드 생성 기록에 표시된다.

## API

- `POST /api/drafts/handoff` — 선택 초안을 확장 전송함에 준비
- `GET /api/extension/drafts/library` — 전송 준비된 내 초안 목록 조회
- `POST /api/extension/drafts/library/:draftId/claim` — 확장에서 초안을 불러온 시각 기록
