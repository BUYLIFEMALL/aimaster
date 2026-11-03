import { getStaffStore } from "@/lib/store";
import { readBusinessInfo } from "@/lib/businessInfo";
import { AdminShell, NoPermission } from "../admin-shell";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function StoreSettingsPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/settings`);
  if (!staff) return <NoPermission />;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/settings">
      <SettingsForm slug={store.slug} name={store.name} info={readBusinessInfo(store.business_info)} />
    </AdminShell>
  );
}
