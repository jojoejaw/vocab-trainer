"use client";

import { useMemo, useState } from "react";
import { tagNames, wordStatus, type WordRow } from "@/lib/words";
import WordListItem from "./WordListItem";

type Filter = "all" | "due" | "new";

const chip = (on: boolean) =>
  `h-9 shrink-0 rounded-full px-3.5 text-sm ${on ? "border border-ink bg-ink text-white" : "border border-field bg-card text-ink"}`;

export default function WordLibrary({ words }: { words: WordRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [tag, setTag] = useState("");

  const allTags = useMemo(
    () => [...new Set(words.flatMap((w) => tagNames(w)))].sort((a, b) => a.localeCompare(b)),
    [words],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words
      .map((w) => ({ w, status: wordStatus(w.cards) }))
      .filter(({ w, status }) => {
        if (filter !== "all" && status.kind !== filter) return false;
        if (tag && !tagNames(w).includes(tag)) return false;
        if (!q) return true;
        return (
          w.term.toLowerCase().includes(q) ||
          (w.meaning_th ?? "").toLowerCase().includes(q) ||
          (w.definition_en ?? "").toLowerCase().includes(q)
        );
      });
  }, [words, query, filter, tag]);

  return (
    <>
      <div className="flex flex-col gap-3.5 pb-3">
        <div className="relative">
          <label htmlFor="search" className="sr-only">ค้นหาคำ</label>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B6576" strokeWidth="2"
            strokeLinecap="round" aria-hidden="true" className="absolute left-3.5 top-[15px]">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาคำหรือความหมาย"
            className="h-12 w-full rounded-xl border border-field bg-card pr-3.5 pl-10 text-[15px]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={chip(filter === "all")}>ทั้งหมด</button>
          <button type="button" aria-pressed={filter === "due"} onClick={() => setFilter("due")} className={chip(filter === "due")}>ครบกำหนด</button>
          <button type="button" aria-pressed={filter === "new"} onClick={() => setFilter("new")} className={chip(filter === "new")}>ใหม่</button>
          {allTags.length > 0 && (
            <>
              <label htmlFor="tag-filter" className="sr-only">กรองตาม tag</label>
              <select
                id="tag-filter" value={tag} onChange={(e) => setTag(e.target.value)}
                className={`${chip(Boolean(tag))} pr-2`}
              >
                <option value="">Tag ทั้งหมด</option>
                {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-5 text-center text-muted">
          {words.length === 0 ? "ยังไม่มีคำ กดปุ่ม “เพิ่มคำ” เพื่อเริ่ม" : "ไม่พบคำที่ตรงกับเงื่อนไข"}
        </div>
      ) : (
        <div className="flex flex-col rounded-2xl border border-line bg-card">
          {rows.map(({ w, status }) => (
            <WordListItem key={w.id} id={w.id} term={w.term} meaning={w.meaning_th} status={status} />
          ))}
        </div>
      )}
    </>
  );
}
