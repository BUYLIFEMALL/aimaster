// M2-5 유저 화면 이용약관
import PolicyView, { policyTitle } from "../policy-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }) {
  return { title: await policyTitle((await params).store, "terms") };
}

export default async function TermsPage({ params }: { params: Promise<{ store: string }> }) {
  return <PolicyView slug={(await params).store} kind="terms" />;
}
