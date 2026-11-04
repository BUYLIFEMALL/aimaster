'use client';
// v1.16 「모델은 설정 한 곳」: 여기서 고른 AI를 분석·새 글 확인·문장 만들기가 함께 쓴다(작업별 변경은 각 화면의 「고급」).
import { ModelPicker } from './ModelPicker';
import { saveDefaultModel, useDefaultModel } from '../../lib/analysis/defaultModel';

export function DefaultModelSettings() {
  const model = useDefaultModel();
  return <section className="panel" id="model"><h2>AI 모델 (모든 작업 공통)</h2>
    <p>여기서 고른 AI를 프로필 분석·후보 평가·새 글 확인·문장 만들기에서 함께 씁니다. 바꾸면 바로 저장되며 AI를 호출하지 않습니다.</p>
    <ModelPicker value={model} onChange={saveDefaultModel} label="모든 작업" />
    <p>이 브라우저에 기억합니다. 다른 PC·브라우저에서는 한 번 다시 고르세요.</p>
    <a className="primary" href="https://www.buylife.xyz/api-settings" target="_blank" rel="noopener noreferrer">회원 API 키 등록 ↗</a>
    <small>고른 플랫폼에 회원 본인이 등록한 키만 씁니다. 키 값은 이 화면에 가져오지 않습니다.</small>
  </section>;
}
