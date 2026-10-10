function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value==="object") {
    const obj=value as Record<string,unknown>;
    return Object.fromEntries(Object.keys(obj).sort().filter(key=>obj[key]!==undefined).map(key=>[key,canonical(obj[key])]));
  }
  return value;
}
export function postReviewSnapshot(post: {blog_id?:unknown;title?:unknown;content?:unknown;tags?:unknown;images?:unknown}) {
  return JSON.stringify(canonical({blog_id:post.blog_id || "",title:post.title || "",content:post.content || "",tags:post.tags || [],images:post.images || []}));
}
