"use client";

import { useEffect } from "react";
import { addRecentProduct } from "@/lib/recent-products";

export default function RecentTracker({
  slug,
  product,
}: {
  slug: string;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}) {
  useEffect(() => {
    if (slug && product?.id) {
      addRecentProduct(slug, product);
    }
  }, [slug, product]);

  return null;
}
