/** 비공개 사진 원고/근거는 계정이 바뀔 수 있는 공용 브라우저 캐시에 남기지 않는다. */
export function cacheablePosts<T>(posts: T[]): T[] {
  return posts.filter(post => {
    const value = post as { images?: { storagePath?: string }[]; photo_review?: unknown; research_summary?: { photo_review?: unknown } };
    return !value.photo_review && !value.research_summary?.photo_review && !value.images?.some(image => image.storagePath);
  });
}
