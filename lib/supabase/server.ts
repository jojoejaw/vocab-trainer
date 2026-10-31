import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Supabase client สำหรับ Server Component, Server Action และ Route Handler
// สร้างใหม่ทุก request ห้ามเก็บไว้ใช้ซ้ำ
export async function createClient() {
  // ให้ข้อมูลผู้ใช้ทำงานตอนมี request จริงเท่านั้น ไม่ทำตอน prerender
  // (Supabase ตรวจวันหมดอายุของ session ด้วย Date.now() ซึ่ง Cache Components ห้ามใช้ตอน prerender)
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // เรียกจาก Server Component ซึ่งเขียน cookie ไม่ได้
            // ไม่เป็นไร เพราะ proxy.ts ต่ออายุ session ให้แล้ว
          }
        },
      },
    },
  );
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
