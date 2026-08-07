"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { clsx } from "@/lib/clsx";
import { YOUTUBE_CATEGORY_OPTIONS } from "@/lib/youtubeCategories";
import {
  connectYoutubeAction,
  disconnectYoutubeAction,
  suggestYoutubeCategoryAction,
  postToYoutubeAction,
  type ConnectYoutubeState,
  type SuggestCategoryState,
  type PostYoutubeState,
} from "@/lib/actions/youtube";
import {
  connectInstagramAction,
  disconnectInstagramAction,
  generateInstagramCaptionAction,
  postToInstagramAction,
  type GenerateCaptionState,
  type PostInstagramState,
} from "@/lib/actions/instagram";
import type { Database } from "@/types/database.types";

type Video = Database["public"]["Tables"]["shorts_videos"]["Row"];
type YoutubeAccount = Database["public"]["Tables"]["youtube_accounts"]["Row"];
type InstagramAccount = Database["public"]["Tables"]["instagram_accounts"]["Row"];

const initialConnectYoutubeState: ConnectYoutubeState = {};
const initialSuggestState: SuggestCategoryState = {};
const initialPostYoutubeState: PostYoutubeState = {};
const initialGenerateCaptionState: GenerateCaptionState = {};
const initialPostInstagramState: PostInstagramState = {};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const styles: Record<string, string> = {
    posting: "bg-blue-100 text-blue-700",
    posted: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = { posting: "게시 중...", posted: "게시 완료", failed: "게시 실패" };
  return (
    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
      {labels[status] ?? status}
    </span>
  );
}

