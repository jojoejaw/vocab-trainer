import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import WordForm from "@/components/words/WordForm";
import { getWord, listTagNames } from "@/lib/words-data";
import { tagNames } from "@/lib/words";

export default function EditWordPage({ params }: PageProps<"/words/[id]/edit">) {
  return (
    <Suspense fallback={<p className="px-5 pt-6 text-muted">กำลังโหลด…</p>}>
      <EditForm params={params} />
    </Suspense>
  );
}

async function EditForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, allTags] = await Promise.all([getWord(id), listTagNames()]);
  if (!result) notFound();
  const w = result.word;

  return (
    <>
      <PageHeader title="แก้ไขคำ" backHref={`/words/${id}`} />
      <WordForm
        mode="edit"
        wordId={id}
        existingTags={allTags}
        initial={{
          term: w.term,
          tags: tagNames(w),
          ai_filled: w.ai_filled,
          fields: {
            part_of_speech: w.part_of_speech ?? "",
            meaning_th: w.meaning_th ?? "",
            definition_en: w.definition_en ?? "",
            ipa: w.ipa ?? "",
            reading_th: w.reading_th ?? "",
            word_family: w.word_family.join(", "),
            collocations: w.collocations.join(", "),
            root_parts: w.root_parts ?? "",
          },
        }}
      />
    </>
  );
}
