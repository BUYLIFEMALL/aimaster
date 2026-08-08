"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { clsx } from "@/lib/clsx";
import { YOUTUBE_CATEGORY_OPTIONS } from "@/lib/youtubeCategories";
import {
  connectYoutubeAction,
  disconnectYoutubeAction,
  suggestYoutubeCategoryAction,
  generateYoutubeDescriptionAction,
  saveYoutubeDescriptionAction,
  postToYoutubeAction,
  type ConnectYoutubeState,
  type SuggestCategoryState,
  type GenerateDescriptionState,
  type SaveDescriptionState,
  type PostYoutubeState,
} from "@/lib/actions/youtube";
import {
  connectInstagramAction,
  disconnectInstagramAction,
  generateInstagramCaptionAction,
  saveInstagramCaptionAction,
  postToInstagramAction,
  type GenerateCaptionState,
  type SaveCaptionState,
  type PostInstagramState,
} from "@/lib/actions/instagram";
import type { Database } from "@/types/database.types";

type Video = Database["public"]["Tables"]["shorts_videos"]["Row"];
type InstagramAccount = Database["public"]["Tables"]["instagram_accounts"]["Row"];

const initialConnectYoutubeState: ConnectYoutubeState = {};
const initialSuggestState: SuggestCategoryState = {};
const initialGenerateDescriptionState: GenerateDescriptionState = {};
const initialSaveDescriptionState: SaveDescriptionState = {};
const initialPostYoutubeState: PostYoutubeState = {};
const initialGenerateCaptionState: GenerateCaptionState = {};
const initialSaveCaptionState: SaveCaptionState = {};
const initialPostInstagramState: PostInstagramState = {};

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    unposted: "bg-green-100 text-green-700",
    posting: "bg-blue-100 text-blue-700",
    posted: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    unposted: "미게시",
    posting: "게시 중...",
    posted: "게시 완료",
    failed: "게시 실패",
  };
  const key = status ?? "unposted";
  return (
    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", styles[key])}>
      {labels[key] ?? key}
    </span>
  );
}

