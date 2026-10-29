import type { ReactNode } from 'react';
import { createClient } from '../lib/supabase/server';
import { ProgramNavigation } from './ProgramNavigation';

export async function ProgramShell({ children }: { children: ReactNode }) {
  let email: string | undefined;
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    if (!error) email = data.user?.email;
  } catch { /* Show login when identity cannot be verified. */ }
  return <ProgramNavigation email={email}>{children}</ProgramNavigation>;
}
