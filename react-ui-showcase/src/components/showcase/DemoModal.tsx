"use client";

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Select } from '../ui/Select';
import { RadioGroup } from '../ui/RadioGroup';
import { Checkbox } from '../ui/Checkbox';
import { Toggle } from '../ui/Toggle';
import { Slider } from '../ui/Slider';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { ProgressBar } from '../ui/ProgressBar';
import { Tooltip } from '../ui/Tooltip';
import { Modal } from '../ui/Modal';
import { Popover } from '../ui/Popover';
import { 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Heart, 
  Star, 
  ArrowLeft 
} from '../ui/Icons';

interface DemoModalProps {
  demoId: string | null;
  onClose: () => void;
}

// 1. 버튼 데모
const ButtonDemo = () => {
  const [story, setStory] = useState('당신은 신비한 갈림길에 서 있습니다. 어느 길로 가시겠습니까?');
  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-base text-slate-800 font-medium leading-relaxed">{story}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setStory('용기의 길을 선택했습니다. 숨겨진 보물 상자와 지도를 발견했습니다!')}>
          <Star className="w-4 h-4 mr-1.5" />
          용기의 길 선택
        </Button>
        <Button variant="secondary" onClick={() => setStory('신중의 길을 선택했습니다. 조용히 주변을 살핀 뒤 안전하게 복귀했습니다.')}>
          신중의 길 선택
        </Button>
        <Button variant="danger" onClick={() => setStory('위험의 길을 선택했습니다! 야생 몬스터와 마주쳤으나 날렵하게 회피했습니다.')}>
          위험의 길 도전
        </Button>
      </div>
    </div>
  );
};

// 2. 인풋 데모
const InputDemo = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(false);
    if (!email) {
      setError('이메일은 필수 항목입니다.');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('유효한 이메일 형식을 입력해주세요. (예: user@domain.com)');
    } else {
      setError(undefined);
      setSubmitted(true);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div>
        <h4 className="text-base font-bold text-slate-900">뉴스레터 주간 구독</h4>
        <p className="text-xs text-slate-500 mt-1">최신 프론트엔드 UI 컴포넌트 업데이트를 전달해드립니다.</p>
      </div>
      <div className="space-y-3">
        <Input
          type="email"
          placeholder="example@aimaster.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
            setSubmitted(false);
          }}
          error={error}
        />
        <Button onClick={handleSubmit} className="w-full">
          무료 구독 신청
        </Button>
      </div>
      {submitted && <Alert variant="success" message={`"${email}" 계정으로 뉴스레터 구독이 성공적으로 완료되었습니다!`} />}
    </div>
  );
};

// 3. 탭 데모
const ProductPageDemo = () => {
  const productTabs = [
    {
      label: '상품 설명',
      icon: <Info className="w-4 h-4 mr-1.5" />,
      content: (
        <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>이 제품은 내구성과 기능성을 극대화하도록 정밀 설계된 고품질 제품입니다. 어떤 환경에도 조화롭게 어울리는 모던 미니멀리즘 디자인이 특징입니다.</p>
          <p>최고급 부품과 항공우주 알루미늄으로 제작되어 반영구적인 퍼포먼스를 보장합니다.</p>
        </div>
      ),
    },
    {
      label: '기술 사양',
      icon: <CheckCircle className="w-4 h-4 mr-1.5" />,
      content: (
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
          <li>외형 규격: 120mm × 65mm × 18mm</li>
          <li>본체 중량: 245g</li>
          <li>외장 소재: 아노다이즈드 알루미늄 합금</li>
          <li>충전 규격: USB Type-C 45W 고속 충전</li>
        </ul>
      ),
    },
    {
      label: '구매자 리뷰',
      icon: <Star className="w-4 h-4 mr-1.5" />,
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">김*우 (인증 구매자)</span>
              <span className="text-amber-500 text-xs">★★★★★</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">마감 퀄리티가 기대 이상입니다. 강력 추천합니다!</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">이*진 (인증 구매자)</span>
              <span className="text-amber-500 text-xs">★★★★☆</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">배송 빠르고 디자인이 너무 깔끔하네요.</p>
          </div>
        </div>
      ),
    },
  ];
  return <Tabs items={productTabs} />;
};

