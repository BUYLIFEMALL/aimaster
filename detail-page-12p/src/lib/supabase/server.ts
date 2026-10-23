import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getCookieDomain } from "./cookieDomain";

export async function createClient() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const host = headerList.get("host") || "";
  const cookieDomain = host.endsWith("buylife.xyz") ? ".buylife.xyz" : undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                ...(cookieDomain ? { domain: cookieDomain } : {}),
                path: "/",
              });
            });
          } catch {
            // Server Component ignore
          }
        },
      },
    }
  );
}
