"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { YoutubeConnectCard } from "@/components/youtube/YoutubeConnectCard";
import { Textarea } from "@/components/ui/Textarea";
import { ReelCoverPicker } from "@/components/candidates/ReelCoverPicker";
import { clsx } from "@/lib/clsx";
import { YOUTUBE_CATEGORY_OPTIONS } from "@/lib/youtubeCategories";
import {
  suggestYoutubeCategoryAction,
  generateYoutubeDescriptionAction,
  saveYoutubeDescriptionAction,
  postToYoutubeAction,
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
  type ConnectInstagramState,
  type GenerateCaptionState,
  type SaveCaptionState,
  type PostInstagramState,
} from "@/lib/actions/instagram";
import type { Database } from "@/types/database.types";

type Video = Database["public"]["Tables"]["shorts_videos"]["Row"];
type InstagramAccount = Database["public"]["Tables"]["instagram_accounts"]["Row"];


// v1.30 올린 기록(shorts_videos.youtube_uploads, 최근 10개)
interface YoutubeUpload { videoId: string; url: string; privacy: string | null; publishAt: string | null; at: string | null }
const PRIVACY_LABEL: Record<string, string> = { private: "비공개", unlisted: "일부 공개", public: "공개" };
const initialConnectInstagramState: ConnectInstagramState = {};
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
  youtubeChannelTitle,
  youtubeNeedsReconnect,
  instagramAccount,
  showConnectCard = true,
}: {
  video: Video;
  youtubeConnected: boolean;
  youtubeChannelTitle: string | null;
  youtubeNeedsReconnect: boolean;
  instagramAccount: Pick<InstagramAccount, "ig_username"> | null;
  /** 영상 목록(/videos)처럼 칸이 여러 개면 화면 위에 카드를 한 번만 두고 여기선 숨긴다 */
  showConnectCard?: boolean;
}) {
  const canPost = video.render_status === "ready" && !!video.rendered_video_url;
  const uploads = (Array.isArray(video.youtube_uploads) ? video.youtube_uploads : []) as unknown as YoutubeUpload[];
  const pathname = usePathname();

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
  // v1.28: 공개 범위(비공개 기본 — 확인 뒤 유튜브 스튜디오에서 직접 공개)·예약 공개
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const publishAtIso = scheduleOn && scheduleAt ? new Date(scheduleAt).toISOString() : "";

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

  const [connectInstagramState, connectInstagramFormAction, isConnectingInstagram] = useActionState(
    connectInstagramAction,
    initialConnectInstagramState,
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
          </div>
        </div>

        {showConnectCard && <div className="mb-4">
          <YoutubeConnectCard connected={youtubeConnected} channelTitle={youtubeChannelTitle} needsReconnect={youtubeNeedsReconnect} returnTo={pathname} />
        </div>}

        {!youtubeConnected ? (
          <p className="text-sm text-neutral-500">{showConnectCard ? "위 카드에서" : "화면 맨 위에서"} 유튜브 채널을 먼저 연결해 주세요.</p>
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
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
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

            {uploads.length > 0 && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="mb-2 text-xs font-semibold text-neutral-700">올린 기록 ({uploads.length})</p>
                <ul className="space-y-1">
                  {uploads.map((u) => (
                    <li key={u.videoId} className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                      <a href={u.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">{u.videoId}</a>
                      <span>{u.publishAt ? `예약 ${new Date(u.publishAt).toLocaleString("ko-KR")}` : PRIVACY_LABEL[u.privacy ?? ""] ?? "공개 범위 기록 없음"}</span>
                      {u.at && <span className="text-neutral-400">· {new Date(u.at).toLocaleString("ko-KR")} 올림</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {uploads.length > 0 && (
              <p className="text-xs text-amber-700">⚠️ 이 영상은 이미 {uploads.length}번 올렸습니다. 아래 버튼을 누르면 유튜브에 새 영상으로 하나 더 올라갑니다.</p>
            )}
              <form action={postYoutubeAction}>
                <input type="hidden" name="videoId" value={video.id} />
                <input type="hidden" name="categoryId" value={suggestState.categoryId ?? categoryId} />
                <input type="hidden" name="description" value={descriptionState.description ?? description} />
                <input type="hidden" name="privacyStatus" value={privacy} />
                <input type="hidden" name="publishAt" value={publishAtIso} />
                <div className="mb-3 space-y-2">
                  <label className="block text-xs text-neutral-500">
                    공개 범위
                    <select value={privacy} onChange={(e) => setPrivacy(e.target.value as typeof privacy)} disabled={scheduleOn}
                      className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900">
                      <option value="private">비공개(나만 보기 — 확인 뒤 직접 공개)</option>
                      <option value="unlisted">일부 공개(링크가 있는 사람만)</option>
                      <option value="public">공개(바로 모두에게)</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} />
                    정한 시각에 자동 공개(예약 — 그때까지 비공개)
                  </label>
                  {scheduleOn && (
                    <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)}
                      className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900" />
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={
                    !canPost ||
                    isPostingYoutube ||
                    youtubeNeedsReconnect ||
                    !(suggestState.categoryId ?? categoryId) ||
                    !(descriptionState.description ?? description) ||
                    (scheduleOn && !scheduleAt)
                  }
                >
                  {isPostingYoutube ? "업로드 중..." : `유튜브에 ${uploads.length > 0 ? "한 번 더 " : ""}${scheduleOn ? "예약 " : ""}올리기`}
                </Button>
              </form>
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
          <form action={connectInstagramFormAction}>
            <input type="hidden" name="returnTo" value={pathname} />
            <p className="mb-1 text-sm text-neutral-600">인스타그램 계정을 먼저 연결해주세요.</p>
            <p className="mb-3 text-xs text-neutral-500">연결하면 릴스 표지 이미지(JPG, 세로 9:16 권장)도 정할 수 있습니다.</p>
            <Button type="submit" variant="secondary" disabled={isConnectingInstagram}>
              {isConnectingInstagram ? "연결 중..." : "계정 연결하기"}
            </Button>
            {connectInstagramState.error && (
              <p className="mt-2 text-sm text-red-600">{connectInstagramState.error}</p>
            )}
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

            {video.instagram_status !== "posted" && <ReelCoverPicker videoId={video.id} disabled={isPostingInstagram} />}

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
