import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCookieDomain } from "./cookieDomain";

export async function createClient() {
  const cookieStore = await cookies();
  const cookieDomain = getCookieDomain();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = cookieDomain ? { ...options, domain: cookieDomain } : options;
              cookieStore.set(name, value, opts);
            });
          } catch {
            // Server Component ignore
          }
        },
      },
    }
  );
}