// 4. 선택 컨트롤 데모
const ControlsDemo = () => {
  const selectOptions = [
    { label: "한국어 (KO)", value: "ko" },
    { label: "English (EN)", value: "en" },
    { label: "日本語 (JA)", value: "ja" },
  ];
  const radioOptions = [
    { label: "라이트 모드 (화이트 기본)", value: "light" },
    { label: "다크 모드 (고대비)", value: "dark" },
    { label: "시스템 설정 동기화", value: "system" },
  ];
  const [lang, setLang] = useState("ko");
  const [theme, setTheme] = useState("system");
  const [push, setPush] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <div className="space-y-6 divide-y divide-slate-100">
      <div className="pt-2 first:pt-0">
        <h4 className="text-sm font-bold text-slate-900 mb-1">시스템 기본 언어</h4>
        <p className="text-xs text-slate-500 mb-3">화면에 표시할 기본 언어를 지정합니다.</p>
        <Select options={selectOptions} value={lang} onChange={(e) => setLang(e.target.value)} />
      </div>
      <div className="pt-6">
        <h4 className="text-sm font-bold text-slate-900 mb-1">인터페이스 테마</h4>
        <p className="text-xs text-slate-500 mb-3">선호하는 디스플레이 색상 모드를 선택하세요.</p>
        <RadioGroup name="theme_demo" options={radioOptions} selectedValue={theme} onChange={setTheme} />
      </div>
      <div className="pt-6 space-y-4">
        <h4 className="text-sm font-bold text-slate-900">알림 환경 설정</h4>
        <Toggle label="실시간 푸시 알림 수신" enabled={push} onChange={setPush} />
        <Checkbox label="신규 기능 및 마케팅 혜택 알림에 동의합니다." checked={marketing} onChange={setMarketing} />
      </div>
    </div>
  );
};

// 5. 슬라이더 & 미디어 플레이어 데모
const SliderProgressDemo = () => {
  const [progress, setProgress] = useState(45);
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-blue-400">NOW PLAYING</p>
            <h4 className="text-sm font-bold mt-0.5">AIMaster Lo-Fi Chill Beats</h4>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded-md text-slate-300">
            {Math.floor(progress * 1.8)}s / 180s
          </span>
        </div>
        <ProgressBar progress={progress} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-slate-600">
          <span>타임라인 탐색</span>
          <span>{progress}%</span>
        </div>
        <Slider value={progress} onChange={setProgress} />
      </div>
    </div>
  );
};

// 6. 알림 데모
const FileUploadDemo = () => {
  const [alert, setAlert] = useState<{ variant: 'success' | 'warning' | 'danger'; message: string } | null>(null);

  const handleUpload = (type: 'success' | 'warning' | 'danger') => {
    let message = '';
    if (type === 'success') message = "'presentation_draft_2026.pptx' 파일이 정상적으로 업로드되었습니다.";
    if (type === 'warning') message = "파일 용량이 15MB를 초과하여 전송이 다소 지연될 수 있습니다.";
    if (type === 'danger') message = "업로드 실패: 손상되었거나 지원하지 않는 파일 확장자입니다.";

    setAlert({ variant: type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">버튼을 클릭하여 다양한 상황의 피드백 알림 배너를 시뮬레이션해보세요.</p>
      <div className="flex flex-wrap gap-2.5">
        <Button onClick={() => handleUpload('success')}>성공 시뮬레이션</Button>
        <Button variant="secondary" onClick={() => handleUpload('warning')}>경고 시뮬레이션</Button>
        <Button variant="danger" onClick={() => handleUpload('danger')}>실패 시뮬레이션</Button>
      </div>
      {alert && <div className="mt-4 animate-fadeIn"><Alert variant={alert.variant} message={alert.message} /></div>}
    </div>
  );
};

// 7. 로더 데모
const DataFetchingDemo = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userData, setUserData] = useState<{ name: string; email: string; role: string } | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    setUserData(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 15;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setUserData({ name: '홍길동', email: 'buylifemall@naver.com', role: '일반 회원 (Free Tier)' });
      setIsLoading(false);
    }, 1800);
  };

  return (
    <div className="space-y-4">
      <Button onClick={fetchData} disabled={isLoading}>
        {isLoading ? '데이터 패칭 중...' : '원격 서버 사용자 데이터 조회'}
      </Button>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-600">데이터베이스에서 레코드를 가져오는 중...</p>
          <div className="w-64">
            <ProgressBar progress={progress} />
          </div>
        </div>
      )}

      {userData && !isLoading && (
        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-1.5 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-sm mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            조회 성공: 사용자 프로필
          </div>
          <p><strong className="text-slate-700">이름:</strong> {userData.name}</p>
          <p><strong className="text-slate-700">이메일:</strong> {userData.email}</p>
          <p><strong className="text-slate-700">권한 등급:</strong> {userData.role}</p>
        </div>
      )}
    </div>
  );
};

