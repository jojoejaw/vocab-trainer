import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import WordListItem from "@/components/words/WordListItem";
import { listWords } from "@/lib/words-data";
import { wordStatus } from "@/lib/words";

export default function HomePage() {
  return (
    <main className="flex flex-col gap-5 px-5 pt-7">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <Suspense fallback={<span className="h-5 text-sm text-muted">&nbsp;</span>}>
            <Greeting />
          </Suspense>
          <h1 className="text-[28px] font-bold leading-tight">วันนี้</h1>
        </div>
        <Link
          href="/settings"
          aria-label="ตั้งค่า"
          className="flex size-11 items-center justify-center rounded-full border border-line bg-card"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
          </svg>
        </Link>
      </div>

      {/* สัปดาห์ 4 จะดึงตัวเลขจริงจาก view today_summary */}
      <section className="flex flex-col gap-4 rounded-[20px] bg-brand p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="font-medium">ทบทวนวันนี้</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[13px]">Streak 0 วัน</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="text-[40px] font-bold leading-none">0</span>
            <span className="text-sm">การ์ดครบกำหนด</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[40px] font-bold leading-none">
              0<span className="text-xl font-medium">/10</span>
            </span>
            <span className="text-sm">คำใหม่วันนี้</span>
          </div>
        </div>
        <Link
          href="/review"
          className="flex h-[52px] items-center justify-center rounded-[14px] bg-white text-[17px] font-semibold text-brand"
        >
          เริ่มทบทวน
        </Link>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold">เพิ่มล่าสุด</h2>
          <Link href="/words" className="text-sm text-brand">ดูทั้งหมด</Link>
        </div>
        <Suspense fallback={<div className="h-24 rounded-2xl border border-line bg-card" />}>
          <RecentWords />
        </Suspense>
      </section>
    </main>
  );
}

async function RecentWords() {
  const words = (await listWords()).slice(0, 3);
  if (words.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5 text-center text-muted">
        ยังไม่มีคำ กดปุ่ม “เพิ่มคำ” เพื่อเริ่ม
      </div>
    );
  }
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-card">
      {words.map((w) => (
        <WordListItem key={w.id} id={w.id} term={w.term} meaning={w.meaning_th} status={wordStatus(w.cards)} />
      ))}
    </div>
  );
}

// อ่าน cookie ของผู้ใช้ จึงต้องอยู่ใน Suspense (Cache Components)
async function Greeting() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;
  return <span className="text-sm text-muted">{email ?? ""}</span>;
}
