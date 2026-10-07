import "server-only";
import type { PostMedia } from "@/threads-content-ops/lib/media";

// Threads 발행 (v1.59): 글만 / 이미지 1장 / 영상 1개 / 이미지·영상 혼합 캐러셀(2~20개).
// threads-affiliate-poster의 검증된 방식(src/lib/threads/client.ts)을 옮겼다: 아이템 컨테이너 → 처리 완료(FINISHED) 확인 → 캐러셀 부모 컨테이너 → 게시.
const GRAPH = "https://graph.threads.net/v1.0";

type Params = { threadsUserId: string; accessToken: string; text: string; media: PostMedia[] };

async function graph<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(`${fallback}${data.error?.message ? ` (${data.error.message.slice(0, 160)})` : ""}`);
  return data;
}

async function post<T>(path: string, body: URLSearchParams, fallback: string): Promise<T> {
  const response = await fetch(`${GRAPH}/${path}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  return graph<T>(response, fallback);
}

async function waitReady(creationId: string, accessToken: string, video: boolean): Promise<void> {
  const deadline = Date.now() + (video ? 180_000 : 60_000);
  const interval = video ? 3_000 : 2_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${GRAPH}/${creationId}?${new URLSearchParams({ fields: "status,error_message", access_token: accessToken })}`, { cache: "no-store" });
    const result = await graph<{ status?: string; error_message?: string }>(response, "Threads 미디어 상태를 확인하지 못했습니다.");
    if (result.status === "FINISHED") return;
    if (result.status === "ERROR" || result.status === "EXPIRED") {
      throw new Error(result.error_message ? `Threads 미디어 처리에 실패했습니다: ${result.error_message}` : `Threads 미디어 처리에 실패했습니다. (${result.status})`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Threads 미디어 처리가 너무 오래 걸려 게시를 중단했습니다. 잠시 뒤 다시 시도해 주세요.");
}

export async function publishToThreads({ threadsUserId, accessToken, text, media }: Params): Promise<{ id: string; permalink: string | null }> {
  const items = media.slice(0, 20);
  let creationId: string;

  if (items.length > 1) {
    const children: string[] = [];
    for (const item of items) {
      const body = new URLSearchParams({ access_token: accessToken, is_carousel_item: "true", media_type: item.type });
      body.set(item.type === "VIDEO" ? "video_url" : "image_url", item.url);
      children.push((await post<{ id: string }>(`${threadsUserId}/threads`, body, "Threads 캐러셀 항목을 만들지 못했습니다.")).id);
    }
    for (let index = 0; index < children.length; index += 1) await waitReady(children[index], accessToken, items[index].type === "VIDEO");
    creationId = (await post<{ id: string }>(`${threadsUserId}/threads`, new URLSearchParams({ access_token: accessToken, media_type: "CAROUSEL", children: children.join(","), text }), "Threads 캐러셀을 만들지 못했습니다.")).id;
    await waitReady(creationId, accessToken, false);
  } else if (items.length === 1) {
    const single = items[0];
    const body = new URLSearchParams({ access_token: accessToken, media_type: single.type, text });
    body.set(single.type === "VIDEO" ? "video_url" : "image_url", single.url);
    creationId = (await post<{ id: string }>(`${threadsUserId}/threads`, body, "Threads 게시물을 만들지 못했습니다.")).id;
    await waitReady(creationId, accessToken, single.type === "VIDEO");
  } else {
    creationId = (await post<{ id: string }>(`${threadsUserId}/threads`, new URLSearchParams({ access_token: accessToken, media_type: "TEXT", text }), "Threads 게시물을 만들지 못했습니다.")).id;
  }

  const published = await post<{ id: string }>(`${threadsUserId}/threads_publish`, new URLSearchParams({ access_token: accessToken, creation_id: creationId }), "Threads 게시물 발행에 실패했습니다.");
  let permalink: string | null = null;
  try {
    const lookup = await fetch(`${GRAPH}/${published.id}?${new URLSearchParams({ fields: "permalink", access_token: accessToken })}`, { cache: "no-store" });
    if (lookup.ok) permalink = ((await lookup.json()) as { permalink?: string }).permalink ?? null;
  } catch { /* 주소 조회 실패는 발행 성공에 영향을 주지 않는다 */ }
  return { id: published.id, permalink };
}
