"use client";

// 글 작성 작업공간 공통 로직: 현재 글, 자동 저장, 이미지 생성·교체, 크롬 확장 전달.
// 주제 추천·키워드 탭의 [포스트 생성하기]와 맛집/카페/여행 탭이 같은 로직을 쓰도록 분리했다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppSettings } from "@/lib/storage";
import { findTheme, renderHtml, renderMarkdown, renderPlainText } from "@/lib/blog/article";
import { base64ToUploadUrl, fileToUploadUrl, overlayThumbnailTitle } from "@/lib/blog/canvas";
import { generateImageWith } from "@/lib/blog/imageGen";
import { resolveImageEngine } from "@/lib/blog/models";
import { savePost, uploadImage } from "@/lib/blog/postsApi";
import type { BlogPost, SavedPost } from "@/lib/blog/types";
import type { SaveState } from "./PostResultView";

export function useBlogWorkspace(settings: AppSettings, onNeedKey: () => void) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const postRef = useRef<BlogPost | null>(null);
  const postIdRef = useRef<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyCaption, setBusyCaption] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const queued = useRef(false);

  // 이미지 생성에 쓸 엔진(선택한 플랫폼·모델·본인 키). 새 설정이 없으면 기존 나노바나나 설정 그대로.
  const imageEngine = resolveImageEngine(settings);
  const hasKey = Boolean(imageEngine.apiKey);

  const flushSave = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (saving.current) {
      queued.current = true;
      return;
    }
    const current = postRef.current;
    if (!current) return;
    saving.current = true;
    setSaveState("saving");
    try {
      const saved = await savePost(current, postIdRef.current);
      postIdRef.current = saved.id;
      setSaveState("saved");
      setSaveError("");
    } catch (e) {
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      saving.current = false;
      if (queued.current) {
        queued.current = false;
        void flushSave();
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushSave(), 1500);
  }, [flushSave]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** 모든 수정은 여기를 거쳐 화면·자동 저장에 반영한다(비동기 이미지 작업이 서로 덮어쓰지 않게 최신 값 기준으로 갱신). */
  const update = useCallback((fn: (p: BlogPost) => BlogPost) => {
    const base = postRef.current;
    if (!base) return;
    const next = fn(base);
    postRef.current = next;
    setPost(next);
    scheduleSave();
  }, [scheduleSave]);

  const replace = useCallback((next: BlogPost) => update(() => next), [update]);

  const syncToExtension = useCallback(() => {
    const p = postRef.current;
    if (!p || typeof window === "undefined") return;
    const cover = p.images.find((s) => s.type === "thumbnail" && s.url);
    window.postMessage(
      {
        type: "ALLINONE_SYNC_DRAFT",
        draft: {
          title: p.title,
          contentHtml: renderHtml(p.article, p.images, p.settings.themeId),
          markdown: renderMarkdown(p.article, p.images, p.title),
          plainText: renderPlainText(p.article),
          tags: p.tags,
          summary: p.summary,
          thumbnailUrl: cover?.url,
        },
      },
      "*"
    );
  }, []);

  /** 새로 생성한 글을 작업공간에 올리고 보관함에 새로 저장한다. */
  const startFresh = useCallback(async (next: BlogPost) => {
    postIdRef.current = null;
    postRef.current = next;
    setPost(next);
    setErrorMsg("");
    await flushSave();
    syncToExtension();
    setTimeout(() => document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" }), 150);
  }, [flushSave, syncToExtension]);

  /** 보관함에서 연 글을 올린다(이미 저장된 글이므로 같은 주소로 계속 수정 저장). */
  const loadSaved = useCallback((saved: SavedPost) => {
    const { id, createdAt: _c, updatedAt: _u, ...rest } = saved;
    void _c; void _u;
    postRef.current = rest;
    postIdRef.current = id;
    setPost(rest);
    setSaveState("saved");
    setSaveError("");
    setErrorMsg("");
    setTimeout(() => document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" }), 150);
    return rest;
  }, []);

  const makeImage = useCallback(async (caption: string) => {
    const p = postRef.current;
    const slot = p?.images.find((s) => s.caption === caption);
    if (!p || !slot) return;
    setBusyCaption(caption);
    try {
      const gen = await generateImageWith(imageEngine, slot.prompt, p.settings.ratio);
      let dataUrl = await base64ToUploadUrl(gen.base64, gen.mime);
      if (slot.type === "thumbnail" && p.settings.withThumbnailText) dataUrl = await overlayThumbnailTitle(dataUrl, p.title, findTheme(p.settings.themeId).color);
      const url = await uploadImage(dataUrl);
      update((cur) => ({ ...cur, images: cur.images.map((s) => (s.caption === caption ? { ...s, url } : s)) }));
    } finally {
      setBusyCaption(null);
    }
  }, [imageEngine, update]);

  const generateOne = useCallback(async (index: number) => {
    const slot = postRef.current?.images[index];
    if (!slot) return;
    setErrorMsg("");
    try {
      await makeImage(slot.caption);
      syncToExtension();
    } catch (e) {
      setErrorMsg(`${slot.caption}: ${e instanceof Error ? e.message : "이미지 생성에 실패했습니다."}`);
    }
  }, [makeImage, syncToExtension]);

  const generateAll = useCallback(async () => {
    const todo = (postRef.current?.images ?? []).filter((s) => !s.url && s.prompt.trim()).map((s) => s.caption);
    if (!todo.length) return;
    setErrorMsg("");
    setImageProgress({ done: 0, total: todo.length });
    const failures: string[] = [];
    for (let i = 0; i < todo.length; i++) {
      try {
        await makeImage(todo[i]);
      } catch (e) {
        failures.push(`${todo[i]}: ${e instanceof Error ? e.message : "실패"}`);
      }
      setImageProgress({ done: i + 1, total: todo.length });
    }
    setImageProgress(null);
    if (failures.length) setErrorMsg(`이미지 ${failures.length}장 생성에 실패했습니다. 성공한 이미지는 저장했으니 실패한 컷만 다시 생성해주세요. ${failures.join(" / ")}`);
    syncToExtension();
  }, [makeImage, syncToExtension]);

  const uploadOwn = useCallback(async (index: number, file: File) => {
    const slot = postRef.current?.images[index];
    if (!slot) return;
    setErrorMsg("");
    setBusyCaption(slot.caption);
    try {
      const url = await uploadImage(await fileToUploadUrl(file));
      update((cur) => ({ ...cur, images: cur.images.map((s) => (s.caption === slot.caption ? { ...s, url } : s)) }));
      syncToExtension();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "이미지를 올리지 못했습니다.");
    } finally {
      setBusyCaption(null);
    }
  }, [syncToExtension, update]);

  const busyIndex = useMemo(() => (post && busyCaption ? post.images.findIndex((s) => s.caption === busyCaption) : -1), [post, busyCaption]);

  return {
    post, saveState, saveError, errorMsg, setErrorMsg, busyIndex, imageProgress, hasKey,
    flushSave, replace, update, syncToExtension, startFresh, loadSaved, generateOne, generateAll, uploadOwn, onNeedKey,
  };
}

export type BlogWorkspace = ReturnType<typeof useBlogWorkspace>;
