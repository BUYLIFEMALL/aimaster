import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainForHost } from "./cookieDomain";

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieDomain = cookieDomainForHost(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  );

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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                cookieDomain ? { ...options, domain: cookieDomain } : options
              )
            );
          } catch {
            // Server Component에서 호출된 경우 setAll은 무시
          }
        },
      },
    }
  );
}
