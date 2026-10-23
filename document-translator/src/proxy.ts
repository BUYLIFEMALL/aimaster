import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";

export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  let response = NextResponse.next({ request: { headers } });
  response.headers.set("Cache-Control", "private, no-store");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  // Configuration failure never opens a workspace: the server layout sends /setup.
  if (!url || !key) return response;
  const domain = cookieDomainForHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers } });
        response.headers.set("Cache-Control", "private, no-store");
        values.forEach(({ name, value, options }) =>
          response.cookies.set(
            name,
            value,
            domain ? { ...options, domain } : options,
          ),
        );
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|pdf/|workers/|setup|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
