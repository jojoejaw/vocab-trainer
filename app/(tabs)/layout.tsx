import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";

// หน้าที่มี Bottom nav: หน้าแรก, คลังคำ, สถิติ
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[100px]">
      {children}

      <Link
        href="/words/new"
        className="fixed bottom-[92px] right-[max(20px,calc(50vw-204px))] z-10 flex h-14 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-white shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        เพิ่มคำ
      </Link>

      <BottomNav />
    </div>
  );
}
