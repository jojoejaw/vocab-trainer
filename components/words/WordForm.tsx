"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fillWord } from "@/actions/ai";
import {
  addContext,
  checkDuplicate,
  createWord,
  updateWord,
  type DuplicateInfo,
} from "@/actions/words";
import { splitList, type WordInput } from "@/lib/words";
import SpeakButton from "./SpeakButton";

const POS = ["noun", "verb", "adjective", "adverb", "phrase", "other"];

type Fields = {
  part_of_speech: string;
  meaning_th: string;
  definition_en: string;
  ipa: string;
  reading_th: string;
  word_family: string;
  collocations: string;
  root_parts: string;
};

const emptyFields: Fields = {
  part_of_speech: "",
  meaning_th: "",
  definition_en: "",
  ipa: "",
  reading_th: "",
  word_family: "",
  collocations: "",
  root_parts: "",
};

type Props =
  | { mode: "new"; existingTags: string[] }
  | {
      mode: "edit";
      wordId: string;
      existingTags: string[];
      initial: { term: string; fields: Fields; tags: string[]; ai_filled: boolean };
    };

const inputCls =
  "h-11 w-full min-w-0 rounded-[10px] border border-line bg-[#f9fafb] px-3 text-[15px] text-ink";
const labelCls = "text-xs font-semibold text-muted";

