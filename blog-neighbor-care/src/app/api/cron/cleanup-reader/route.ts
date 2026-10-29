import { createAdminClient } from '@/lib/supabase/admin';
import { createCleanupHandler } from '@/lib/cleanup';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = createCleanupHandler({
  secret: () => process.env.CRON_SECRET,
  rpc: (name, args) => createAdminClient().rpc(name, args),
  report: summary => console.info(JSON.stringify({ event: 'bnc_cleanup_completed', ...summary })),
});
