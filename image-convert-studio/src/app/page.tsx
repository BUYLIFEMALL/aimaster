import { redirect } from "next/navigation";
import { convertPath } from "@/lib/imageTools/convertPath";

// 첫 주소로 들어온 검색값(?preset=·?src= 등)을 /convert로 그대로 넘긴다
export default async function RootPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(convertPath(await searchParams));
}
