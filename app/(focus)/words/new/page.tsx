import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import WordForm from "@/components/words/WordForm";
import { listTagNames } from "@/lib/words-data";

export default function NewWordPage() {
  return (
    <>
      <PageHeader title="เพิ่มคำ" />
      <Suspense fallback={<p className="px-5 text-muted">กำลังโหลด…</p>}>
        <NewWordForm />
      </Suspense>
    </>
  );
}

async function NewWordForm() {
  const tags = await listTagNames();
  return <WordForm mode="new" existingTags={tags} />;
}