export default function WordForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [term, setTerm] = useState(isEdit ? props.initial.term : "");
  const [sentence, setSentence] = useState("");
  const [sentenceIsAi, setSentenceIsAi] = useState(false);
  const [sourceTitle, setSourceTitle] = useState("");
  const [fields, setFields] = useState<Fields>(isEdit ? props.initial.fields : emptyFields);
  const [tags, setTags] = useState<string[]>(isEdit ? props.initial.tags : []);
  const [tagOptions, setTagOptions] = useState<string[]>(props.existingTags);
  const [newTag, setNewTag] = useState("");
  const [aiFilled, setAiFilled] = useState(isEdit ? props.initial.ai_filled : false);
  const [showPanel, setShowPanel] = useState(isEdit);
  const [aiNote, setAiNote] = useState<{ tone: "warn" | "info"; text: string } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; term: string } | null>(null);
  const [filling, startFill] = useTransition();
  const [saving, startSave] = useTransition();

  const set = (k: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  function toggleTag(name: string) {
    setTags((t) => (t.includes(name) ? t.filter((x) => x !== name) : [...t, name]));
  }

  function addNewTag() {
    const name = newTag.trim().slice(0, 30);
    if (!name) return;
    if (!tagOptions.some((t) => t.toLowerCase() === name.toLowerCase())) {
      setTagOptions((o) => [...o, name]);
    }
    setTags((t) => (t.some((x) => x.toLowerCase() === name.toLowerCase()) ? t : [...t, name]));
    setNewTag("");
  }

  async function onTermBlur() {
    if (isEdit || !term.trim()) return;
    setDuplicate(await checkDuplicate(term));
  }

  function runAi() {
    setError("");
    setAiNote(null);
    setSuggestions([]);
    startFill(async () => {
      const dup = isEdit ? null : await checkDuplicate(term);
      setDuplicate(dup);
      const res = await fillWord(term, sentence);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const w = res.word;
      if (w.status === "not_found") {
        setSuggestions(w.spelling_suggestions);
        setAiNote({ tone: "warn", text: "AI ไม่แน่ใจว่าเป็นคำภาษาอังกฤษ ตรวจการสะกดอีกครั้ง" });
        return;
      }
      setFields({
        part_of_speech: w.part_of_speech,
        meaning_th: w.meaning_th,
        definition_en: w.definition_en,
        ipa: w.ipa,
        reading_th: w.reading_th,
        word_family: w.word_family.join(", "),
        collocations: w.collocations.join(", "),
        root_parts: w.root_parts ?? "",
      });
      if (!sentence.trim() && w.example_sentence) {
        setSentence(w.example_sentence);
        setSentenceIsAi(true);
      }
      const names = w.suggested_tags.map((t) => t.name);
      setTagOptions((o) => [...o, ...names.filter((n) => !o.includes(n))]);
      setTags(names);
      setAiFilled(true);
      setShowPanel(true);
      if (w.status === "ambiguous") {
        setAiNote({ tone: "warn", text: "ประโยคนี้ตีความได้หลายแบบ ตรวจความหมายเป็นพิเศษ" });
      } else if (w.confidence === "low") {
        setAiNote({ tone: "warn", text: "AI ไม่ค่อยมั่นใจ ตรวจความหมายไทยก่อนบันทึก" });
      }
    });
  }

  function buildInput(): WordInput {
    return {
      term,
      part_of_speech: fields.part_of_speech,
      meaning_th: fields.meaning_th,
      definition_en: fields.definition_en,
      ipa: fields.ipa,
      reading_th: fields.reading_th,
      word_family: splitList(fields.word_family),
      collocations: splitList(fields.collocations),
      root_parts: fields.root_parts,
      tags,
      ai_filled: aiFilled,
      sentence,
      sentence_is_ai: sentenceIsAi,
      source_title: sourceTitle,
      source_url: "",
    };
  }

  function resetForNext(id: string) {
    setSaved({ id, term });
    setTerm("");
    setSentence("");
    setSentenceIsAi(false);
    setSourceTitle("");
    setFields(emptyFields);
    setTags([]);
    setAiFilled(false);
    setShowPanel(false);
    setAiNote(null);
    setDuplicate(null);
  }

  function save() {
    setError("");
    startSave(async () => {
      const res = isEdit
        ? await updateWord(props.wordId, buildInput())
        : await createWord(buildInput());
      if (!res.ok) {
        setError(res.error);
        if (res.duplicate) setDuplicate(res.duplicate);
        return;
      }
      if (isEdit) {
        router.push(`/words/${props.wordId}`);
      } else {
        resetForNext(res.id);
      }
    });
  }

  function addToExisting() {
    if (!duplicate) return;
    startSave(async () => {
      const res = await addContext(duplicate.id, sentence, sentenceIsAi, sourceTitle);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/words/${duplicate.id}`);
    });
  }

  const busy = filling || saving;

  return (
    <>
      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-6">
        {saved && (
          <p role="status" className="rounded-xl bg-[#e3f6ec] px-4 py-3 text-sm text-[#05603a]">
            บันทึก <span className="font-mono font-semibold">{saved.term}</span> แล้ว ·{" "}
            <Link href={`/words/${saved.id}`} className="underline">ดูคำ</Link>
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="term" className="text-sm font-semibold">
            คำศัพท์ <span className="text-danger">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="term" value={term} autoComplete="off" autoCapitalize="none" spellCheck={false}
              onChange={(e) => { setTerm(e.target.value); setDuplicate(null); setSaved(null); }}
              onBlur={onTermBlur}
              className="h-12 w-full min-w-0 rounded-xl border border-field bg-card px-3.5 font-mono text-[17px]"
            />
            <SpeakButton text={term} size={48} />
          </div>
        </div>

        {duplicate && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl border border-[#f5c27a] bg-[#fef0e1] p-3.5 text-sm text-[#7a2e05]">
            <p>
              มี <span className="font-mono font-semibold">{duplicate.term}</span> ในคลังแล้ว
              {duplicate.meaning_th ? ` (${duplicate.meaning_th})` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {sentence.trim() && !isEdit && (
                <button type="button" onClick={addToExisting} disabled={busy}
                  className="h-10 rounded-lg bg-[#9a3b06] px-3 font-medium text-white disabled:opacity-60">
                  เพิ่มประโยคเข้าคำเดิม
                </button>
              )}
              <Link href={`/words/${duplicate.id}`}
                className="flex h-10 items-center rounded-lg border border-[#d9a066] bg-white px-3">
                ดูคำเดิม
              </Link>
            </div>
          </div>
        )}

        {!isEdit && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sentence" className="text-sm font-semibold">
                ประโยคที่เจอ <span className="font-normal text-muted">(ไม่บังคับ)</span>
              </label>
              <textarea
                id="sentence" rows={3} value={sentence}
                onChange={(e) => { setSentence(e.target.value); setSentenceIsAi(false); }}
                className="resize-none rounded-xl border border-field bg-card px-3.5 py-2.5 text-[15px] leading-relaxed"
              />
              {sentenceIsAi && <span className="text-xs text-muted">ประโยคตัวอย่างที่ AI แต่งให้ แก้ได้</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="source" className="text-sm font-semibold">
                ที่มา <span className="font-normal text-muted">(ไม่บังคับ เช่น ชื่อเอกสาร)</span>
              </label>
              <input id="source" value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)}
                className="h-11 rounded-xl border border-field bg-card px-3.5 text-[15px]" />
            </div>
          </>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">หมายถึง</span>
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => { setTerm(s); setSuggestions([]); setAiNote(null); }}
                className="h-9 rounded-full border border-field bg-card px-3 font-mono">
                {s}
              </button>
            ))}
          </div>
        )}

        {!showPanel ? (
          <div className="flex flex-col items-center gap-2 pt-1">
            <button type="button" onClick={runAi} disabled={busy || !term.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-brand bg-brand-soft font-semibold text-brand-dark disabled:opacity-50">
              <SparkIcon />
              {filling ? "AI กำลังเติมข้อมูล…" : "ให้ AI เติมข้อมูล"}
            </button>
            <button type="button" onClick={() => setShowPanel(true)} className="h-10 text-sm text-brand">
              กรอกเองโดยไม่ใช้ AI
            </button>
          </div>
        ) : (
          <section className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-brand bg-card p-3.5">
            <div className="flex items-center gap-2">
              <SparkIcon />
              <span className="text-[15px] font-semibold text-brand-dark">
                {isEdit ? "ข้อมูลคำ" : aiFilled ? "AI เติมให้แล้ว · ตรวจก่อนบันทึก" : "กรอกข้อมูลคำ"}
              </span>
            </div>

            {aiNote && (
              <p className={`rounded-lg px-3 py-2 text-sm ${aiNote.tone === "warn" ? "bg-[#fef0e1] text-[#7a2e05]" : "bg-brand-soft text-brand-dark"}`}>
                {aiNote.text}
              </p>
            )}

            {isEdit && (
              <div className="flex flex-col gap-1">
                <label htmlFor="term-edit" className={labelCls}>คำศัพท์</label>
                <input id="term-edit" value={term} onChange={(e) => setTerm(e.target.value)}
                  className={`${inputCls} font-mono`} />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="meaning" className={labelCls}>
                ความหมายไทย <span className="text-danger">*</span>
              </label>
              <input id="meaning" value={fields.meaning_th} onChange={set("meaning_th")}
                className={`${inputCls} ${aiNote?.tone === "warn" ? "border-[#f5a524] bg-[#fffaf0]" : ""}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="definition" className={labelCls}>Definition</label>
              <input id="definition" value={fields.definition_en} onChange={set("definition_en")} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="ipa" className={labelCls}>IPA</label>
                <input id="ipa" value={fields.ipa} onChange={set("ipa")} className={`${inputCls} font-mono text-sm`} />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="reading" className={labelCls}>คำอ่านไทย</label>
                <input id="reading" value={fields.reading_th} onChange={set("reading_th")} className={`${inputCls} text-sm`} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="pos" className={labelCls}>ชนิดคำ</label>
              <select id="pos" value={fields.part_of_speech} onChange={set("part_of_speech")} className={inputCls}>
                <option value="">—</option>
                {POS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelCls}>Tag</span>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((name) => {
                  const on = tags.includes(name);
                  return (
                    <button key={name} type="button" aria-pressed={on} onClick={() => toggleTag(name)}
                      className={`h-9 rounded-full px-3.5 text-sm ${on ? "border border-brand bg-brand-soft text-brand-dark" : "border border-field bg-card text-[#374151]"}`}>
                      {on ? `${name} ✓` : name}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <label htmlFor="new-tag" className="sr-only">tag ใหม่</label>
                <input id="new-tag" value={newTag} placeholder="เพิ่ม tag ใหม่"
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewTag(); } }}
                  className={inputCls} />
                <button type="button" onClick={addNewTag}
                  className="h-11 shrink-0 rounded-[10px] border border-field bg-card px-3 text-sm">เพิ่ม</button>
              </div>
            </div>

            <details className="text-sm" open={isEdit}>
              <summary className="min-h-8 cursor-pointer font-medium text-brand">
                ข้อมูลเพิ่มเติม: word family, collocation, รากศัพท์
              </summary>
              <div className="flex flex-col gap-2.5 pt-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="family" className={labelCls}>Word family (คั่นด้วย ,)</label>
                  <input id="family" value={fields.word_family} onChange={set("word_family")} className={`${inputCls} font-mono text-sm`} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="colloc" className={labelCls}>Collocation (คั่นด้วย ,)</label>
                  <input id="colloc" value={fields.collocations} onChange={set("collocations")} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="root" className={labelCls}>รากศัพท์</label>
                  <input id="root" value={fields.root_parts} onChange={set("root_parts")} className={inputCls} />
                </div>
              </div>
            </details>
          </section>
        )}

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>

      {showPanel && (
        <div className="sticky bottom-0 flex gap-2.5 border-t border-line bg-page px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
          {!isEdit && (
            <button type="button" onClick={runAi} disabled={busy || !term.trim()}
              className="h-14 shrink-0 rounded-2xl border border-field bg-card px-4 font-medium disabled:opacity-50">
              {filling ? "กำลังเติม…" : "เติมใหม่"}
            </button>
          )}
          <button type="button" onClick={save} disabled={busy || !term.trim() || !fields.meaning_th.trim()}
            className="h-14 flex-1 rounded-2xl bg-brand text-[17px] font-semibold text-white disabled:opacity-50">
            {saving ? "กำลังบันทึก…" : isEdit ? "บันทึกการแก้ไข" : "บันทึก · สร้างการ์ด 2 ทิศ"}
          </button>
        </div>
      )}
    </>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </svg>
  );
}
