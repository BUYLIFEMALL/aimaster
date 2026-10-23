-- 모델 설정을 생성 버튼 아래 독립 박스로 이동하고 저장·복원 상태를 표시한다.
update public.programs
set version = 'v1.33', updated_at = now()
where slug = 'naver-blog-agent';
