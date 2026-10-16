import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";
export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  let response = NextResponse.next({ request: { headers } });
  const domain = cookieDomainForHost(request.headers.get("host"));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers } });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(
              name,
              value,
              domain ? { ...options, domain } : options,
            ),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  // Page and API gates enforce login + entitlement; API errors stay JSON.
  return response;
}
export const config = { matcher: ["/", "/settings", "/login"] };
