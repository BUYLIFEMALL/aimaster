// 「인스타에 올리기」(v1.17): 완성 이미지를 INSTA 포스팅의 「직접 첨부」와 같은 위치(공개 버킷 insta-post-images/<본인>/)에 올리고
// INSTA 새 글 화면을 연다(이미지 주소 + 글귀 캡션). INSTA가 본인 폴더인지 다시 검사한다. 인스타 피드는 4:5~1.91:1만 되므로 1:1에서만.
export const INSTA_NEW_POST_URL = "https://auto-instagram-posting.buylife.xyz/posts/new";
export const INSTA_OK_RATIOS = ["1:1"] as const;

export function instaRatioOk(ratio: string): boolean {
  return (INSTA_OK_RATIOS as readonly string[]).includes(ratio);
}

export function instaPostLink(imageUrl: string, caption: string): string {
  const q = new URLSearchParams({ imageUrl, caption: caption.slice(0, 2000), postType: "feed" });
  return `${INSTA_NEW_POST_URL}?${q.toString()}`;
}
