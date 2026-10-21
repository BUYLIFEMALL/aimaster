-- v1.12 (2026-10-21) 이미지 병합 A: AI 포토 리메이크 → 바나나 캔버스. 서버 키 스크립트로 적용(백업 docs/analysis-image-consolidation-20261021/backup-programs-before-merge-A.json).
-- 주인님 결정: 합친 뒤 FREE 배지 해제(「일반으로 돌려」). 포토 리메이크 권한 회원 148명은 모두 이미 바나나 캔버스 권한(같거나 긴 기간)을 보유 — 권한 추가 없음.
update public.programs
   set badges = array_remove(badges, 'free'), version = 'v1.12', updated_at = now()
       -- description·detail_sections(옛 사진 복원·소스별 지시·비교 슬라이더 문구)도 같은 작업에서 갱신
 where slug = 'banana-canvas';
