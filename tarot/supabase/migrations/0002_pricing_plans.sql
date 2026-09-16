-- 신규 프로그램 등록 시 표준 규칙: programs 행이 어떻게 만들어졌든 pricing_plans에
-- 플랫폼 현재 기본 3단계 요금제(1/2/3개월)를 반드시 함께 등록한다(2026-09-07부터의
-- components/admin/ProgramForm.tsx DEFAULT_PLANS 기준, naver-cafe-poster가 실제로 쓰고
-- 있는 값과 동일하게 확인 후 그대로 반영).
--
-- 참고: tarot-reading은 required_grade_id="일반"이라 로그인만 하면 무료로 이용할 수 있고,
-- 이 pricing_plans는 카탈로그 표시/향후 등급 정책 변경 대비용으로 표준 규칙에 따라
-- 등록해둔 것이지, 현재 실제 결제를 요구하지는 않는다(mbti-character도 동일한 이유로
-- 이 표를 비워뒀었지만, 이 저장소의 "신규 프로그램에는 항상 기본 요금제를 넣는다"는
-- 반복 지침을 우선해 여기서는 채워 넣는다).
insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select id, '1개월', 'monthly', 10000, 10000, true, 0 from programs where slug = 'tarot-reading'
union all
select id, '2개월', 'bimonthly', 20000, 20000, true, 1 from programs where slug = 'tarot-reading'
union all
select id, '3개월', 'quarterly', 30000, 30000, true, 2 from programs where slug = 'tarot-reading';
