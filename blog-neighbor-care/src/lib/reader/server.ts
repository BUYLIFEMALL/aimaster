import 'server-only';
import { authorizeMember, authorizeProgramUser } from '../access';
import { createAdminClient } from '../supabase/admin';
import type { ReaderDependencies } from './api';

export const readerDependencies: ReaderDependencies = {
  member: authorizeMember,
  user: authorizeProgramUser,
  pairingOwner: async hash => {
    const { data, error } = await createAdminClient().from('bnc_reader_pairings').select('user_id')
      .eq('code_hash', hash).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error) throw new Error('Pairing lookup failed');
    return data?.user_id ?? null;
  },
  device: async hash => {
    const { data, error } = await createAdminClient().from('bnc_reader_devices').select('id,user_id')
      .eq('token_hash', hash).is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error) throw new Error('Device lookup failed');
    return data ? { userId: data.user_id, deviceId: data.id } : null;
  },
  rpc: async (userId, operation, payload) => {
    const { data, error } = await createAdminClient().rpc('bnc_reader_dispatch', {
      p_user_id: userId, p_operation: operation, p_payload: payload,
    });
    return { data, error };
  },
};
