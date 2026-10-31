"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Grade } from "ts-fsrs";
import { reviewCard } from "@/actions/review";
import SpeakButton from "@/components/words/SpeakButton";
import { Blank, Highlight } from "@/components/words/Highlight";
import { RATINGS, previewIntervals, type ReviewCard } from "@/lib/review";

const RATING_STYLE: Record<Grade, string> = {
  1: "bg-danger text-white",
  2: "bg-[#b45309] text-white",
  3: "bg-brand text-white",
  4: "bg-[#047857] text-white",
};

export default function ReviewSession({ initial }: { initial: ReviewCard[] }) {
  const [queue, setQueue] = useState(initial);
  const [index, setIndex] = useState(0);
  const [intervals, setIntervals] = useState<Record<Grade, string> | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ reviewed: 0, again: 0 });
  const shownAt = useRef(0);

  const card = queue[index] as ReviewCard | undefined;
  const revealed = intervals !== null;

  // เริ่มจับเวลาเมื่อการ์ดใบใหม่ขึ้นมา
  useEffect(() => {
    shownAt.current = Date.now();
  }, [card?.id, index]);

  const reveal = useCallback(() => {
    if (card) setIntervals(previewIntervals(card, new Date()));
  }, [card]);

  const rate = useCallback(
    (grade: Grade) => {
      if (!card) return;
      const duration = Date.now() - shownAt.current;
      setIntervals(null);
      setIndex((i) => i + 1);
      setPending((n) => n + 1);
      setStats((s) => ({ reviewed: s.reviewed + 1, again: s.again + (grade === 1 ? 1 : 0) }));

      // ไปการ์ดถัดไปทันที บันทึกเบื้องหลัง
      reviewCard(card.id, grade, duration)
        .then((res) => {
          if (res.ok) {
            // "ลืม" วนกลับท้ายคิว พร้อมตารางใหม่
            if (grade === 1) setQueue((q) => [...q, { ...card, ...res.schedule }]);
          } else {
            setError(res.error);
            if (res.error !== "การ์ดนี้ให้คะแนนไปแล้ว") setQueue((q) => [...q, card]);
          }
        })
        .catch(() => {
          setError("เชื่อมต่อไม่ได้ การ์ดนี้จะกลับมาท้ายคิว");
          setQueue((q) => [...q, card]);
        })
        .finally(() => setPending((n) => n - 1));
    },
    [card],
  );

  // คีย์ลัดบนคอม: Space/Enter ดูคำตอบ, 1-4 ให้คะแนน
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        reveal();
      } else if (revealed) {
        const r = RATINGS.find((x) => x.key === e.key);
        if (r) rate(r.grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, reveal, rate]);

  if (queue.length === 0) {
    return (
      <Finished title="ยังไม่มีการ์ดที่ต้องทบทวน" detail="เพิ่มคำใหม่ หรือกลับมาใหม่เมื่อการ์ดครบกำหนด">
        <Link href="/words/new" className="flex h-12 items-center justify-center rounded-2xl bg-brand font-semibold text-white">
          เพิ่มคำ
        </Link>
      </Finished>
    );
  }

  if (!card) {
    if (pending > 0) return <p className="px-5 py-10 text-center text-muted">กำลังบันทึก…</p>;
    return (
      <Finished
        title="ทบทวนครบแล้ว"
        detail={`ให้คะแนน ${stats.reviewed} ครั้ง${stats.again ? ` · ลืม ${stats.again} ครั้ง` : ""}`}
      >
        {error && <p role="alert" className="text-center text-sm text-danger">{error}</p>}
        <Link href="/" className="flex h-12 items-center justify-center rounded-2xl bg-brand font-semibold text-white">
          กลับหน้าแรก
        </Link>
      </Finished>
    );
  }

  const { word } = card;
  const enFront = card.direction === "en_to_th";
  const remaining = queue.length - index;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pb-6">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
        <span className="text-sm text-muted">เหลือ {remaining}</span>
      </div>

      {error && (
        <button type="button" onClick={() => setError(null)} role="alert"
          className="rounded-xl bg-[#fdecea] px-4 py-2 text-left text-sm text-danger">
          {error} (แตะเพื่อปิด)
        </button>
      )}

      <section
        key={`${card.id}-${index}`}
        className="flex flex-1 flex-col gap-4 rounded-3xl border border-line bg-card p-5"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand-dark">
            {enFront ? "อังกฤษ → ไทย" : "ไทย → อังกฤษ"}
          </span>
          {card.state === "new" && <span className="text-xs font-semibold text-brand">คำใหม่</span>}
        </div>

        {/* ด้านหน้า */}
        {enFront ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <h2 className="break-words font-mono text-[30px] font-medium leading-tight">{word.term}</h2>
                {word.part_of_speech && <span className="text-sm text-muted">{word.part_of_speech}</span>}
              </div>
              <SpeakButton text={word.term} />
            </div>
            {word.sentence && (
              <p className="text-[15px] leading-relaxed text-[#374151]">
                <Highlight sentence={word.sentence} term={word.term} />
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col">
              <h2 className="text-[26px] font-semibold leading-snug">{word.meaning_th}</h2>
              {word.part_of_speech && <span className="text-sm text-muted">{word.part_of_speech}</span>}
            </div>
            {word.sentence && !revealed && (
              <p className="text-[15px] leading-relaxed text-[#374151]">
                <Blank sentence={word.sentence} term={word.term} />
              </p>
            )}
          </div>
        )}

        {/* ด้านหลัง */}
        {revealed && (
          <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
            {enFront ? (
              <>
                <span className="text-[22px] font-semibold leading-snug">{word.meaning_th}</span>
                <Pronunciation ipa={word.ipa} reading={word.reading_th} />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="break-words font-mono text-[26px] font-medium">{word.term}</span>
                  <SpeakButton text={word.term} />
                </div>
                <Pronunciation ipa={word.ipa} reading={word.reading_th} />
                {word.sentence && (
                  <p className="text-[15px] leading-relaxed text-[#374151]">
                    <Highlight sentence={word.sentence} term={word.term} />
                  </p>
                )}
              </>
            )}
            {word.definition_en && <p className="text-[15px] leading-normal text-muted">{word.definition_en}</p>}
            <Link href={`/words/${word.id}`} className="text-sm text-brand">ดูรายละเอียดคำ</Link>
          </div>
        )}
      </section>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(({ grade, label }) => (
            <button
              key={grade}
              type="button"
              onClick={() => rate(grade)}
              className={`flex h-16 flex-col items-center justify-center rounded-2xl ${RATING_STYLE[grade]}`}
            >
              <span className="text-[17px] font-semibold">{label}</span>
              <span className="text-xs opacity-85">{intervals[grade]}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={reveal}
          className="h-16 rounded-2xl bg-brand text-[17px] font-semibold text-white">
          ดูคำตอบ
        </button>
      )}
    </main>
  );
}

function Pronunciation({ ipa, reading }: { ipa: string | null; reading: string | null }) {
  if (!ipa && !reading) return null;
  return (
    <div className="flex flex-wrap gap-3 text-sm text-muted">
      {ipa && <span className="font-mono">{ipa}</span>}
      {reading && <span>{reading}</span>}
    </div>
  );
}

function Finished({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col justify-center gap-5 px-5 pb-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted">{detail}</p>
      </div>
      {children}
    </main>
  );
}
