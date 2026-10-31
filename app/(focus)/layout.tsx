// หน้าเต็มจอ ไม่มี Bottom nav: ทบทวน, เพิ่มคำ, ตั้งค่า
export default function FocusLayout({ children }: LayoutProps<"/">) {
  return <div className="mx-auto flex min-h-dvh max-w-md flex-col">{children}</div>;
}
