-- Initial v1.01 catalog description: keep five paragraphs and 400–500 visible characters.
update public.programs
set description=replace(description,' 원문과 수정 이력을 따로 보관하며, 원고를 바꾸면 현재 내용으로 다시 점검할 수 있습니다.','')
where slug='blog-content-maker';
