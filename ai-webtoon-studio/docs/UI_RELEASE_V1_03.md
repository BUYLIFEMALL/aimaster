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

## 운영 반영 결과

- 구현 커밋 `338c03b6`, origin/master 푸시 성공. Vercel 프로덕션 `dpl_FWFGqaiD8P2VdcZdW8qvRjLFMDKB`, Ready 확인. 운영 빌드·타입 검사 성공.
- 배포 URL `https://ai-webtoon-studio-p8fz5v99z-buylife.vercel.app`. 기존 studio 및 새 automation 커스텀 주소가 이 배포에 연결된 것을 Vercel inspect로 확인했습니다.
- DB 재조회: slug `ai-webtoon-studio`, version v1.03, 기존 이름/주소 유지.
- 두 도메인에서 비로그인 HTTP 307→AIMaster 로그인, no-store/MISS 확인. 정상 회원 `buylifemall@naver.com`의 기존 Chrome 세션으로 작업 화면과 STEP 4 진입 확인.
- 실제 접근성 트리에서 v1.03, 상단/STEP 4 ZIP·JPG 버튼 4개와 모델 배지 제거 확인. `evidence/v1.03-live-accessibility.txt` 저장.
- 운영 JavaScript 청크 HTTP 200: Flash/NB2 안내 문자열 없음, 노란 배경·짙은 글자 클래스 4곳 확인. `evidence/v1.03-live-assets.json` 저장.
- 화면 캡처는 데스크톱 제공자가 이미지를 반환하지 않아 실패했습니다. 시각 픽셀 검수를 완료했다고 보고하지 않습니다. 이번 요청은 배지/색상 변경이며 실제 파일 저장·AI 생성은 다시 실행하지 않았습니다. 원고·키·계정 변경 및 유료 호출은 없습니다.
- 로컬 CSS 해시 경로는 운영 빌드에서 404였습니다. 이를 운영 CSS 실패로 단정하지 않았고 실제 제공되는 UI JavaScript 및 로그인 화면 구성을 확인했습니다.

요청한 화면 수정·운영 배포는 완료했습니다. 기존 lint 설정/코드 오류와 최종 픽셀 캡처는 위 한계로 남깁니다.
