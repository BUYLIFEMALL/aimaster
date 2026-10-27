'use client';
import { useEffect, useRef, useState } from 'react';
import { readCandidateJson, readCandidateText, mergeCandidatePosts, type CandidatePostInput } from '../../lib/analysis/candidateFiles';

export function CandidateFileImport({ posts, disabled, onApply, templateHref = '/downloads/candidate-posts-template.json' }: { posts: CandidatePostInput[]; disabled: boolean; onApply: (posts: CandidatePostInput[]) => void; templateHref?: string }) {
  const [preview, setPreview] = useState<{ name: string; posts: CandidatePostInput[] } | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append'), [replaceConfirmedFor, setReplaceConfirmedFor] = useState(''), [checked, setChecked] = useState(false);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  const count = new Set(preview?.posts.map(post => new URL(post.url).pathname.split('/')[1]) || []).size;
  const currentInputKey = JSON.stringify(posts), replaceConfirmed = replaceConfirmedFor === currentInputKey;
  return <section className="candidate-files" aria-labelledby="candidate-file-heading"><h3 id="candidate-file-heading">사용 권한이 있는 본문 가져오기</h3><p>글 한 개는 아래 본문 칸에서 TXT·MD 파일로 가져오고, 여러 글은 JSON 양식을 사용할 수 있습니다. 파일 선택만으로 서버나 AI에 전송하지 않습니다.</p>
    <a download href={templateHref}>여러 글 입력 양식 받기 ↗</a>
    <label className="field">여러 글 JSON 파일 · UTF-8, 최대 192KiB<input type="file" accept=".json,application/json" disabled={disabled} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      const current = ++sequence.current; setPreview(null); setChecked(false); setReplaceConfirmedFor(''); setMessage('');
      if (!file) { setBusy(false); return; } setBusy(true);
      try { const imported = await readCandidateJson(file); if (current === sequence.current) setPreview({ name: file.name, posts: imported }); }
      catch (error) { if (current === sequence.current) setMessage(error instanceof Error ? error.message : '파일을 읽지 못했습니다.'); }
      finally { if (current === sequence.current) setBusy(false); }
    }} /></label>
    {busy && <p role="status">내 기기에서 파일을 읽고 있습니다…</p>}
    {preview && <div className="file-preview"><strong>{preview.name} · {preview.posts.length}개 글 / {count}개 블로그</strong><small>평가에는 블로그당 3~5개 글이 필요합니다. 가져온 뒤에도 수정할 수 있습니다.</small><div className="file-preview-list">{preview.posts.map(post => <details key={post.url}><summary>{post.title} · {post.body.length.toLocaleString()}자</summary><p>{post.url}</p><pre>{post.body}</pre></details>)}</div>
      <label className="field">현재 입력에 적용할 방식<select disabled={disabled || busy} value={mode} onChange={event => { setMode(event.target.value as 'append' | 'replace'); setReplaceConfirmedFor(''); }}><option value="append">기존 입력을 유지하고 추가</option><option value="replace">현재 입력을 파일 내용으로 교체</option></select></label>
      {mode === 'replace' && <label className="check"><input type="checkbox" disabled={disabled || busy} checked={replaceConfirmed} onChange={event => setReplaceConfirmedFor(event.target.checked ? currentInputKey : '')} />현재 작성 중인 후보 입력을 파일 내용으로 바꾸겠습니다. 이전 분석 기록은 삭제하지 않습니다.</label>}
      <label className="check"><input type="checkbox" disabled={disabled || busy} checked={checked} onChange={event => setChecked(event.target.checked)} />파일의 글 주소·제목·실제 본문을 확인했습니다.</label>
      <button disabled={disabled || busy || !checked || (mode === 'replace' && !replaceConfirmed)} onClick={() => {
        if (disabled || busy || !checked || (mode === 'replace' && !replaceConfirmed)) return;
        try { const merged = mergeCandidatePosts(posts, preview.posts, mode); onApply(merged.posts); setPreview(null); setChecked(false); setMessage(`${merged.added}개 글을 입력에 반영했습니다. 동일한 글 ${merged.skipped}개는 추가하지 않았습니다. 새 글의 사용 권한과 AI 전송 동의는 다시 확인해 주세요.`); }
        catch (error) { setMessage(error instanceof Error ? error.message : '입력에 반영하지 못했습니다.'); }
      }}>확인한 본문을 입력에 반영</button><button disabled={disabled || busy} onClick={() => { sequence.current++; setPreview(null); setChecked(false); setMessage('가져오기를 취소했습니다. 기존 입력은 유지됩니다.'); }}>가져오기 취소</button>
    </div>}<div role="status">{message}</div>
  </section>;
}

export function CandidateBodyFile({ contextKey, disabled, onApply }: { contextKey: string; disabled: boolean; onApply: (body: string) => void }) {
  const [preview, setPreview] = useState<{ context: string; name: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const sequence = useRef(0), latestContext = useRef(contextKey);
  useEffect(() => { latestContext.current = contextKey; }, [contextKey]);
  useEffect(() => () => { sequence.current++; }, []);
  const stale = preview && preview.context !== contextKey;
  return <div className="body-file"><label className="field">실제 본문 파일 · UTF-8 TXT/MD<input type="file" accept=".txt,.md,text/plain,text/markdown" disabled={disabled} onChange={async event => {
    const file = event.target.files?.[0]; event.target.value = ''; const current = ++sequence.current, context = contextKey;
    setPreview(null); setMessage(''); if (!file) { setBusy(false); return; } setBusy(true);
    try { const body = await readCandidateText(file); if (current === sequence.current) { if (latestContext.current !== context) setMessage('읽는 동안 글 입력이 바뀌었습니다. 해당 글의 파일을 다시 선택해 주세요.'); else setPreview({ context, name: file.name, body }); } }
    catch (error) { if (current === sequence.current) setMessage(error instanceof Error ? error.message : '파일을 읽지 못했습니다.'); }
    finally { if (current === sequence.current) setBusy(false); }
  }} /></label>{busy && <small role="status">본문을 읽고 있습니다…</small>}
    {preview && <details open><summary>{preview.name} · {preview.body.length.toLocaleString()}자 미리보기</summary><pre>{preview.body}</pre>{stale && <p>글 입력이 바뀌었습니다. 파일을 다시 선택해 주세요.</p>}<button disabled={disabled || busy || !!stale} onClick={() => { if (preview.context !== latestContext.current) return; onApply(preview.body); setPreview(null); setMessage('본문을 입력했습니다. 이 글의 사용 권한과 외부 AI 전송 동의를 다시 확인해 주세요.'); }}>확인한 본문 사용</button><button disabled={disabled || busy} onClick={() => { sequence.current++; setPreview(null); setMessage('파일 본문을 사용하지 않았습니다.'); }}>취소</button></details>}<div role="status">{message}</div>
  </div>;
}