// 8. 툴팁 데모
const ToolbarDemo = () => {
  return (
    <div className="flex justify-center items-center h-28 p-4 border rounded-xl border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
        <Tooltip text="문서 로컬 저장 (Ctrl+S)">
          <Button variant="ghost" className="!p-2 text-lg">💾</Button>
        </Tooltip>
        <Tooltip text="외부 클라우드 공유">
          <Button variant="ghost" className="!p-2 text-lg">📤</Button>
        </Tooltip>
        <div className="w-px h-5 bg-slate-200 mx-1"></div>
        <Tooltip text="인쇄 및 PDF 내보내기">
          <Button variant="ghost" className="!p-2 text-lg">🖨️</Button>
        </Tooltip>
        <Tooltip text="프로그램 상세 정보">
          <Button variant="ghost" className="!p-2 text-lg">ℹ️</Button>
        </Tooltip>
      </div>
    </div>
  );
};

// 9. 모달 데모
const ModalPopupDemo = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenPopup = () => {
    const popupWindow = window.open('', '_blank', 'width=450,height=300');
    if (popupWindow) {
      popupWindow.document.write(`
        <html>
          <head><title>브라우저 팝업</title></head>
          <body style="font-family:sans-serif;padding:24px;text-align:center;background:#f8fafc;">
            <h3 style="color:#0f172a;">전통적인 브라우저 팝업(Pop-up)</h3>
            <p style="color:#475569;font-size:13px;line-height:1.6;">이 창은 메인 브라우저 창과 별개로 생성된 네이티브 윈도우 창입니다.<br/>대부분의 현대 브라우저에서 팝업 차단 필터가 적용됩니다.</p>
            <button onclick="window.close()" style="background:#2563eb;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">창 닫기</button>
          </body>
        </html>
      `);
      popupWindow.document.close();
    } else {
      alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">배경 상호작용을 막는 모달(Modal)과 별개 브라우저 창 팝업(Pop-up)의 차이를 체험해보세요.</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setIsOpen(true)}>인앱 모달 열기</Button>
        <Button variant="secondary" onClick={handleOpenPopup}>외부 브라우저 팝업 열기</Button>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="안전한 계정 초기화 확인">
        <div className="space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            모달 창이 활성화되어 있는 동안에는 뒤의 배경 페이지와 상호작용할 수 없으며, ESC 키 또는 바깥 영역 클릭으로 닫을 수 있습니다.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>취소</Button>
            <Button variant="danger" onClick={() => { setIsOpen(false); alert('모달 작업이 처리되었습니다.'); }}>실행 확인</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// 10. 팝오버 데모
const PopoverDemo = () => {
  return (
    <div className="flex justify-center items-center h-28">
      <Popover
        trigger={
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              홍
            </div>
            <span className="text-xs font-semibold text-slate-800">홍길동 님</span>
          </div>
        }
      >
        <div className="p-3 text-left">
          <p className="text-xs font-bold text-slate-900">홍길동 (buylife)</p>
          <p className="text-[11px] text-slate-500 mt-0.5">buylifemall@naver.com</p>
          <div className="my-2 border-t border-slate-100"></div>
          <Button variant="outline" className="w-full !py-1 text-xs" onClick={() => alert('프로필 메뉴 클릭')}>
            마이페이지 이동
          </Button>
        </div>
      </Popover>
    </div>
  );
};

export const DemoModal: React.FC<DemoModalProps> = ({ demoId, onClose }) => {
  if (!demoId) return null;

  const demoTitles: Record<string, { title: string; component: React.ReactNode }> = {
    buttons: { title: "버튼 인터랙션: 미니 어드벤처 시뮬레이터", component: <ButtonDemo /> },
    inputs: { title: "입력 필드 인터랙션: 뉴스레터 실시간 유효성 검사", component: <InputDemo /> },
    tabs: { title: "탭 인터랙션: 전자상거래 제품 상세 장표", component: <ProductPageDemo /> },
    controls: { title: "선택 컨트롤: 다국어 및 테마 설정 대시보드", component: <ControlsDemo /> },
    slider_progress: { title: "슬라이더 & 진행바: 미디어 플레이어 동기화", component: <SliderProgressDemo /> },
    alerts: { title: "피드백 알림: 파일 업로드 결과 시뮬레이터", component: <FileUploadDemo /> },
    loaders: { title: "비동기 로더: 원격 데이터 패칭 및 프로필 로드", component: <DataFetchingDemo /> },
    tooltip: { title: "툴팁 인터랙션: 생산성 에디터 툴바 단축키 안내", component: <ToolbarDemo /> },
    modal_popup: { title: "모달 vs 브라우저 팝업 비교 체험", component: <ModalPopupDemo /> },
    popover: { title: "팝오버 인터랙션: 사용자 아바타 퀵 프로필 메뉴", component: <PopoverDemo /> },
  };

  const current = demoTitles[demoId] || { title: "인터랙티브 데모", component: null };

  return (
    <Modal isOpen={!!demoId} onClose={onClose} title={current.title}>
      <div className="py-2">
        {current.component}
      </div>
    </Modal>
  );
};