export function PostingSection({
  video,
  youtubeAccount,
  instagramAccount,
}: {
  video: Video;
  youtubeAccount: YoutubeAccount | null;
  instagramAccount: InstagramAccount | null;
}) {
  const canPost = video.render_status === "ready" && !!video.rendered_video_url;

  const [connectYoutubeState, connectYoutubeFormAction, isConnectingYoutube] = useActionState(
    connectYoutubeAction,
    initialConnectYoutubeState,
  );
  const [suggestState, suggestAction, isSuggesting] = useActionState(
    suggestYoutubeCategoryAction,
    initialSuggestState,
  );
  const [postYoutubeState, postYoutubeAction, isPostingYoutube] = useActionState(
    postToYoutubeAction,
    initialPostYoutubeState,
  );
  const [categoryId, setCategoryId] = useState(
    suggestState.categoryId ?? video.youtube_category_id ?? "",
  );

  const [captionState, generateCaptionAction, isGeneratingCaption] = useActionState(
    generateInstagramCaptionAction,
    initialGenerateCaptionState,
  );
  const [postInstagramState, postInstagramAction, isPostingInstagram] = useActionState(
    postToInstagramAction,
    initialPostInstagramState,
  );
  const [caption, setCaption] = useState(captionState.caption ?? video.instagram_caption ?? "");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-900">유튜브 쇼츠 업로드</h2>
          <StatusBadge status={video.youtube_status} />
        </div>

        {!youtubeAccount ? (
          <form action={connectYoutubeFormAction}>
            <p className="mb-3 text-sm text-neutral-600">유튜브 채널을 먼저 연결해주세요.</p>
            <Button type="submit" variant="secondary" disabled={isConnectingYoutube}>
              {isConnectingYoutube ? "연결 중..." : "채널 연결하기"}
            </Button>
            {connectYoutubeState.error && (
              <p className="mt-2 text-sm text-red-600">{connectYoutubeState.error}</p>
            )}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>
                연결됨: <span className="font-medium text-neutral-900">{youtubeAccount.channel_title}</span>
              </span>
              <form action={disconnectYoutubeAction}>
                <button type="submit" className="text-xs text-neutral-400 hover:text-neutral-600">
                  연결 해제
                </button>
              </form>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-neutral-500">카테고리</label>
                <form action={suggestAction}>
                  <input type="hidden" name="videoId" value={video.id} />
                  <button
                    type="submit"
                    disabled={isSuggesting}
                    className="text-xs text-neutral-500 underline hover:text-neutral-900 disabled:text-neutral-300"
                  >
                    {isSuggesting ? "AI 추천 중..." : "AI 카테고리 추천"}
                  </button>
                </form>
              </div>
              <select
                value={suggestState.categoryId ?? categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
              >
                <option value="">카테고리를 선택하세요</option>
                {YOUTUBE_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {suggestState.error && <p className="mt-1 text-sm text-red-600">{suggestState.error}</p>}
            </div>

            {!canPost && <p className="text-sm text-neutral-500">먼저 영상 생성을 완료해주세요.</p>}

            {video.youtube_status === "posted" && video.youtube_video_url ? (
              <a
                href={video.youtube_video_url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-blue-600 underline"
              >
                업로드된 영상 보기
              </a>
            ) : (
              <form action={postYoutubeAction}>
                <input type="hidden" name="videoId" value={video.id} />
                <input type="hidden" name="categoryId" value={suggestState.categoryId ?? categoryId} />
                <Button type="submit" disabled={!canPost || isPostingYoutube || !(suggestState.categoryId ?? categoryId)}>
                  {isPostingYoutube ? "업로드 중..." : "유튜브에 올리기"}
                </Button>
              </form>
            )}
            {postYoutubeState.error && (
              <div className="text-sm text-red-600">
                {postYoutubeState.error}
                {postYoutubeState.reconnectRequired && (
                  <form action={connectYoutubeFormAction} className="mt-2">
                    <Button type="submit" variant="secondary" disabled={isConnectingYoutube}>
                      {isConnectingYoutube ? "연결 중..." : "채널 재연결하기"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-900">인스타그램 릴스 업로드</h2>
          <StatusBadge status={video.instagram_status} />
        </div>

        {!instagramAccount ? (
          <form action={connectInstagramAction}>
            <p className="mb-3 text-sm text-neutral-600">인스타그램 계정을 먼저 연결해주세요.</p>
            <Button type="submit" variant="secondary">
              계정 연결하기
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>
                연결됨: <span className="font-medium text-neutral-900">@{instagramAccount.ig_username}</span>
              </span>
              <form action={disconnectInstagramAction}>
                <button type="submit" className="text-xs text-neutral-400 hover:text-neutral-600">
                  연결 해제
                </button>
              </form>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-neutral-500">캡션</label>
                <form action={generateCaptionAction}>
                  <input type="hidden" name="videoId" value={video.id} />
                  <button
                    type="submit"
                    disabled={isGeneratingCaption}
                    className="text-xs text-neutral-500 underline hover:text-neutral-900 disabled:text-neutral-300"
                  >
                    {isGeneratingCaption ? "AI 생성 중..." : "AI 캡션 생성"}
                  </button>
                </form>
              </div>
              <Textarea
                rows={8}
                value={captionState.caption ?? caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="AI 캡션 생성을 눌러 캡션을 만들거나 직접 입력하세요."
              />
              {captionState.error && <p className="mt-1 text-sm text-red-600">{captionState.error}</p>}
            </div>

            {!canPost && <p className="text-sm text-neutral-500">먼저 영상 생성을 완료해주세요.</p>}

            {video.instagram_status === "posted" && video.instagram_post_url ? (
              <a
                href={video.instagram_post_url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-blue-600 underline"
              >
                게시된 릴스 보기
              </a>
            ) : (
              <form action={postInstagramAction}>
                <input type="hidden" name="videoId" value={video.id} />
                <input type="hidden" name="caption" value={captionState.caption ?? caption} />
                <Button type="submit" disabled={!canPost || isPostingInstagram || !(captionState.caption ?? caption)}>
                  {isPostingInstagram ? "업로드 중..." : "인스타에 올리기"}
                </Button>
              </form>
            )}
            {postInstagramState.error && <p className="text-sm text-red-600">{postInstagramState.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
