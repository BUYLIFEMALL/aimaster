-- v1.03 (2026-10-13): 4단계 — 회원 본인의 Google Drive 연동(내 Google Cloud 앱·내 계정, drive.file 범위)
UPDATE public.programs SET
  version = 'v1.03',
  short_desc = '마크다운 문서를 서식 도구로 편집·미리보기하고, 파일을 가져오며, HTML·PDF·Word·ZIP 내보내기와 내 Google Drive 동기화를 지원하는 문서 작업실',
  description = '마크다운 문서를 쓰고 바로 완성된 모습으로 확인하는 문서 작업실입니다. 제목·굵게·목록(글머리·숫자·알파벳·체크)·표·코드·링크·이미지·특수기호 서식 도구와 단축키, 찾기·바꾸기, 실행 취소를 지원하고, 문서와 폴더를 정리하며 수정 이력 30개와 휴지통으로 복원할 수 있습니다. 마크다운(.md)·텍스트(.txt) 파일이나 폴더를 가져오고, 문서·폴더·전체를 마크다운, HTML, PDF(글자 선택 가능), Word(.docx)로 내보내거나 폴더 구조를 유지한 ZIP으로 받을 수 있으며, 전체 백업(.json)과 복원도 지원합니다. 내가 만든 Google Cloud 앱(OAuth Client ID)과 내 Google 계정으로 연결하면 내 Google Drive의 전용 폴더에 문서를 올리고 가져올 수 있습니다(Drive에서 바뀐 파일은 덮어쓰지 않고 충돌로 알림, Drive 파일은 삭제하지 않음). 문서는 로그인한 계정별로 이 브라우저에 자동 저장되며 다른 기기로 자동 전달되지 않으므로 정기적으로 백업하거나 Drive에 올려 보관하세요. AI 키는 필요하지 않습니다.',
  updated_at = NOW()
WHERE slug = 'markdown-studio';
