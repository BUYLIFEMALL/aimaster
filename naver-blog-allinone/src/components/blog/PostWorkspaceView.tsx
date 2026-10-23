"use client";

import React from "react";
import { PostImagesPanel } from "./PostImagesPanel";
import { PostResultView } from "./PostResultView";
import type { BlogWorkspace } from "./useBlogWorkspace";

interface Props {
  ws: BlogWorkspace;
  /** 글 생성 중이면 편집을 잠근다 */
  locked: boolean;
  onOpenLibrary: () => void;
}

/** 생성된 글 결과 화면(검수·이미지 컷·편집·미리보기·복사) — 세 탭이 같은 화면을 쓴다. */
export function PostWorkspaceView({ ws, locked, onOpenLibrary }: Props) {
  if (!ws.post) return null;
  return (
    <PostResultView
      post={ws.post}
      saveState={ws.saveState}
      saveError={ws.saveError}
      locked={locked || ws.imageProgress !== null}
      onChange={ws.replace}
      onSaveNow={() => void ws.flushSave()}
      onSyncToExtension={ws.syncToExtension}
      onOpenLibrary={onOpenLibrary}
      imagesPanel={
        <PostImagesPanel
          post={ws.post}
          locked={locked}
          busyIndex={ws.busyIndex >= 0 ? ws.busyIndex : null}
          progress={ws.imageProgress}
          hasKey={ws.hasKey}
          onChange={ws.replace}
          onGenerate={(i) => void ws.generateOne(i)}
          onGenerateAll={() => void ws.generateAll()}
          onUpload={(i, f) => void ws.uploadOwn(i, f)}
          onNeedKey={ws.onNeedKey}
        />
      }
    />
  );
}
