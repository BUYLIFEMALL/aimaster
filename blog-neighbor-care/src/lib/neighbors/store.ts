import type { SupabaseClient } from '@supabase/supabase-js';
import type { NeighborStore } from './api';
export function neighborStore(client: SupabaseClient): NeighborStore {
  return {
    accounts: async userId => {
      const {data,error} = await client.from('member_platform_accounts').select('id,external_id')
        .eq('user_id',userId).eq('platform','naver_blog').eq('needs_reconnect',false).order('id').limit(21);
      if (error) throw new Error('Accounts unavailable');
      return (data ?? []).map(a=>({id:a.id as string,blogId:a.external_id as string}));
    },
    account: async (userId,accountId) => {
      const {data,error} = await client.from('member_platform_accounts').select('id,external_id')
        .eq('user_id',userId).eq('id',accountId).eq('platform','naver_blog').eq('needs_reconnect',false).maybeSingle();
      if (error) throw new Error('Account unavailable');
      return data ? {id:data.id as string,blogId:data.external_id as string} : null;
    },
    rows: async (userId,accountId,cursor) => {
      let query = client.from('bnc_neighbors').select('neighbor_id,state,verified_at')
        .eq('user_id',userId).eq('account_id',accountId).order('neighbor_id').limit(51);
      if (cursor) query = query.gt('neighbor_id',cursor);
      const {data,error} = await query; if (error) throw new Error('Records unavailable'); return data ?? [];
    },
  };
}
