"use client";

// StudioPage에서 옮긴 「title」 화면 (2026-10-17 파일 나누기, 화면·동작 변경 없음)
import { SEO_PERSONAS } from "@/lib/ai/personas";
import { GEMINI_IMAGE_MODELS, type GeminiImageModel } from "@/lib/ai/geminiModels";
import { getContentModels, getDefaultContentModel, type ContentProvider } from "@/lib/ai/contentModels";
import { openAIModelNotice, openAIModelTier } from "@/lib/ai/openaiRequestParams";
import { strategies } from "./shared";
import type { Studio } from "./useStudio";

export function TitleView({ s }: { s: Studio }) {
  const { strategy, setStrategy, topic, setTopic, keywords, setKeywords, pending, titlePending, recommendedTitles, setRecommendedTitles, titleRecommendationId, setTitleRecommendationId, titleRecommendations, selectedTitle, setSelectedTitle, personaId, setPersonaId, customPersona, setCustomPersona, generateImageWithDraft, setGenerateImageWithDraft, imageModel, setImageModel, contentProvider, setContentProvider, contentModel, setContentModel, contentImageCount, setContentImageCount, editingTitleIndex, setEditingTitleIndex, titleEditValue, setTitleEditValue, imagePending, loadTitleRecommendation, deleteTitleRecommendation, startTitleEdit, selectRecommendedTitle, saveTitleEdit, deleteRecommendedTitle, recommendTitles, createDraftFromSelectedTitle, selectedContentModelLabel, experienceNote, setExperienceNote, experienceQuestions, experienceQuestionPending, experienceQuestionMessage, requestExperienceQuestions, appendExperienceQuestion, naturalStyle, setNaturalStyle, includeFaq, setIncludeFaq } = s;
  return (
    <section className="title-recommendation" id="title">
          <section className="card title-input-section">
          <div className="card-head"><h2 className="card-title">제목 추천</h2><span className="card-caption">1 / 2 단계 · 검색 의도 기반</span></div>
          <p className="section-description">글의 주제와 핵심 키워드를 입력하면 AI가 제목을 제안합니다. 제목은 수정하거나 삭제할 수 있고, 하나를 선택해야 다음 단계로 이동할 수 있습니다.</p>
          <div className="field"><label htmlFor="topic">무슨 글을 쓰고 싶으신가요?</label><textarea id="topic" value={topic} onChange={(e) => { setTopic(e.target.value); setSelectedTitle(""); setRecommendedTitles([]); setTitleRecommendationId(null); }} placeholder="예: 서울 근교 당일치기 여행 코스 추천" /></div>
          <div className="field"><label htmlFor="keywords">핵심 키워드</label><input id="keywords" value={keywords} onChange={(e) => { setKeywords(e.target.value); setSelectedTitle(""); setRecommendedTitles([]); setTitleRecommendationId(null); }} placeholder="쉼표로 구분해 입력하세요" /></div>
          <p className="freshness-note">연도·통계·정책처럼 최신성 확인이 필요한 정보는 근거 없이 넣지 않습니다. 연도가 꼭 필요하면 주제 또는 키워드에 직접 입력하세요.</p>
          <button type="button" className="secondary" onClick={recommendTitles} disabled={titlePending}>{titlePending ? "추천 중..." : "AI 제목 추천 생성"}</button>
          </section>
          {titleRecommendations.length > 0 && <section className="saved-title-recommendations card"><div><strong>저장된 제목 추천 기록</strong><span>{titleRecommendations.length}건 · 30일 보관</span></div><div className="saved-title-recommendation-list">{titleRecommendations.map((recommendation) => <div key={recommendation.id} className={recommendation.id === titleRecommendationId ? "saved-title-recommendation selected" : "saved-title-recommendation"}><button type="button" onClick={() => loadTitleRecommendation(recommendation)}><strong>{recommendation.topic}</strong><small>{recommendation.selected_title || `${recommendation.titles.length}개 제목 저장됨`}</small></button><button type="button" className="text-button danger saved-title-delete" onClick={() => void deleteTitleRecommendation(recommendation)}>삭제</button></div>)}</div></section>}
{recommendedTitles.length > 0 && <><section className="title-management card"><div className="title-management-head"><div><h3>생성된 제목 리스트</h3><p>{recommendedTitles.length}개 중 새 글에 사용할 제목을 하나 선택하세요.</p></div><span>{selectedTitle ? "제목 선택됨" : "제목을 선택해주세요"}</span></div><div className="title-list">{recommendedTitles.map((item, index) => <div key={`${item.title}-${index}`} className={`title-option ${selectedTitle === item.title ? "selected" : ""}`}>{editingTitleIndex === index ? <div className="title-edit-row"><input value={titleEditValue} onChange={(event) => setTitleEditValue(event.target.value)} aria-label="제목 수정" autoFocus /><button type="button" className="secondary compact" onClick={() => saveTitleEdit(index)}>저장</button><button type="button" className="text-button" onClick={() => setEditingTitleIndex(null)}>취소</button></div> : <><button type="button" className="title-select" onClick={() => selectRecommendedTitle(item.title)}><strong>{item.title}</strong><small>{item.intent || "검색 의도에 맞춘 제목"}</small></button><div className="title-option-actions"><button type="button" className="text-button" onClick={() => startTitleEdit(index)}>수정</button><button type="button" className="text-button danger" onClick={() => deleteRecommendedTitle(index)}>삭제</button></div></>}</div>)}</div></section><section className="title-strategy-section card">
  <div className="field">
    <label>글쓰기 전략</label>
    <div className="strategy-grid">
      {strategies.map(([name, desc]) => <button type="button" key={name} className={`strategy ${strategy === name ? "selected" : ""}`} onClick={() => setStrategy(name)}><strong>{name}</strong><span>{desc}</span></button>)}
    </div>
  </div>
  <div className="field">
    <label htmlFor="persona">글쓰기 페르소나 선택</label>
    <select id="persona" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>
      {SEO_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
      <option value="custom">✍️ 커스텀 페르소나 직접 입력</option>
    </select>
    <small>선택한 말투와 관점을 블로그(원문)에 반영합니다. 사실이 아닌 체험담은 만들지 않습니다.</small>
  </div>
  {personaId === "custom" && <div className="field">
    <label htmlFor="custom-persona">커스텀 페르소나</label>
    <input id="custom-persona" value={customPersona} maxLength={500} onChange={(event) => setCustomPersona(event.target.value)} placeholder="예: 30대 초보 창업자에게 차분하게 설명하는 실무 멘토" />
    <small>말투, 독자 대상, 설명 방식 등을 500자 이내로 입력하세요.</small>
  </div>}
  <section className="writing-options" aria-label="글쓰기 선택 사항">
    <div className="field">
      <label htmlFor="experience-note">내 실제 경험 (선택)</label>
      <textarea id="experience-note" value={experienceNote} maxLength={1500} onChange={(event) => setExperienceNote(event.target.value)} placeholder="예: 지난 토요일 오전 9시에 출발했는데 주차장이 10시쯤 꽉 찼어요. 아이랑 걷기엔 산책로가 2km 정도라 딱 좋았어요." />
      <small>직접 겪은 일만 적어 주세요. 적은 내용만 경험으로 본문에 녹이고, 없는 경험은 지어내지 않습니다. ({experienceNote.length.toLocaleString("ko-KR")} / 1,500자)</small>
      <div className="experience-question-row">
        <button type="button" className="secondary compact" onClick={() => void requestExperienceQuestions()} disabled={experienceQuestionPending}>{experienceQuestionPending ? "질문 만드는 중..." : "경험 떠올리기 질문 받기"}</button>
        <small>AI가 답을 쓰지 않고, 떠올리기 쉬운 질문 5개만 만듭니다. 질문을 누르면 메모에 추가됩니다.</small>
      </div>
      {experienceQuestionMessage && <p className="experience-question-error" role="status">{experienceQuestionMessage}</p>}
      {experienceQuestions.length > 0 && <div className="experience-question-list">{experienceQuestions.map((question) => <button type="button" key={question} className="experience-question" onClick={() => appendExperienceQuestion(question)}>+ {question}</button>)}</div>}
    </div>
    <label className="writing-option-check"><input type="checkbox" checked={naturalStyle} onChange={(event) => setNaturalStyle(event.target.checked)} /> <span><strong>자연스러운 문체로 다듬기</strong><small>문장 길이를 섞고 「결론적으로」 같은 상투 표현을 줄입니다. 읽기 좋은 글을 위한 옵션이며 AI 탐지 회피를 약속하지 않습니다.</small></span></label>
    <label className="writing-option-check"><input type="checkbox" checked={includeFaq || strategy === "AEO"} disabled={strategy === "AEO"} onChange={(event) => setIncludeFaq(event.target.checked)} /> <span><strong>글 끝에 자주 묻는 질문(FAQ) 넣기</strong><small>{strategy === "AEO" ? "AEO 전략은 FAQ가 항상 들어갑니다." : "독자가 물을 만한 질문 3~5개를 Q./A. 형식으로 덧붙입니다."}</small></span></label>
  </section>
  <section className="content-model-selection" aria-label="본문 생성 모델 선택">
    <div className="content-generation-models-heading">
      <strong>본문 생성모델 · {selectedContentModelLabel}</strong>
      <small>아래 생성 버튼을 누를 때 제목과 블로그(원문) 본문에 적용됩니다.</small>
    </div>
    <div className="content-generation-models">
      <div className="field">
        <label htmlFor="content-provider-selector">본문 생성 AI 모델</label>
        <select id="content-provider-selector" value={contentProvider} onChange={(event) => { const provider = event.target.value as ContentProvider; setContentProvider(provider); setContentModel(getDefaultContentModel(provider)); }} disabled={pending || imagePending}>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic Claude</option>
          <option value="gemini">Google Gemini</option>
        </select>
        <small>선택한 플랫폼에 등록한 본인 API 키만 사용합니다.</small>
      </div>
      <div className="field">
        <label htmlFor="content-model-selector">본문 생성 모델</label>
        <select id="content-model-selector" value={contentModel} onChange={(event) => setContentModel(event.target.value)} disabled={pending || imagePending}>
          {getContentModels(contentProvider).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <small>선택한 모델로 완성형 블로그(원문)을 생성합니다.</small>{openAIModelTier(contentModel) && <small className="model-tier">모델 성격: {openAIModelTier(contentModel)}</small>}{openAIModelNotice(contentModel) && <small className="model-notice">{openAIModelNotice(contentModel)}</small>}
      </div>
    </div>
  </section>
  <label className="image-with-draft-option">
    <input type="checkbox" checked={generateImageWithDraft} onChange={(event) => setGenerateImageWithDraft(event.target.checked)} />
    <span><strong>대표 이미지 생성 (나노바나나)</strong><small>선택한 제목을 바탕으로 블로그(원문)과 대표 이미지를 함께 생성합니다.</small></span>
    <span className="image-model-control"><b>생성 모델</b><select id="image-model" value={imageModel} onChange={(event) => setImageModel(event.target.value as GeminiImageModel)} disabled={pending || imagePending} aria-label="이미지 생성 모델">{GEMINI_IMAGE_MODELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></span>
  </label>
  <div className="field">
    <label htmlFor="content-image-count">생성할 이미지 수</label>
    <select id="content-image-count" value={contentImageCount} onChange={(event) => setContentImageCount(Number(event.target.value) as 2 | 3)}>
      <option value={2}>기본 3장 · 대표 1장 + 본문 2장</option>
      <option value={3}>4장 생성 · 대표 1장 + 본문 3장</option>
    </select>
    <small>본문의 서로 다른 핵심 문단에 맞춰 이미지를 생성합니다.</small>
  </div>
  <button type="button" className="primary" onClick={() => void createDraftFromSelectedTitle()} disabled={!selectedTitle || pending || imagePending || (personaId === "custom" && !customPersona.trim())}>{pending ? "AI 블로그(원문) 생성 중..." : imagePending ? "대표 이미지 생성 중..." : "선택한 제목과 전략으로 AI 블로그(원문) 생성하기"}</button>
</section></>}
        {false && <section className="legacy-content-model-selection card" aria-label="본문 생성 모델 선택">
          <div className="content-generation-models-heading">
            <strong>본문 생성모델 · {selectedContentModelLabel}</strong>
            <small>아래 생성 버튼을 누를 때 제목과 블로그(원문) 본문에 적용됩니다.</small>
          </div>
          <div className="content-generation-models">
            <div className="field"><label htmlFor="legacy-content-provider-selector">본문 생성 AI 모델</label><select id="legacy-content-provider-selector" value={contentProvider} onChange={(event) => { const provider = event.target.value as ContentProvider; setContentProvider(provider); setContentModel(getDefaultContentModel(provider)); }} disabled={pending || imagePending}><option value="openai">OpenAI</option><option value="anthropic">Anthropic Claude</option><option value="gemini">Google Gemini</option></select><small>선택한 플랫폼에 등록한 본인 API 키만 사용합니다.</small></div>
            <div className="field"><label htmlFor="legacy-content-model-selector">본문 생성 모델</label><select id="legacy-content-model-selector" value={contentModel} onChange={(event) => setContentModel(event.target.value)} disabled={pending || imagePending}>{getContentModels(contentProvider).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>선택한 모델로 완성형 블로그(원문)을 생성합니다.</small>{openAIModelTier(contentModel) && <small className="model-tier">모델 성격: {openAIModelTier(contentModel)}</small>}{openAIModelNotice(contentModel) && <small className="model-notice">{openAIModelNotice(contentModel)}</small>}</div>
          </div>
        </section>}</section>
  );
}
