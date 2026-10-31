import Link from "next/link";

// หัวหน้าจอแบบมีปุ่มปิด/กลับ ใช้ในหน้าที่ไม่มี Bottom nav
export default function PageHeader({
  title,
  backHref = "/",
  icon = "close",
}: {
  title: string;
  backHref?: string;
  icon?: "close" | "back";
}) {
  return (
    <div className="flex items-center gap-1 px-3 pt-4 pb-2">
      <Link
        href={backHref}
        aria-label={icon === "close" ? "ปิด" : "กลับ"}
        className="flex size-11 items-center justify-center rounded-full"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icon === "close" ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M15 18l-6-6 6-6" />}
        </svg>
      </Link>
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );
}
