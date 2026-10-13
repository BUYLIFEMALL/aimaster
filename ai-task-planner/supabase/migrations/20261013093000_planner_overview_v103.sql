-- Existing catalog row only. No schema, entitlement or member data changes.
update public.programs
set version = 'v1.03',
    description = replace(description, 'v1.02는', 'v1.03은') ||
      '<h3>한 화면에서 계획과 성과 확인</h3><p>통합 대시보드에서 집중 타이머, 분류별 미완료·완료 목록, 할 일 입력과 성과, 완료 차트 및 노트를 함께 확인합니다. 추가·수정·집중 시작 시 화면을 이동하지 않으며 분류를 바꾸면 목록과 성과·차트도 같은 범위로 갱신됩니다.</p>'
where id = '48732172-d5ef-4db9-bbb6-63413183d5a5'
  and slug = 'ai-task-planner'
  and version = 'v1.02';
