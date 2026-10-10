"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fetchNaverCategories } from "@/lib/naverExtensionClient";
import { normalizeNaverTags, type NaverCategory } from "@/lib/naverPublishing";

type Props = { postId: string | null; onSaved?: (tags: string[]) => void; onBlockingChange?: (blocked: boolean) => void };
export default function NaverPublishSettings(props: Props) {
  return <SettingsForm key={props.postId || "unsaved"} {...props} />;
}

function SettingsForm({ postId, onSaved, onBlockingChange }: Props) {
  const validId = Boolean(postId && /^[\da-f-]{36}$/i.test(postId));
  const id = useId();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [identity, setIdentity] = useState<{userId: string; blogId: string} | null>(null);
  const [category, setCategory] = useState<NaverCategory | null>(null);
  const [categories, setCategories] = useState<NaverCategory[]>([]);
  const [defaultCategory, setDefaultCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [setDefault, setSetDefault] = useState(false);
  const [busy, setBusy] = useState<"load" | "categories" | "save" | null>(validId ? "load" : null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedForm, setSavedForm] = useState<string | null>(null);
  const form = JSON.stringify({category,tags,setDefault});
  const dirty = savedForm !== null && form !== savedForm;
  const pendingTag = Boolean(tagInput.trim());
  useEffect(() => {
    onBlockingChange?.(Boolean(busy) || dirty || pendingTag || (validId && !identity));
    return () => { onBlockingChange?.(false); };
  }, [busy, dirty, pendingTag, validId, identity, onBlockingChange]);

  useEffect(() => {
    let cancelled = false;
    if (!validId) return;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/publishing`, {cache:"no-store"});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "발행 설정을 불러오지 못했습니다.");
        if (!cancelled) {
          setIdentity({userId:data.userId,blogId:data.blogId}); setCategory(data.category);
          setDefaultCategory(data.defaultCategory); setTags(data.tags);
          setSavedForm(JSON.stringify({category:data.category,tags:data.tags,setDefault:false}));
        }
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "발행 설정을 확인해 주세요."); }
      finally { if (!cancelled) setBusy(null); }
    })();
    return () => { cancelled = true; };
  }, [postId, validId]);

  async function loadCategories() {
    if (!identity) return;
    setBusy("categories"); setError(""); setMessage("");
    try { const list = await fetchNaverCategories(identity.userId, identity.blogId); if (mounted.current) { setCategories(list); setMessage(`네이버 카테고리 ${list.length}개를 불러왔습니다.`); } }
    catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "카테고리 조회 실패"); }
    finally { if (mounted.current) setBusy(null); }
  }

  function addTag() {
    const [tag] = normalizeNaverTags([tagInput]);
    if (!tag) { setError("태그를 100자 이내로 입력해 주세요."); return; }
    if (tags.includes(tag)) { setTagInput(""); return; }
    if (tags.length >= 10) { setError("자동 등록 태그는 최대 10개입니다."); return; }
    setTags([...tags, tag]); setTagInput(""); setMessage(""); setError("");
  }

  async function save() {
    setBusy("save"); setError(""); setMessage("");
    try {
      if (tagInput.trim()) throw new Error("입력 중인 태그를 먼저 추가해 주세요.");
      const res = await fetch(`/api/posts/${postId}/publishing`, { method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({category,tags,setDefault}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발행 설정 저장 실패");
      if (!mounted.current) return;
      setTags(data.tags); onSaved?.(data.tags); setMessage("카테고리와 태그를 저장했습니다. 다음 발행 전송에 자동 적용됩니다.");
      if (setDefault) setDefaultCategory(category?.name || "");
      setSetDefault(false); setSavedForm(JSON.stringify({category,tags:data.tags,setDefault:false}));
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "발행 설정 저장 실패"); }
    finally { if (mounted.current) setBusy(null); }
  }

  return <section className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3" aria-label="네이버 발행 카테고리·태그">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-bold text-sm text-neutral-900">네이버 발행 카테고리·태그</p>
      <button type="button" onClick={loadCategories} disabled={!identity || Boolean(busy)} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700 disabled:opacity-50">{busy === "categories" ? "불러오는 중…" : "네이버 카테고리 불러오기"}</button>
    </div>
    {!validId ? <p className="text-xs text-neutral-600">원고를 보관함에 저장한 뒤 카테고리와 태그를 설정할 수 있습니다.</p> : <>
      <p className="text-xs text-neutral-500">{identity?.blogId || "블로그 확인 중"} · 글감 분류와 별도로 네이버에 등록된 카테고리를 선택합니다.</p>
      <label htmlFor={`${id}-category`} className="block text-xs font-semibold text-neutral-700">네이버 발행 카테고리</label>
      <select id={`${id}-category`} value={category?.id || ""} disabled={Boolean(busy)} onChange={event => { setCategory(categories.find(c=>c.id===event.target.value) || null); setSetDefault(false); setMessage(""); }} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900">
        <option value="">{defaultCategory ? `블로그 기본값 사용: ${defaultCategory}` : "네이버에서 현재 선택된 카테고리 유지"}</option>
        {category && !categories.some(c=>c.id===category.id) && <option value={category.id}>{category.name}</option>}
        {categories.map(c=><option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
      </select>
      <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={setDefault} onChange={event=>setSetDefault(event.target.checked)} disabled={Boolean(busy) || !category} />이 선택을 이 블로그의 기본 카테고리로도 저장</label>
      <p className="text-xs font-semibold text-neutral-700">자동 등록 태그 ({tags.length}/10)</p>
      <div className="flex flex-wrap gap-2">{tags.map(tag=><button type="button" key={tag} aria-label={`${tag} 태그 삭제`} disabled={Boolean(busy)} onClick={()=>{setTags(tags.filter(t=>t!==tag));setMessage("");}} className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-700">#{tag} ×</button>)}</div>
      <div className="flex gap-2"><input aria-label="네이버 태그 추가" value={tagInput} onChange={event=>setTagInput(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();addTag();}}} disabled={Boolean(busy)} placeholder="태그 입력 후 추가 또는 Enter" className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900" /><button type="button" disabled={Boolean(busy)} onClick={addTag} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-700">태그 추가</button></div>
      <div className="flex justify-end"><button type="button" disabled={!identity || Boolean(busy)} onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{busy==="save" ? "저장 중…" : "발행 설정 저장"}</button></div>
    </>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {(dirty || pendingTag) && <p className="text-xs text-amber-700">변경한 발행 설정을 저장한 뒤 발행 전송해 주세요.</p>}
    {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
  </section>;
}
