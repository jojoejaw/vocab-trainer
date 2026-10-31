"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

// แอปใช้คนเดียว: ปิดการสมัครไว้ เปิดชั่วคราวด้วย ALLOW_SIGNUP=true ใน .env.local
const signupAllowed = () => process.env.ALLOW_SIGNUP === "true";

function readForm(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readForm(formData);
  if (!email || !password) return { error: "กรอกอีเมลและรหัสผ่าน" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!signupAllowed()) return { error: "ปิดการสมัครสมาชิกอยู่" };
  const { email, password } = readForm(formData);
  if (!email || password.length < 8) {
    return { error: "กรอกอีเมล และรหัสผ่านอย่างน้อย 8 ตัวอักษร" };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    console.error("signUp failed", error.code, error.message);
    if (error.code === "user_already_exists") return { error: "อีเมลนี้สมัครไว้แล้ว" };
    if (error.code === "weak_password") return { error: "รหัสผ่านง่ายเกินไป" };
    return { error: "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  // ถ้าปิด "Confirm email" ใน Supabase จะได้ session ทันที
  if (data.session) redirect("/");
  return { message: "สมัครแล้ว เปิดลิงก์ยืนยันในอีเมลก่อนเข้าสู่ระบบ" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
