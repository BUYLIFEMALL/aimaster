# v1.03 화면 수정 기록

2026-10-12 / Codex / 주인님 캡처 요청: 상단 텍스트·이미지 모델 안내 제거, 이미지 다운로드 버튼 노란색 강조.

- `Header.tsx`: 텍스트/이미지 모델 배지 두 개 제거. ZIP·이어붙인 JPG 버튼에 노란색 배경·짙은 글자·테두리·키보드 포커스 표시.
- `WebtoonCanvasSection.tsx`: STEP 4의 두 저장 버튼에 같은 색 적용. 작은 화면에서는 버튼을 줄바꿈할 수 있게 수정.
- 버튼 클릭 핸들러·AI 생성·다운로드 구현은 변경하지 않았습니다.
- 코드/패키지 버전 v1.03 / 1.03.0. 이전 v1.02에서 누락된 lockfile 패키지 버전도 함께 맞췄습니다.
- `npm run build`: 타입 검사 포함 성공. React 검토: 버튼 type/onClick 유지, 읽을 수 있는 짙은 글자, 포커스 표시, 줄바꿈 확인.
- ESLint: 프로젝트 설정 파일이 없어 기본 실행 불가. 기존 emotion-writer 설정을 명시해 두 변경 파일을 추가 검사했으나 기존 코드의 any 2곳·문자열 `// 메인 표지` 규칙 오류 1개·미사용 값 경고 3개가 확인되었습니다. 이번 CSS/배지 수정에서 추가된 문제는 아니며 프로젝트 전체 lint 통과로 보고하지 않습니다.

배포 대상: buylife/ai-webtoon-studio (`prj_RbmM4Au1rFRZPHFMZFIgwjryQYCh`). 기존 `ai-webtoon-studio.buylife.xyz`와 새 `ai-webtoon-automation.buylife.xyz` 병행 지원을 유지합니다. 환경변수·DB 스키마·회원 키 변경은 없습니다. 아래 SQL은 해당 프로그램 메타데이터 버전만 갱신합니다.

```sql
update public.programs set version='v1.03', updated_at=now()
where slug='ai-webtoon-studio';
```

현재 로컬 검수 완료, 커밋·푸시·운영 배포와 배포 후 실제 화면 확인은 이어서 수행합니다. 유료 생성 호출이나 사용자의 원고 변경 없이 화면을 확인합니다.
