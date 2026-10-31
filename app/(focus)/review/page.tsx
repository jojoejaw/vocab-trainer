import PageHeader from "@/components/layout/PageHeader";

export default function ReviewPage() {
  return (
    <>
      <PageHeader title="ทบทวน" />
      <main className="flex flex-1 flex-col px-5 pb-7">
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-line bg-card p-6 text-center text-muted">
          สัปดาห์ 3: Flashcard 2 ทิศ + ให้คะแนนด้วย FSRS
        </div>
      </main>
    </>
  );
}
