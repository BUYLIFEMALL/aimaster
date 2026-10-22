// v1.24: 상품별 섹션 순서(shop_products.section_sequence)를 화면·긴 이미지·섹션 ZIP에 똑같이 적용한다.
// 순서 목록에 있는 섹션은 그 순서대로, 목록에 없는 섹션(나중에 템플릿에 추가된 것 등)은 원래 순서로 뒤에 붙인다.
export function applySectionSequence<T extends { section_key: string }>(
  items: T[],
  sequence: string[] | null | undefined,
): T[] {
  if (!sequence || sequence.length === 0) return items;
  const rank = new Map(sequence.map((key, i) => [key, i]));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ra = rank.get(a.item.section_key) ?? sequence.length + a.i;
      const rb = rank.get(b.item.section_key) ?? sequence.length + b.i;
      return ra - rb;
    })
    .map(({ item }) => item);
}
