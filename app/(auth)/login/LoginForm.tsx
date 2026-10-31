"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/actions/auth";

export default function LoginForm({ allowSignup }: { allowSignup: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "signin" ? signIn : signUp,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold">อีเมล</label>
        <input
          id="email" name="email" type="email" autoComplete="email" required
          className="h-12 rounded-xl border border-field bg-card px-4 text-[17px]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">รหัสผ่าน</label>
        <input
          id="password" name="password" type="password" required minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="h-12 rounded-xl border border-field bg-card px-4 text-[17px]"
        />
      </div>

      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-brand-dark">{state.message}</p>}

      <button
        type="submit" disabled={pending}
        className="h-14 rounded-2xl bg-brand text-[17px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
      </button>

      {allowSignup && (
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="h-11 text-brand"
        >
          {mode === "signin" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
      )}
    </form>
  );
}
