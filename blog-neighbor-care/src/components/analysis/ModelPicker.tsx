'use client';

import { useId } from 'react';
import {
  ANALYSIS_PROVIDERS, analysisModels, isAnalysisProvider, isAnalysisSelection,
  selectionForProvider, type AnalysisModelSelection,
} from '../../lib/analysis/modelSelection';

type Props = {
  value: AnalysisModelSelection;
  onChange: (selection: AnalysisModelSelection) => void;
  disabled?: boolean;
  label?: string;
};

/** Controlled input only: no AI calls, credentials, persistence, or provider fallback. */
export function ModelPicker({ value, onChange, disabled = false, label = '분석' }: Props) {
  const id = useId();
  const valid = isAnalysisSelection(value);
  return (
    <fieldset className="analysis-model-picker" disabled={disabled}>
      <legend>{label}에 사용할 AI</legend>
      <label htmlFor={`${id}-provider`}>AI 플랫폼</label>
      <select id={`${id}-provider`} value={value.provider} onChange={event => {
        if (isAnalysisProvider(event.target.value)) onChange(selectionForProvider(event.target.value));
      }}>
        {ANALYSIS_PROVIDERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <label htmlFor={`${id}-model`}>사용할 모델</label>
      <select id={`${id}-model`} value={valid ? value.model : ''} aria-invalid={!valid} onChange={event => {
        const next = { provider: value.provider, model: event.target.value };
        if (isAnalysisSelection(next)) onChange(next);
      }}>
        {!valid && <option value="" disabled>모델을 다시 선택해 주세요.</option>}
        {analysisModels(value.provider).map(option => <option key={option.value} value={option.value}>{option.value}</option>)}
      </select>
      <small>선택한 플랫폼에 등록한 회원 본인 키만 사용합니다. 모델을 바꿔도 자동으로 분석하지 않습니다.</small>
    </fieldset>
  );
}
