import { Suspense } from "react";
import WordLibrary from "@/components/words/WordLibrary";
import { listWords } from "@/lib/words-data";

export default function WordsPage() {
  return (
    <main className="flex flex-col gap-3.5 px-5 pt-7">
      <Suspense
        fallback={
          <>
            <h1 className="text-[28px] font-bold">คลังคำ</h1>
            <p className="text-muted">กำลังโหลด…</p>
          </>
        }
      >
        <Library />
      </Suspense>
    </main>
  );
}

async function Library() {
  const words = await listWords();
  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-bold">คลังคำ</h1>
        <span className="text-sm text-muted">{words.length} คำ</span>
      </div>
      <WordLibrary words={words} />
    </>
  );
}
