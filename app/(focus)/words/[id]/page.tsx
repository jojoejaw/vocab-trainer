import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SpeakButton from "@/components/words/SpeakButton";
import { DeleteContextButton, DeleteWordButton } from "@/components/words/DeleteButtons";
import { getWord } from "@/lib/words-data";
import { tagNames, wordStatus } from "@/lib/words";

export default function WordPage({ params }: PageProps<"/words/[id]">) {
  return (
    <>
      <PageHeader title="รายละเอียดคำ" backHref="/words" icon="back" />
      <Suspense fallback={<p className="px-5 text-muted">กำลังโหลด…</p>}>
        <WordDetail params={params} />
      </Suspense>
    </>
  );
}

const directionLabel = { en_to_th: "อังกฤษ → ความหมาย", th_to_en: "ไทย → อังกฤษ" };

function highlight(sentence: string, term: string) {
  const i = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return sentence;
  return (
    <>
      {sentence.slice(0, i)}
      <mark className="rounded bg-[#fde8c8] px-0.5 font-semibold text-ink">{sentence.slice(i, i + term.length)}</mark>
      {sentence.slice(i + term.length)}
    </>
  );
}

async function WordDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getWord(id);
  if (!result) notFound();
  const { word, contexts } = result;
  const tags = tagNames(word);

  return (
    <main className="flex flex-col gap-4 px-5 pb-8">
      <section className="flex flex-col gap-3.5 rounded-3xl border border-line bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="break-words font-mono text-[26px] font-medium">{word.term}</h2>
            {word.part_of_speech && <span className="text-sm text-muted">{word.part_of_speech}</span>}
          </div>
          <SpeakButton text={word.term} />
        </div>
        {(word.ipa || word.reading_th) && (
          <div className="flex flex-wrap gap-3 text-sm text-muted">
            {word.ipa && <span className="font-mono">{word.ipa}</span>}
            {word.reading_th && <span>{word.reading_th}</span>}
          </div>
        )}
        <div className="flex flex-col gap-1.5 rounded-2xl bg-[#f5f7ff] p-3.5">
          <span className="text-xl font-semibold leading-snug">{word.meaning_th}</span>
          {word.definition_en && <span className="text-[15px] leading-normal text-[#374151]">{word.definition_en}</span>}
        </div>

        {word.word_family.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-muted">Word family</span>
            <span className="font-mono text-sm">{word.word_family.join(" · ")}</span>
          </div>
        )}
        {word.collocations.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-muted">Collocation</span>
            <span className="text-sm">{word.collocations.join(" · ")}</span>
          </div>
        )}
        {word.root_parts && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-muted">รากศัพท์</span>
            <span className="text-sm">{word.root_parts}</span>
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand-dark">{t}</span>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="ml-1 text-[13px] font-semibold text-muted">ประโยคที่เจอ ({contexts.length})</h2>
        {contexts.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">ยังไม่มีประโยค</p>
        ) : (
          <div className="flex flex-col rounded-2xl border border-line bg-card">
            {contexts.map((c) => (
              <div key={c.id} className="flex items-start gap-2 border-b border-line-soft p-4 last:border-b-0">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-[15px] leading-relaxed">{highlight(c.sentence, word.term)}</p>
                  <span className="text-xs text-muted">
                    {c.is_ai_generated ? "AI แต่ง" : c.source_title ? `ที่มา: ${c.source_title}` : "จากเอกสาร"}
                  </span>
                </div>
                <DeleteContextButton contextId={c.id} wordId={word.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="ml-1 text-[13px] font-semibold text-muted">การ์ด</h2>
        <div className="flex flex-col rounded-2xl border border-line bg-card">
          {word.cards.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-line-soft px-4 py-3 text-sm last:border-b-0">
              <span>{directionLabel[c.direction]}</span>
              <span className="text-muted">{wordStatus([c]).label}</span>
            </div>
          ))}
        </div>
      </section>

      <Link href={`/words/${word.id}/edit`}
        className="flex h-12 items-center justify-center rounded-2xl bg-brand font-semibold text-white">
        แก้ไข
      </Link>
      <DeleteWordButton wordId={word.id} />
    </main>
  );
}
