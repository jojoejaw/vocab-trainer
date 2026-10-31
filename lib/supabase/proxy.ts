import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// หน้าที่เข้าได้โดยไม่ต้องล็อกอิน
const PUBLIC_PATHS = ["/login", "/auth"];

// ต่ออายุ session ของ Supabase ทุก request และพาไปหน้า login ถ้ายังไม่ได้ล็อกอิน
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // ยังไม่ได้ตั้งค่า .env.local → ให้หน้า login แสดงวิธีตั้งค่า
  if (!url || !key) {
    if (request.nextUrl.pathname.startsWith("/login")) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // ห้ามมีโค้ดอื่นคั่นระหว่าง createServerClient กับ getClaims
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!isLoggedIn && !isPublic) {
    return redirectKeepingCookies(new URL("/login", request.url), response);
  }
  if (isLoggedIn && path === "/login") {
    return redirectKeepingCookies(new URL("/", request.url), response);
  }

  return response;
}

function redirectKeepingCookies(to: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(to);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
