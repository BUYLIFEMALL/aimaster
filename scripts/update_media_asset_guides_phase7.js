const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const env = readEnv(path.join(__dirname, '..', '.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const guidesData = [
  // 1. JSON2Video API
  {
    id: 'b632a359-d9fd-4e0c-8920-3283094a4892',
    title: 'JSON2Video API 연동하기',
    content: `<div class="space-y-6">
  <!-- 발급 개요 카드 -->
  <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">🎥</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #e0e7ff; margin: 0;">JSON2Video 클라우드 영상 합성 엔진 연동 개요</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #c7d2fe; margin-bottom: 16px;">
      JSON2Video는 자막, 나레이션 오디오, 이미지, 배경 비디오 클립을 JSON 규격으로 전송하면 서버에서 <strong>고화질(HD) 비디오로 자동 합성·렌더링</strong>해주는 전문 클라우드 미디어 서비스입니다. AI 음악 자동생성기, 쇼츠 제작기 등에서 영상 자동 조립용으로 활용됩니다.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⏱️ 소요시간: <strong style="color: #f8fafc;">약 3분</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎯 난이도: <strong style="color: #34d399;">초급 (이메일로 키 즉시 발송)</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎁 무료 크레딧: <strong style="color: #818cf8;">첫 가입 시 600크레딧 지급</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🔑 필요값: <strong style="color: #f8fafc;">API Key</strong>
      </div>
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #6366f1; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">JSON2Video 회원가입</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://json2video.com" target="_blank" rel="noreferrer" style="color: #818cf8; text-decoration: underline; font-weight: 600;">json2video.com</a>에 접속한 후, 우측 상단의 <strong>[Sign up]</strong> 또는 무료 시작 버튼을 클릭하여 본인 이메일을 입력합니다.
      </p>
      <div style="background: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #c7d2fe;">
        💡 <strong>신용카드 등록 없음:</strong> 회원가입 시 카드 정보를 요구하지 않으며, 이메일 주소만으로 가입이 완료됩니다.
      </div>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #6366f1; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">이메일 수신함에서 API Key 확인</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        가입 버튼을 누르면 입력한 메일 주소로 환영 메일이 도착합니다. 메일 본문에 적힌 <strong>API Key</strong>를 복사합니다.
      </p>
      <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #fde68a;">
        ⚠️ <strong>주의:</strong> JSON2Video는 이 API 키가 대시보드 로그인 비밀번호이자 API 호출 인증키 역할을 동시에 수행합니다. 메일을 보관하거나 키를 안전한 곳에 메모해 두세요.
      </div>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #6366f1; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">AIMaster에 API Key 등록</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        AIMaster 상단 메뉴의 <strong>[API키등록·플랫폼연동]</strong> 화면으로 이동하여, 미디어 섹션의 <strong>JSON2Video API Key</strong> 항목에 복사한 키를 붙여넣고 저장합니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">영상 제작 프로그램에서 연동 테스트</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        AI 쇼츠/비디오 자동 제작기 프로그램에서 영상 렌더링 엔진 옵션으로 JSON2Video를 선택하면 클라우드 서버에서 백그라운드로 영상 렌더링이 가동됩니다.
      </p>
      <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #a7f3d0;">
        🎉 <strong>연동 완료:</strong> 가입 시 제공된 600크레딧으로 HD 영상 약 5~10편을 무료로 제작해 보실 수 있습니다!
      </div>
    </div>
  </div>

  <!-- FAQ 및 팁 -->
  <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 20px;">
    <h4 style="font-size: 15px; font-weight: 700; color: #f8fafc; margin-bottom: 12px;">💡 자주 묻는 질문 & 문제 해결</h4>
    <div style="space-y: 10px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
      <div style="margin-bottom: 10px;">
        <strong style="color: #818cf8;">Q. 가입 메일이 안 와요!</strong><br />
        스팸 메일함(Spam/Junk)을 확인해 보시거나, 1~2분 뒤 다시 확인해 주세요. 여전히 오지 않으면 사이트 로그인 화면에서 이메일을 재입력하면 키가 재발송됩니다.
      </div>
      <div>
        <strong style="color: #818cf8;">Q. 600크레딧을 다 쓰면 어떻게 되나요?</strong><br />
        크레딧 소진 시 렌더링이 일시 중단되며, 추가 영상 생성이 필요할 경우 JSON2Video 웹사이트 대시보드에서 크레딧을 충전(Pay as you go)하실 수 있습니다.
      </div>
    </div>
  </div>
</div>`
  },

  // 2. PLACID API
  {
    id: '33089b0c-fb3b-4a7e-b872-527a35b988a0',
    title: 'PLACID API 연동하기',
    content: `<div class="space-y-6">
  <!-- 발급 개요 카드 -->
  <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">🖼️</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #ede9fe; margin: 0;">PLACID 템플릿 기반 이미지·배너 자동생성 엔진 연동</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #ddd6fe; margin-bottom: 16px;">
      PLACID는 미리 디자인해 둔 템플릿(글자 영역, 배경 이미지, 로고, 태그)에 AI 텍스트와 사진을 자동으로 채워 넣어 <strong>유튜브 썸네일, 블로그 대표 이미지, 인스타그램 카드뉴스, 오픈그래프(OG) 배너</strong>를 대량 자동 생성하는 전문 디자인 API입니다.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⏱️ 소요시간: <strong style="color: #f8fafc;">약 4분</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎯 난이도: <strong style="color: #fbbf24;">중급 (템플릿 생성 필요)</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎁 체험 혜택: <strong style="color: #c084fc;">7일간 50크레딧 무료 체험</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🔑 필요값: <strong style="color: #f8fafc;">API Token & Template ID</strong>
      </div>
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #8b5cf6; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">PLACID 회원가입 및 새 프로젝트 생성</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://placid.app" target="_blank" rel="noreferrer" style="color: #a78bfa; text-decoration: underline; font-weight: 600;">placid.app</a>에 접속하여 <strong>[Try for free]</strong>를 눌러 가입합니다. 가입 후 대시보드에서 <strong>[Create Project]</strong>를 클릭해 새 프로젝트를 만듭니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #8b5cf6; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">디자인 템플릿 선택 및 Template ID 확인</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        프로젝트 내에서 <strong>[Templates] → [Add Template]</strong>을 클릭하여 마음에 드는 프리셋 템플릿을 선택하거나 직접 편집합니다. 생성이 완료되면 템플릿 상세 페이지 URL 또는 설정 창에서 <strong>Template ID</strong>(예: <code>xyz123abc</code>)를 복사해 둡니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #8b5cf6; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">API Token 발급</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        상단 메뉴 또는 프로젝트 설정에서 <strong>[API Tokens]</strong> 메뉴로 이동한 뒤, <strong>[Create API Token]</strong> 버튼을 클릭합니다. 토큰 이름을 입력하고 생성된 <strong>API Token</strong> 문자열을 복사합니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">AIMaster에 토큰 및 템플릿 연동</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        AIMaster <strong>[API키등록·플랫폼연동]</strong> 화면의 PLACID 항목에 <strong>API Token</strong>과 <strong>Template ID</strong>를 각각 등록합니다. 등록 후 카드뉴스 및 썸네일 생성 시 해당 템플릿 기반으로 자동 렌더링됩니다.
      </p>
    </div>
  </div>

  <!-- FAQ 및 팁 -->
  <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 20px;">
    <h4 style="font-size: 15px; font-weight: 700; color: #f8fafc; margin-bottom: 12px;">💡 PLACID 활용 팁</h4>
    <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
      - 템플릿 내부의 글자 레이어 이름(예: <code>title</code>, <code>subtitle</code>)을 정확히 지정해 두면, AIMaster의 AI가 생성한 제목이 알맞은 위치에 자동으로 배치됩니다.<br />
      - 7일 무료 기간 종료 후 정기 이용을 원하시면 월 19달러 플랜으로 전환하여 사용하실 수 있습니다.
    </div>
  </div>
</div>`
  },

  // 3. Cloudinary API
  {
    id: 'e2004c0f-160d-4360-bcbf-98f4409edde2',
    title: 'Cloudinary API 연동하기',
    content: `<div class="space-y-6">
  <!-- 발급 개요 카드 -->
  <div style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">☁️</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #e0f2fe; margin: 0;">Cloudinary 클라우드 미디어 CDN & 실시간 이미지 변환 연동</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #bae6fd; margin-bottom: 16px;">
      Cloudinary는 대용량 이미지와 영상을 초고속 클라우드에 영구 업로드하고, URL 파라미터만으로 <strong>사이즈 조절, WebP 포맷 압축, 배경 투명화, 워터마크 합성</strong>을 즉시 수행하는 글로벌 엔터프라이즈 미디어 솔루션입니다.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⏱️ 소요시간: <strong style="color: #f8fafc;">약 4분</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎯 난이도: <strong style="color: #fbbf24;">중급 (3개 인증값 필요)</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        💰 비용: <strong style="color: #38bdf8;">매월 25 크레딧 영구 무료</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🔑 필요값: <strong style="color: #f8fafc;">Cloud Name, API Key, Secret</strong>
      </div>
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #0284c7; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">Cloudinary 무료 가입</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://cloudinary.com" target="_blank" rel="noreferrer" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">cloudinary.com</a>에 접속하여 <strong>[Sign Up for Free]</strong>를 통해 가입합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #0284c7; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">Settings → API Keys 메뉴 접속</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        로그인 후 좌측 하단의 톱니바퀴 아이콘 <strong>[Settings]</strong>를 클릭하고, 좌측 메뉴에서 <strong>[API Keys]</strong>(또는 대시보드 메인 화면의 Product Environment Credentials)로 이동합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #0284c7; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">3대 인증 키값 복사</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        화면에 표시되는 3가지 필수 정보를 각각 복사합니다:
      </p>
      <ul style="font-size: 13px; color: #e2e8f0; line-height: 1.8; margin: 0 0 12px 20px;">
        <li><strong>Cloud name:</strong> 본인 클라우드 저장소 고유 명칭 (예: <code>dx8q...</code>)</li>
        <li><strong>API Key:</strong> 15~16자리 숫자형 공개 키</li>
        <li><strong>API Secret:</strong> 비공개 비밀키 ([eye] 아이콘 클릭하여 표시 후 복사)</li>
      </ul>
      <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #fca5a5;">
        ⚠️ <strong>보안 주의:</strong> API Secret은 회원님의 저장소에 직접 파일을 올리고 삭제할 수 있는 강력한 비밀키입니다. 타인에게 공유하지 마세요.
      </div>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">AIMaster 설정에 3대 키값 저장</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        AIMaster <strong>[API키등록·플랫폼연동]</strong> 화면의 Cloudinary 섹션에 <strong>Cloud Name, API Key, API Secret</strong> 3개 항목을 모두 입력하고 저장합니다.
      </p>
      <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #a7f3d0;">
        🎉 <strong>영구 무료 한도:</strong> 매월 25 크레딧(이미지 변환 약 25,000회 또는 25GB 트래픽)이 평생 무료로 갱신됩니다!
      </div>
    </div>
  </div>
</div>`
  },

  // 4. Pixabay API
  {
    id: 'c315c6d7-4187-446a-86da-5c37d4274d54',
    title: 'Pixabay(픽사베이) API 키 발급받기',
    content: `<div class="space-y-6">
  <!-- 발급 개요 카드 -->
  <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.05) 100%); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">📷</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #ecfdf5; margin: 0;">Pixabay 상업용 100% 무료 스톡 이미지 & 비디오 검색 API 개요</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #a7f3d0; margin-bottom: 16px;">
      Pixabay는 430만 개 이상의 고화질 사진, 일러스트, 벡터 그래픽 및 동영상 클립을 <strong>출처 표기 없이 상업적으로 완전 무료</strong>로 사용할 수 있는 글로벌 스톡 플랫폼입니다. 블로그 포스팅, 유튜브 숏츠 배경 영상, 상세페이지 에셋 수집에 활용됩니다.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⏱️ 소요시간: <strong style="color: #f8fafc;">약 2분</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎯 난이도: <strong style="color: #34d399;">초급 (가입 즉시 1초 발급)</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        💰 비용: <strong style="color: #34d399;">100% 영구 무료</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⚡ 무료 한도: <strong style="color: #f8fafc;">분당 5,000회 / 초당 100회</strong>
      </div>
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">Pixabay 회원가입 및 로그인</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://pixabay.com" target="_blank" rel="noreferrer" style="color: #34d399; text-decoration: underline; font-weight: 600;">pixabay.com</a>에 접속하여 우측 상단의 <strong>[회원가입]</strong> 또는 구글/이메일 계정으로 로그인합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">개발자 API 문서 페이지 접속</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        로그인된 상태에서 <a href="https://pixabay.com/api/docs/" target="_blank" rel="noreferrer" style="color: #34d399; text-decoration: underline; font-weight: 600;">pixabay.com/api/docs</a>로 이동합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">녹색 상자에서 본인 API Key 복사</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        화면을 약간 아래로 스크롤하면 <strong>'Parameters'</strong> 섹션의 <code>key</code> 설명 칸에 <strong>녹색 음영 상자</strong>로 회원님 계정 전용 API Key(예: <code>12345678-abcdef...</code>)가 자동으로 노출되어 있습니다. 이 키를 드래그하여 복사합니다.
      </p>
      <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #a7f3d0;">
        💡 <strong>원클릭 발급:</strong> 별도의 심사 신청이나 앱 등록 절차 없이, 로그인만 하면 즉시 개인 고유 키가 생성되어 나타납니다.
      </div>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">AIMaster에 API Key 저장</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        AIMaster <strong>[API키등록·플랫폼연동]</strong> 화면의 <strong>Pixabay API Key</strong> 입력 칸에 복사한 키를 붙여넣고 저장합니다. 이제 블로그 제작기나 쇼츠 제작기에서 고화질 배경 이미지를 실시간으로 마음껏 검색하실 수 있습니다!
      </p>
    </div>
  </div>
</div>`
  },

  // 5. Pexels API
  {
    id: 'ff6c331e-74a8-4b00-99c9-3b91f44f41f7',
    title: 'Pexels(펙셀스) API 키 발급받기',
    content: `<div class="space-y-6">
  <!-- 중요 상태 공지 배너 -->
  <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 14px; padding: 18px 20px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
      <span style="font-size: 20px;">⚠️</span>
      <h4 style="font-size: 15px; font-weight: 700; color: #fde68a; margin: 0;">Pexels 신규 API 발급 정책 안내 (대체재: Pixabay)</h4>
    </div>
    <p style="font-size: 13px; color: #fef3c7; line-height: 1.6; margin: 0;">
      Pexels 본사 정책에 따라 시기에 따라 신규 API 키 발급이 일시 중단될 수 있습니다. <strong>기존에 발급받은 키가 있는 분은 그대로 등록하여 정상 사용 가능</strong>하며, 신규 발급이 제한된 경우 100% 동일한 기능을 제공하는 <strong>Pixabay(픽사베이) API 키</strong>를 등록하여 사용하시면 됩니다.
    </p>
  </div>

  <!-- 발급 개요 카드 -->
  <div style="background: linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%); border: 1px solid rgba(20, 184, 166, 0.25); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">📸</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #ccfbf1; margin: 0;">Pexels 감성 스톡 사진 & 세로형 영상 검색 API 개요</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #99f6e4; margin-bottom: 16px;">
      Pexels는 감각적이고 트렌디한 인물/풍경 사진과 특히 <strong>세로형(9:16) 숏폼 동영상 클립</strong>을 풍부하게 제공하는 인기 무료 스톡 플랫폼입니다.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⏱️ 소요시간: <strong style="color: #f8fafc;">약 2분</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎯 난이도: <strong style="color: #34d399;">초급</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        💰 비용: <strong style="color: #2dd4bf;">100% 무료</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⚡ 무료 한도: <strong style="color: #f8fafc;">시간당 200회 / 월 20,000회</strong>
      </div>
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #0d9488; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">Pexels 계정 로그인</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://www.pexels.com" target="_blank" rel="noreferrer" style="color: #2dd4bf; text-decoration: underline; font-weight: 600;">pexels.com</a>에 접속하여 우측 상단의 <strong>[로그인]</strong> 또는 무료 계정을 생성합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #0d9488; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">Image & Video API 페이지 이동</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" style="color: #2dd4bf; text-decoration: underline; font-weight: 600;">pexels.com/api</a> 페이지로 이동합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #0d9488; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">API Key 신청 및 복사</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <strong>[Your API Key]</strong>를 클릭하고, 간단한 사용 목적(예: 'Personal Automation')을 입력하면 <strong>API Key</strong>가 화면에 나타납니다. 해당 키를 복사합니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">AIMaster 설정에 키 저장</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        AIMaster <strong>[API키등록·플랫폼연동]</strong> 화면의 Pexels API Key 항목에 복사한 키를 붙여넣고 저장합니다.
      </p>
    </div>
  </div>
</div>`
  }
];

async function updateGuides() {
  console.log(`총 ${guidesData.length}개 미디어 생성 & 에셋 가이드 본문 업데이트 시작...`);
  for (const item of guidesData) {
    const { error } = await supabase
      .from('platform_guides')
      .update({ content: item.content })
      .eq('id', item.id);
    if (error) {
      console.error(`- 업데이트 실패 [${item.title}]:`, error);
    } else {
      console.log(`- 업데이트 성공: [${item.title}] (${item.id})`);
    }
  }
  console.log('5개 미디어 생성 & 에셋 가이드 본문 업데이트 완료!');
}

updateGuides();
