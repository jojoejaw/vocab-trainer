import { createBrowserClient } from "@supabase/ssr";

// Supabase client สำหรับใช้ใน Client Component (ฝั่งเบราว์เซอร์)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