export function PostingSection({
  video,
  youtubeConnected,
  youtubeNeedsReconnect,
  instagramAccount,
}: {
  video: Video;
  youtubeConnected: boolean;
  youtubeNeedsReconnect: boolean;
  instagramAccount: InstagramAccount | null;
}) {
  const canPost = video.render_status === "ready" && !!video.rendered_video_url;
  const pathname = usePathname();

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

  const [descriptionState, generateDescriptionAction, isGeneratingDescription] = useActionState(
    generateYoutubeDescriptionAction,
    initialGenerateDescriptionState,
  );
  const [description, setDescription] = useState(
    descriptionState.description ?? video.youtube_description ?? "",
  );
  const [saveDescriptionState, saveDescriptionAction, isSavingDescription] = useActionState(
    saveYoutubeDescriptionAction,
    initialSaveDescriptionState,
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
  const [saveCaptionState, saveCaptionAction, isSavingCaption] = useActionState(
    saveInstagramCaptionAction,
    initialSaveCaptionState,
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3">
          <h2 className="text-lg font-medium text-neutral-900">유튜브 쇼츠 업로드</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={video.youtube_status} />
            {youtubeConnected && (
              <>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  연동중
                </span>
                <form action={connectYoutubeFormAction}>
                  <input type="hidden" name="returnTo" value={pathname} />
                  <button
                    type="submit"
                    disabled={isConnectingYoutube}
                    className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {isConnectingYoutube ? "연결 중..." : "재연동"}
                  </button>
                </form>
                <form action={disconnectYoutubeAction}>
                  <button
                    type="submit"
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    연동해제
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {youtubeNeedsReconnect && (
          <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-medium text-amber-800">
            ⚠️ 유튜브 연결이 만료되었습니다. 위 &ldquo;재연동&rdquo; 버튼을 눌러 다시 연결해주세요.
          </p>
        )}

        {!youtubeConnected ? (
          <form action={connectYoutubeFormAction}>
            <input type="hidden" name="returnTo" value={pathname} />
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
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-neutral-500">카테고리</label>
                <form action={suggestAction}>
                  <input type="hidden" name="videoId" value={video.id} />
                  <button
                    type="submit"
                    disabled={isSuggesting}
                    className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
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

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-neutral-500">쇼츠 게시글</label>
                <div className="flex items-center gap-2">
                  <form action={generateDescriptionAction}>
                    <input type="hidden" name="videoId" value={video.id} />
                    <button
                      type="submit"
                      disabled={isGeneratingDescription}
                      className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      {isGeneratingDescription ? "생성 중..." : "쇼츠게시글 생성"}
                    </button>
                  </form>
                  <form action={saveDescriptionAction}>
                    <input type="hidden" name="videoId" value={video.id} />
                    <input type="hidden" name="description" value={descriptionState.description ?? description} />
                    <button
                      type="submit"
                      disabled={isSavingDescription || !(descriptionState.description ?? description)}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {isSavingDescription ? "저장 중..." : "수정 내용 저장"}
                    </button>
                  </form>
                </div>
              </div>
              <Textarea
                rows={8}
                value={descriptionState.description ?? description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="AI 설명 생성을 눌러 유튜브용 설명을 만들거나 직접 입력하세요."
              />
              {descriptionState.error && <p className="mt-1 text-sm text-red-600">{descriptionState.error}</p>}
              {saveDescriptionState.error && (
                <p className="mt-1 text-sm text-red-600">{saveDescriptionState.error}</p>
              )}
              {saveDescriptionState.success && (
                <p className="mt-1 text-sm text-green-600">수정 내용이 저장되었습니다.</p>
              )}
            </div>

            {!canPost && <p className="text-sm text-neutral-500">먼저 영상 생성을 완료해주세요.</p>}

            {video.youtube_status === "posted" && video.youtube_video_url ? (
              <a
                href={video.youtube_video_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                업로드 영상보기
              </a>
            ) : (
              <form action={postYoutubeAction}>
                <input type="hidden" name="videoId" value={video.id} />
                <input type="hidden" name="categoryId" value={suggestState.categoryId ?? categoryId} />
                <input type="hidden" name="description" value={descriptionState.description ?? description} />
                <Button
                  type="submit"
                  disabled={
                    !canPost ||
                    isPostingYoutube ||
                    youtubeNeedsReconnect ||
                    !(suggestState.categoryId ?? categoryId) ||
                    !(descriptionState.description ?? description)
                  }
                >
                  {isPostingYoutube ? "업로드 중..." : "유튜브에 올리기"}
                </Button>
              </form>
            )}
            {postYoutubeState.error && <p className="text-sm text-red-600">{postYoutubeState.error}</p>}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3">
          <h2 className="text-lg font-medium text-neutral-900">인스타그램 릴스 업로드</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={video.instagram_status} />
            {instagramAccount && (
              <>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  연동중
                </span>
                <form action={disconnectInstagramAction}>
                  <button
                    type="submit"
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    연동해제
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {!instagramAccount ? (
          <form action={connectInstagramAction}>
            <input type="hidden" name="returnTo" value={pathname} />
            <p className="mb-3 text-sm text-neutral-600">인스타그램 계정을 먼저 연결해주세요.</p>
            <Button type="submit" variant="secondary">
              계정 연결하기
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              연동중: <span className="font-medium text-neutral-900">@{instagramAccount.ig_username}</span>
            </p>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-neutral-500">캡션</label>
                <div className="flex items-center gap-2">
                  <form action={generateCaptionAction}>
                    <input type="hidden" name="videoId" value={video.id} />
                    <button
                      type="submit"
                      disabled={isGeneratingCaption}
                      className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      {isGeneratingCaption ? "AI 생성 중..." : "AI 캡션 생성"}
                    </button>
                  </form>
                  <form action={saveCaptionAction}>
                    <input type="hidden" name="videoId" value={video.id} />
                    <input type="hidden" name="caption" value={captionState.caption ?? caption} />
                    <button
                      type="submit"
                      disabled={isSavingCaption || !(captionState.caption ?? caption)}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {isSavingCaption ? "저장 중..." : "수정 내용 저장"}
                    </button>
                  </form>
                </div>
              </div>
              <Textarea
                rows={8}
                value={captionState.caption ?? caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="AI 캡션 생성을 눌러 캡션을 만들거나 직접 입력하세요."
              />
              {captionState.error && <p className="mt-1 text-sm text-red-600">{captionState.error}</p>}
              {saveCaptionState.error && <p className="mt-1 text-sm text-red-600">{saveCaptionState.error}</p>}
              {saveCaptionState.success && (
                <p className="mt-1 text-sm text-green-600">수정 내용이 저장되었습니다.</p>
              )}
            </div>

            {!canPost && <p className="text-sm text-neutral-500">먼저 영상 생성을 완료해주세요.</p>}

            {video.instagram_status === "posted" && video.instagram_post_url ? (
              <a
                href={video.instagram_post_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
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
