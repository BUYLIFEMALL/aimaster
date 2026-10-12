# Suno 음악기획 자동화 — 카탈로그 썸네일 등록

2026-10-12 주인님 요청으로 프로그램의 가사·스타일·앨범 기획 성격에 맞는 실사 썸네일을 제작하고 운영 카탈로그에 등록했습니다.

한국인 음악 기획자가 밝은 작업실에서 노트북과 노트로 곡을 구상하는 장면입니다. 모니터의 가사 구획·보라색 스타일 칩·6개 트랙 카드, 책상의 건반·헤드폰으로 기능을 표현합니다. 별도 문구·로고 없이 기존 카탈로그의 실사 톤과 맞췄습니다.

- 제작: Codex 내장 `image_gen` 도구 1회. 외부 생성 CLI·회원 AI 키·운영자 AI 키 사용 없음.
- 최종 프롬프트: [THUMBNAIL_PROMPT.txt](THUMBNAIL_PROMPT.txt).
- 프로젝트 보관 원본: [assets/suno-music-planning-thumbnail.png](assets/suno-music-planning-thumbnail.png), PNG 1,672×941, 약 16:9, 1,963,786바이트. 원본 편집/변환 없음. 카드는 기존 `aspect-video` 영역에 `object-cover`로 표시합니다.
- Storage: `program-images/catalog/suno-music-studio-thumbnail.png`.
- 등록 URL: https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/suno-music-studio-thumbnail.png?v=1791787531229
- 업로드: 저장소 루트에서 `node scripts/upload-program-thumbnail.mjs suno-music-studio suno-music-studio/docs/assets/suno-music-planning-thumbnail.png`. 재등록 시 이 도구가 캐시 구분용 `?v=`를 새로 붙입니다.
- 적용 DML 기록: `supabase/migrations/20261012064549_register_suno_music_thumbnail.sql`. Supabase CLI로 파일을 생성했고 실제 등록은 업로드 도구로 적용했습니다. 스키마 변경 없음.

## 검수 증거

등록 전 `programs.thumbnail_url`은 NULL이었습니다. 등록 후 해당 프로그램 1개 행의 URL·이름·v1.01·운영 주소를 다시 조회해 확인했습니다.

공개 원본 HTTP 200, `image/png`, 원본 파일과 다운로드 파일 SHA-256 동일:
`553da9364f18270e86970aefb9ce669f41d780b1a7fad50f1b84a4be840eb3e2`.

메인 `/`, 목록 `/programs`, 상세 `/programs/suno-music-studio` 모두 HTTP 200 및 새 URL을 참조하는 실제 `<img>`를 확인했습니다. Next 이미지 최적화 640px 응답도 HTTP 200이며 축소 이미지를 육안 확인했습니다.

운영 공개 페이지를 별도 비로그인 Headless Chrome으로 렌더링해 [상세 화면](assets/thumbnail-detail-proof.png)과 [멀티미디어 카탈로그 화면](assets/thumbnail-catalog-proof.png)을 확인했습니다. 카탈로그에서 다른 프로그램 썸네일과 나란히 비교해 실사 톤·카드 크롭·표시 상태를 확인했습니다. 사용자 Chrome은 포커스/스크린샷 제어 제한이 있어 이 방법으로 대체했으며, 사용자 로그인 세션을 복제하지 않았습니다.

`npm run build` 성공. 애플리케이션 코드 변경이 없는 카탈로그 메타데이터 등록이므로 `v1.01` 유지, 운영 반영은 Storage 업로드와 DB 갱신으로 완료했습니다. `docs/PLATFORM_PATTERNS.md` §12에 따라 이 이미지 반영을 위한 Vercel 재배포는 필요하지 않습니다.

원본 보관 폴더 이동 중 작업 디렉터리를 중복 지정한 경로 오류는 절대 경로로 수정했으며 이미지·등록 결과에 영향은 없었습니다. 관련 교훈은 루트 `docs/ERROR_LESSONS.md`에 남겼습니다.

이 썸네일 요청의 남은 작업은 없습니다. 기존 프로그램의 미검수 항목은 [RELEASE_V1_01.md](RELEASE_V1_01.md)를 유지합니다.
