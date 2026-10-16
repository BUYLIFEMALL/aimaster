-- 2026-10-16 P4: Pexels·Pixabay API 키 발급 매뉴얼(platform_guides, 메인 사이트 /guides/[id]) — 기존 '이미지 | 음악 | 나레이션' 분류 형식
insert into public.platform_guides(category,title,content,sort_order,is_active)
select '이미지 | 음악 | 나레이션','Pexels(펙셀스) API 키 발급받기',
$g$<p>Pexels는 무료로 쓸 수 있는 고화질 사진·동영상을 제공하는 스톡 사이트입니다. API 키를 등록하면 프로그램 안에서 장면 배경으로 쓸 사진·세로 영상을 바로 검색할 수 있습니다. 키 발급과 사용은 무료입니다.</p>
<ol>
<li><a href="https://www.pexels.com/api/" target="_blank">pexels.com/api</a>에 접속해 Pexels 계정으로 로그인합니다(없으면 이메일이나 구글 계정으로 가입).</li>
<li><strong>Get Started</strong>(또는 Your API Key) 버튼을 누르면 짧은 신청 양식이 나옵니다. 사용 목적에 "쇼츠 영상 배경 검색" 정도로 적고, 웹사이트 주소 칸에는 본인 채널·블로그 주소를 적어 제출합니다.</li>
<li>화면에 표시된 <strong>API Key</strong>를 복사합니다(다른 사람에게 보내지 마세요).</li>
<li>프로그램의 <strong>🔑 API키등록·플랫폼연동 → Pexels</strong> 칸에 붙여 넣고 [안전하게 저장] → [연결 확인]을 누릅니다.</li>
</ol>
<p><strong>알아 두기</strong>: 기본 사용량은 시간당 200회, 월 2만 회 정도입니다(Pexels 정책에 따라 바뀔 수 있음). 사진·영상은 무료로 쓸 수 있지만 Pexels는 영상 설명란 등에 촬영자·Pexels 출처를 밝히기를 권장합니다. 키는 회원 본인 것을 쓰며, 사용량도 본인 계정에 적용됩니다.</p>$g$,8,true
where not exists (select 1 from public.platform_guides where title='Pexels(펙셀스) API 키 발급받기');

insert into public.platform_guides(category,title,content,sort_order,is_active)
select '이미지 | 음악 | 나레이션','Pixabay(픽사베이) API 키 발급받기',
$g$<p>Pixabay는 무료 사진·일러스트·동영상을 제공하는 스톡 사이트입니다. API 키를 등록하면 프로그램 안에서 장면 배경용 이미지와 영상을 검색할 수 있습니다. 키 발급과 사용은 무료입니다.</p>
<ol>
<li><a href="https://pixabay.com" target="_blank">pixabay.com</a>에서 회원가입하거나 로그인합니다.</li>
<li>로그인한 상태로 <a href="https://pixabay.com/api/docs/" target="_blank">pixabay.com/api/docs</a>에 들어갑니다.</li>
<li>문서 중간 <strong>Parameters</strong> 표의 <strong>key (required)</strong> 줄에 본인 API 키가 표시됩니다. 이 값을 복사합니다.</li>
<li>프로그램의 <strong>🔑 API키등록·플랫폼연동 → Pixabay</strong> 칸에 붙여 넣고 [안전하게 저장] → [연결 확인]을 누릅니다.</li>
</ol>
<p><strong>알아 두기</strong>: 사용량은 60초에 100회 정도로 제한됩니다(Pixabay 정책에 따라 바뀔 수 있음). 검색 결과 이미지를 다른 사이트에 계속 링크해 두고 쓰는 것은 허용되지 않으니, 프로그램에서 영상을 만드는 용도로만 쓰세요. 키는 회원 본인 것을 쓰며, 사용량도 본인 계정에 적용됩니다.</p>$g$,9,true
where not exists (select 1 from public.platform_guides where title='Pixabay(픽사베이) API 키 발급받기');
