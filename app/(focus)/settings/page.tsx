import PageHeader from "@/components/layout/PageHeader";
import { signOut } from "@/actions/auth";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="ตั้งค่า" icon="back" />
      <main className="flex flex-col gap-5 px-5 pb-7">
        <div className="rounded-2xl border border-line bg-card p-5 text-center text-muted">
          สัปดาห์ 4: โควตาคำใหม่ การ์ดกลับด้าน Dark mode
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="ml-1 text-[13px] font-semibold text-muted">บัญชี</h2>
          <form action={signOut} className="rounded-2xl border border-line bg-card">
            <button type="submit" className="min-h-12 w-full px-4 text-left text-danger">
              ออกจากระบบ
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
