'use client';
// 작업 화면용: 설정의 기본 모델을 그대로 쓰고, 이 작업만 바꾸고 싶을 때만 「고급」을 펼친다.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ModelPicker } from './ModelPicker';
import { useDefaultModel } from '../../lib/analysis/defaultModel';
import { ANALYSIS_PROVIDERS, type AnalysisModelSelection } from '../../lib/analysis/modelSelection';

type Props = { value: AnalysisModelSelection; onChange: (selection: AnalysisModelSelection) => void; disabled?: boolean; label?: string };

export function TaskModelPicker({ value, onChange, disabled = false, label }: Props) {
  const defaultModel = useDefaultModel();
  const [custom, setCustom] = useState(false);
  useEffect(() => {
    if (!custom && (defaultModel.provider !== value.provider || defaultModel.model !== value.model)) onChange(defaultModel);
    // onChange는 화면마다 새로 만들어지므로 기본값·직접 변경 여부가 바뀔 때만 맞춘다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultModel, custom]);
  const provider = ANALYSIS_PROVIDERS.find(option => option.value === value.provider)?.label ?? value.provider;
  return <div className="task-model">
    <p>사용할 AI: <strong>{provider} · {value.model}</strong> {custom ? '(이 작업만 바꿈)' : '(설정의 기본 모델)'} · <Link href="/settings">설정에서 바꾸기</Link></p>
    <details>
      <summary>고급: 이 작업만 다른 모델 쓰기</summary>
      <ModelPicker value={value} disabled={disabled} label={label} onChange={next => { setCustom(true); onChange(next); }} />
      {custom && <button type="button" disabled={disabled} onClick={() => { setCustom(false); onChange(defaultModel); }}>기본 모델로 되돌리기</button>}
    </details>
  </div>;
}
