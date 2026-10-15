-- 2026-10-15 v1.04: 원본 서식 유지 저장(ExcelJS, 결과 100만 칸까지), 원본 행 위치 추적, 큰 파일 메모리 실측. 스키마 변경 없음.
update programs set version = 'v1.04', updated_at = now() where slug = 'file-merge';
