# v1.04 날짜·날씨 표시 제거

2026-10-12 / Codex / 주인님 요청: "날짜와 날씨", "필요 없는 기능이야".

`Header.tsx`에서 날짜·시간·날씨 문구와 아이콘을 제거하고 이를 위한 상태·Effect·30초 갱신 타이머를 삭제했습니다. API 키 등록 상태 줄은 우측 정렬하고 모바일에서 빈 줄이 남지 않게 했습니다. 노란 ZIP/JPG 버튼의 표시 및 클릭 동작을 유지합니다. 코드·package.json·lockfile 버전은 v1.04 / 1.04.0입니다.

검수·배포 순서: 로컬 빌드/타입 및 변경한 Header ESLint 검사 → 커밋·푸시 → 기존 buylife/ai-webtoon-studio 프로덕션 배포 → DB 버전 갱신 → 운영 자산 및 정상 회원 화면 확인. 별도 테스트나 유료 AI 호출은 추가하지 않습니다.

배포 대상 ID `prj_RbmM4Au1rFRZPHFMZFIgwjryQYCh`. 두 커스텀 주소 `https://ai-webtoon-studio.buylife.xyz`, `https://ai-webtoon-automation.buylife.xyz`를 유지합니다. 환경변수·DB 스키마·회원 키/원고 변경은 없습니다. 아래는 해당 프로그램 DB 메타데이터 버전 갱신 DML입니다.

```sql
update public.programs set version='v1.04', updated_at=now()
where slug='ai-webtoon-studio';
```

로컬 빌드·타입 검사 성공. 변경한 Header는 기존 emotion-writer의 ESLint 설정을 명시하여 검사했고 오류/경고 0개입니다. 헤더에서 날짜·날씨·갱신 타이머 문자열이 사라진 것도 확인했습니다. 프로젝트 전체 lint 통과로 보고하지 않습니다(기존 설정 부재는 v1.03 기록 참조). 검수·운영 반영 결과는 이어서 기록합니다.

## 운영 반영 결과

- 구현 커밋 `62d1275a`, origin/master 푸시 성공.
- Vercel 프로덕션 배포 `dpl_NSGYgaePc2GbSbX5yJezhRkKiguj` Ready 확인. 운영 빌드·타입 검사 성공. 배포 URL `https://ai-webtoon-studio-4ubcbrdlr-buylife.vercel.app`.
- Vercel inspect에서 studio/automation 두 기존 커스텀 주소의 해당 배포 연결 확인. DB 메타데이터 v1.04 갱신/조회 확인.
- 운영 UI 청크 HTTP 200: 고정 날씨·날짜 대체값·30초 갱신 코드 없음, 노란 다운로드 버튼 유지 확인. `evidence/v1.04-live-assets.json`.
- 정상 회원 `buylifemall@naver.com`의 Chrome 화면에서 v1.04 확인. 접근성 트리에 날짜·날씨가 없고 API 등록 상태·두 저장 버튼이 있는 것 확인. `evidence/v1.04-live-accessibility.txt`.
- 원고 변경·다운로드 실행·유료 생성 호출 없이 검수했습니다. 픽셀 캡처 검수는 추가하지 않았습니다. 요청한 날짜·날씨 제거의 남은 작업은 없습니다.
