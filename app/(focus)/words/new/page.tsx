import PageHeader from "@/components/layout/PageHeader";

export default function NewWordPage() {
  return (
    <>
      <PageHeader title="เพิ่มคำ" />
      <main className="flex flex-col gap-4 px-5 pb-7">
        <div className="rounded-2xl border border-line bg-card p-5 text-center text-muted">
          สัปดาห์ 2: ฟอร์มเพิ่มคำ + AI เติมข้อมูล
        </div>
      </main>
    </>
  );
}
