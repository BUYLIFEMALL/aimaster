import { createNeighborHandler } from '../../../lib/neighbors/api';
import { neighborStore } from '../../../lib/neighbors/store';
import { authorizeMember } from '../../../lib/access';
import { createAdminClient } from '../../../lib/supabase/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
// Instantiate credentials only after membership validation, inside a requested store operation.
const store = () => neighborStore(createAdminClient());
export const POST = createNeighborHandler(authorizeMember, {
  accounts: userId => store().accounts(userId), account: (userId,id) => store().account(userId,id),
  rows: (userId,id,cursor) => store().rows(userId,id,cursor),
});
export const GET = () => new Response(null,{status:405,headers:{Allow:'POST'}});
