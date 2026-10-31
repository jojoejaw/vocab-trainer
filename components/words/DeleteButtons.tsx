"use client";

import { useState, useTransition } from "react";
import { deleteContext, deleteWord } from "@/actions/words";

// ลบคำ: กด 2 ครั้งเพื่อยืนยัน (ไม่ใช้ confirm() ของเบราว์เซอร์)
export function DeleteWordButton({ wordId }: { wordId: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => (armed ? start(() => deleteWord(wordId)) : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={`h-12 w-full rounded-2xl border font-medium ${armed ? "border-danger bg-danger text-white" : "border-field bg-card text-danger"}`}
    >
      {pending ? "กำลังลบ…" : armed ? "กดอีกครั้งเพื่อยืนยันลบ (ลบการ์ดและประวัติด้วย)" : "ลบคำนี้"}
    </button>
  );
}

export function DeleteContextButton({ contextId, wordId }: { contextId: string; wordId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="ลบประโยคนี้"
      disabled={pending}
      onClick={() => start(() => deleteContext(contextId, wordId))}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}
