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
import { Popover } from '../ui/Popover';
import { 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Heart, 
  Star, 
  Sun 
} from '../ui/Icons';

interface ShowcaseGridProps {
  onLaunchDemo: (demoId: string) => void;
  onViewCode: (componentId: string) => void;
}

export const ShowcaseGrid: React.FC<ShowcaseGridProps> = ({ onLaunchDemo, onViewCode }) => {
  const [sliderValue, setSliderValue] = useState(50);
  const [selectedRadio, setSelectedRadio] = useState('option2');
  const [isChecked, setIsChecked] = useState(false);
  const [isToggled, setIsToggled] = useState(true);
  const [textValue, setTextValue] = useState('');

  const radioOptions = [
    { label: '옵션 1 (기본)', value: 'option1' },
    { label: '옵션 2 (선택됨)', value: 'option2' },
    { label: '비활성화된 옵션', value: 'option3', disabled: true },
  ];

  const selectOptions = [
    { label: '옵션 A (기본 선택)', value: 'a' },
    { label: '옵션 B (추가 데이터)', value: 'b' },
    { label: '옵션 C (고급 설정)', value: 'c' },
  ];

  const tabItems = [
    {
      label: '프로필',
      icon: <Info className="w-4 h-4 mr-1.5" />,
      content: <p className="text-xs text-slate-600 leading-relaxed">사용자 기본 정보, 계정 설정 및 연결된 플랫폼 상태를 확인합니다.</p>,
    },
    {
      label: '대시보드',
      icon: <CheckCircle className="w-4 h-4 mr-1.5" />,
      content: <p className="text-xs text-slate-600 leading-relaxed">최근 활동 지표, 주요 통계 및 생성된 컴포넌트 이력을 개요로 보여줍니다.</p>,
    },
    {
      label: '설정',
      icon: <AlertTriangle className="w-4 h-4 mr-1.5" />,
      content: <p className="text-xs text-slate-600 leading-relaxed">API 연동 키 관리, 보안 환경설정 및 알림 수신 정책을 제어합니다.</p>,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 1. 버튼 */}
      <Card 
        title="버튼 (Buttons)" 
        onLaunch={() => onLaunchDemo('buttons')}
        onViewCode={() => onViewCode('button')}
      >
        <p className="text-xs text-slate-500 mb-4">다양한 스타일과 상태(기본, 보조, 외곽선, 위험, 비활성화)를 가진 요소입니다.</p>
        <div className="flex flex-wrap gap-2.5 items-center">
          <Button>기본</Button>
          <Button variant="secondary">보조</Button>
          <Button variant="outline">외곽선</Button>
          <Button variant="danger">위험</Button>
          <Button disabled>비활성화</Button>
          <Button>
            <Heart className="w-4 h-4 mr-1.5 text-rose-400" />
            아이콘 결합
          </Button>
        </div>
      </Card>

      {/* 2. 입력 필드 */}
      <Card 
        title="입력 필드 (Inputs)" 
        onLaunch={() => onLaunchDemo('inputs')}
        onViewCode={() => onViewCode('input')}
      >
        <p className="text-xs text-slate-500 mb-4">텍스트 입력을 처리하며, 실시간 유효성 에러 메시지 상태를 포함합니다.</p>
        <div className="space-y-3">
          <Input placeholder="일반 텍스트 입력" value={textValue} onChange={(e) => setTextValue(e.target.value)} />
          <Input placeholder="비활성화된 입력 필드" disabled />
          <Input placeholder="유효성 에러 상태" error="필수 입력 항목입니다." />
        </div>
      </Card>

      {/* 3. 탭 */}
      <Card 
        title="탭 (Tabs)" 
        onLaunch={() => onLaunchDemo('tabs')}
        onViewCode={() => onViewCode('tabs')}
      >
        <p className="text-xs text-slate-500 mb-4">콘텐츠를 여러 섹션으로 나누어 사용자가 직관적으로 탐색하게 돕습니다.</p>
        <Tabs items={tabItems} />
      </Card>

      {/* 4. 드롭다운 선택 */}
      <Card 
        title="선택 / 드롭다운 (Select)" 
        onLaunch={() => onLaunchDemo('controls')}
        onViewCode={() => onViewCode('select')}
      >
        <p className="text-xs text-slate-500 mb-4">여러 옵션 중 하나를 손쉽게 선택할 수 있는 드롭다운 목록입니다.</p>
        <div className="pt-2">
          <Select options={selectOptions} />
        </div>
      </Card>

      {/* 5. 라디오 버튼 */}
      <Card 
        title="라디오 버튼 (Radio Buttons)" 
        onLaunch={() => onLaunchDemo('controls')}
        onViewCode={() => onViewCode('radio')}
      >
        <p className="text-xs text-slate-500 mb-4">상호 배타적인 여러 선택지 중 단 하나를 선택해야 할 때 사용됩니다.</p>
        <RadioGroup
          name="showcase_radio"
          options={radioOptions}
          selectedValue={selectedRadio}
          onChange={setSelectedRadio}
        />
      </Card>

      {/* 6. 체크박스 & 토글 */}
      <Card 
        title="체크박스 & 토글 (Checkbox & Toggle)" 
        onLaunch={() => onLaunchDemo('controls')}
        onViewCode={() => onViewCode('checkbox')}
      >
        <p className="text-xs text-slate-500 mb-4">다중 선택이나 특정 시스템 기능의 활성/비활성 스위치에 사용됩니다.</p>
        <div className="space-y-4 pt-1">
          <Checkbox label="이용약관 및 개인정보처리방침에 동의합니다" checked={isChecked} onChange={setIsChecked} />
          <div className="pt-2 border-t border-slate-100">
            <Toggle label="실시간 푸시 알림 수신 상태" enabled={isToggled} onChange={setIsToggled} />
          </div>
        </div>
      </Card>

      {/* 7. 슬라이더 */}
      <Card 
        title="슬라이더 (Slider)" 
        onLaunch={() => onLaunchDemo('slider_progress')}
        onViewCode={() => onViewCode('slider')}
      >
        <p className="text-xs text-slate-500 mb-4">정해진 수치 범위(0~100) 내에서 연속적인 값을 조절하는 컨트롤입니다.</p>
        <div className="space-y-3 pt-2">
          <Slider value={sliderValue} onChange={setSliderValue} />
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>설정 값:</span>
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{sliderValue}</span>
          </div>
        </div>
      </Card>

      {/* 8. 피드백 알림 */}
      <Card 
        title="알림 (Alerts)" 
        onLaunch={() => onLaunchDemo('alerts')}
        onViewCode={() => onViewCode('alert')}
      >
        <p className="text-xs text-slate-500 mb-3">정보, 성공, 주의 경고, 오류 상태를 시각적으로 안내하는 피드백 박스입니다.</p>
        <div className="space-y-2">
          <Alert variant="info" message="안내: 정기 시스템 점검이 예정되어 있습니다." />
          <Alert variant="success" message="완료: 설정이 성공적으로 저장되었습니다." />
          <Alert variant="warning" message="주의: API 키 만료일이 3일 남았습니다." />
          <Alert variant="danger" message="오류: 네트워크 연결 상태를 확인해주세요." />
        </div>
      </Card>

      {/* 9. 로더 & 진행률 */}
      <Card 
        title="로더 & 진행률 (Loaders & Progress)" 
        onLaunch={() => onLaunchDemo('loaders')}
        onViewCode={() => onViewCode('slider')}
      >
        <p className="text-xs text-slate-500 mb-4">데이터를 불러오거나 백그라운드 작업이 진행 중임을 보여줍니다.</p>
        <div className="flex flex-col items-center space-y-4 pt-2">
          <Spinner />
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>다운로드 진행률</span>
              <span className="font-semibold text-slate-700">{sliderValue}%</span>
            </div>
            <ProgressBar progress={sliderValue} />
          </div>
        </div>
      </Card>

      {/* 10. 툴팁 */}
      <Card 
        title="툴팁 (Tooltip)" 
        onLaunch={() => onLaunchDemo('tooltip')}
        onViewCode={() => onViewCode('tooltip')}
      >
        <p className="text-xs text-slate-500 mb-4">요소에 마우스를 올렸을 때 추가 설명이나 단축키를 안내하는 말풍선입니다.</p>
        <div className="flex justify-center items-center h-24">
          <Tooltip text="툴팁 설명이 표시됩니다! (Ctrl+P)">
            <Button variant="outline">여기에 마우스를 올려보세요</Button>
          </Tooltip>
        </div>
      </Card>

      {/* 11. 모달 vs 팝업 */}
      <Card 
        title="모달 vs 팝업 (Modal vs Pop-up)" 
        onLaunch={() => onLaunchDemo('modal_popup')}
        onViewCode={() => onViewCode('modal')}
      >
        <p className="text-xs text-slate-500 mb-4">배경 상호작용을 차단하는 모달과, 별개의 브라우저 팝업 창의 차이입니다.</p>
        <div className="flex flex-wrap justify-center items-center h-24 gap-2.5">
          <Button onClick={() => onLaunchDemo('modal_popup')}>모달 데모 열기</Button>
          <Button variant="secondary" onClick={() => onLaunchDemo('modal_popup')}>비교 확인하기</Button>
        </div>
      </Card>

      {/* 12. 팝오버 */}
      <Card 
        title="팝오버 (Popover)" 
        onLaunch={() => onLaunchDemo('popover')}
        onViewCode={() => onViewCode('modal')}
      >
        <p className="text-xs text-slate-500 mb-4">특정 요소에 부착되어 추가 정보나 미니 메뉴를 제공하며 외부 클릭 시 닫힙니다.</p>
        <div className="flex justify-center items-center h-24">
          <Popover
            trigger={<Button variant="outline">팝오버 미니 메뉴 열기</Button>}
          >
            <div className="p-3 text-left">
              <h4 className="font-bold text-xs text-slate-900">컴포넌트 팝오버</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                컨텍스트 메뉴, 프로필 메뉴, 필터 팝업 등 다양한 용도로 활용됩니다.
              </p>
            </div>
          </Popover>
        </div>
      </Card>

      {/* 13. 아이콘 시스템 */}
      <div className="lg:col-span-3 md:col-span-2">
        <Card title="아이콘 시스템 (Iconography)">
          <p className="text-xs text-slate-500 mb-4">의미를 시각적으로 직관적이게 전달하는 순수 SVG 벡터 아이콘 모음입니다.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1.5 hover:bg-slate-100 transition-colors">
              <Info className="w-6 h-6 text-blue-500" />
              <span className="text-xs font-medium text-slate-600">Info</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1.5 hover:bg-slate-100 transition-colors">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <span className="text-xs font-medium text-slate-600">Check</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1.5 hover:bg-slate-100 transition-colors">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <span className="text-xs font-medium text-slate-600">Warning</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1.5 hover:bg-slate-100 transition-colors">
              <XCircle className="w-6 h-6 text-rose-500" />
              <span className="text-xs font-medium text-slate-600">Error</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1.5 hover:bg-slate-100 transition-colors">
              <Heart className="w-6 h-6 text-pink-500" />
              <span className="text-xs font-medium text-slate-600">Heart</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1.5 hover:bg-slate-100 transition-colors">
              <Star className="w-6 h-6 text-amber-400" />
              <span className="text-xs font-medium text-slate-600">Star</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-1.5 hover:bg-slate-100 transition-colors">
              <Sun className="w-6 h-6 text-orange-500" />
              <span className="text-xs font-medium text-slate-600">Sun</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
