// M2-5 유저 화면 개인정보 처리방침
import PolicyView, { policyTitle } from "../policy-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }) {
  return { title: await policyTitle((await params).store, "privacy") };
}

export default async function PrivacyPage({ params }: { params: Promise<{ store: string }> }) {
  return <PolicyView slug={(await params).store} kind="privacy" />;
}
