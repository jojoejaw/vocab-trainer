import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 เปลี่ยนชื่อ middleware เป็น proxy
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // ข้ามไฟล์ static, รูปภาพ และ favicon
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
