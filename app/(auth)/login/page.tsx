import { isSupabaseConfigured } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Vocab Trainer</h1>
        <p className="text-muted">ฝึกจำคำศัพท์ภาษาอังกฤษสาย Cyber Security</p>
      </div>

      {isSupabaseConfigured() ? (
        <LoginForm allowSignup={process.env.ALLOW_SIGNUP === "true"} />
      ) : (
        <div className="rounded-2xl border border-line bg-card p-5 leading-relaxed">
          <h2 className="mb-2 text-lg font-semibold">ยังไม่ได้เชื่อม Supabase</h2>
          <p className="text-muted">
            คัดลอกไฟล์ <code className="font-mono">.env.example</code> เป็น{" "}
            <code className="font-mono">.env.local</code> แล้วใส่ Project URL และ
            Publishable key จาก Supabase จากนั้นหยุดแล้วรัน{" "}
            <code className="font-mono">npm run dev</code> ใหม่
          </p>
        </div>
      )}
    </main>
  );
}
