"use client";

import React, { useEffect, useState } from 'react';
import { FolderPlus, Check } from 'lucide-react';

// AI가 만든 컴포넌트를 캔버스 프로젝트에 보관한다(2026-10-21 병합 D — 옛 AI 웹 UI는 저장 기능이 없었다).
// 저장한 코드는 편집기 [</> 코드] → 「저장한 AI 컴포넌트」에서 다시 본다.
interface ProjectRow { id: string; name: string }
const NEW = '__new__';

export const SaveToProject: React.FC<{ code: string; defaultTitle: string; prompt: string }> = ({ code, defaultTitle, prompt }) => {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [target, setTarget] = useState(NEW);
  const [title, setTitle] = useState(defaultTitle);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const list: ProjectRow[] = Array.isArray(d.projects) ? d.projects : [];
        setProjects(list);
        if (list.length) setTarget(list[0].id);
      })
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => { setDone(null); setTitle(defaultTitle); }, [code, defaultTitle]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      let id = target;
      let name = projects?.find((p) => p.id === target)?.name ?? '';
      if (target === NEW) {
        name = `AI 컴포넌트 — ${title || 'UI'}`.slice(0, 80);
        const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.project?.id) throw new Error(data.error || '새 프로젝트를 만들지 못했습니다.');
        id = data.project.id;
        setProjects((cur) => [{ id, name }, ...(cur ?? [])]);
        setTarget(id);
      }
      const res = await fetch(`/api/projects/${id}/snippets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || defaultTitle, prompt, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '저장하지 못했습니다.');
      setDone({ id, name });
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-cyan-900">
        <FolderPlus className="w-4 h-4" />
        <span>캔버스 프로젝트에 저장</span>
      </div>
      <p className="text-xs text-cyan-800">
        저장한 코드는 해당 프로젝트 편집기의 [&lt;/&gt; 코드] → 「저장한 AI 컴포넌트」에서 언제든 다시 보고 복사할 수 있습니다.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          aria-label="저장할 이름"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="저장할 이름"
          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
        />
        <select
          aria-label="저장할 프로젝트"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
        >
          <option value={NEW}>+ 새 프로젝트 만들어 저장</option>
          {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          type="button"
          disabled={busy || projects === null}
          onClick={() => void save()}
          className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50 cursor-pointer"
        >
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-rose-700" role="alert">{error}</p>}
      {done && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700" role="status">
          <Check className="w-3.5 h-3.5" />
          「{done.name}」에 저장했습니다. <a className="underline" href={`/editor/${done.id}`}>편집기에서 열기 →</a>
        </p>
      )}
    </div>
  );
};
