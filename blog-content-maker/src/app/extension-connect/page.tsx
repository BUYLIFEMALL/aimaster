import { requireProgramAccess } from "@/lib/access";
import { ExtensionConnectButton } from "@/components/ExtensionConnect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-23: 확장 팝업 「자동 연결」 버튼이 여는 화면. 로그인(proxy가 넘긴 현재 주소로 복귀) → 연결 코드 자동 발급 → 확장에 전달 → 확장이 탭을 닫는다.
export default async function ExtensionConnectPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireProgramAccess();
  const { from } = await searchParams;
  return <main className="welcome"><div className="card max-w-md stack"><p className="eyebrow">Chrome 확장</p><h1>확장 프로그램 연결</h1><p>버튼 한 번으로 이 계정 전용 연결 코드(7일 유효)를 만들어 이 브라우저의 확장에 바로 넣습니다. 코드를 복사하거나 붙여 넣을 필요가 없습니다.</p><ExtensionConnectButton auto={from === "extension"}/></div></main>;
}
