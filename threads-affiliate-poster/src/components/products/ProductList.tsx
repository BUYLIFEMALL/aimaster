import { DeleteButton } from "@/components/posts/DeleteButton";
import { deleteProductAction } from "@/lib/actions/products";
import { PLATFORM_LABELS, type AffiliateProduct } from "@/types/product";

export function ProductList({ products }: { products: AffiliateProduct[] }) {
  if (products.length === 0) {
    return <p className="p-6 text-center text-sm text-neutral-500">등록된 상품이 없습니다.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {products.map((product) => (
        <li key={product.id} className="flex items-center gap-3 p-4">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.product_name} className="h-12 w-12 rounded object-cover" />
          ) : (
            <div className="h-12 w-12 rounded bg-neutral-100" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-neutral-900">{product.product_name}</p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
              <span>{PLATFORM_LABELS[product.platform]}</span>
              {product.price && <span>· {product.price.toLocaleString()}원</span>}
              {product.input_mode === "manual" && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">상세정보 등록됨</span>
              )}
            </p>
          </div>
          <form action={deleteProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <DeleteButton />
          </form>
        </li>
      ))}
    </ul>
  );
}
