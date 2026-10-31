"use client";

import { useState, useTransition } from "react";
import { deleteContext, deleteWord } from "@/actions/words";

// ลบคำ: กด 2 ครั้งเพื่อยืนยัน (ไม่ใช้ confirm() ของเบราว์เซอร์)
export function DeleteWordButton({ wordId }: { wordId: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = () =>
    start(async () => {
      setError(null);
      const result = await deleteWord(wordId);
      if (result?.error) {
        setError(result.error);
        setArmed(false);
      }
    });

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => (armed ? remove() : setArmed(true))}
        onBlur={() => setArmed(false)}
        className={`h-12 w-full rounded-2xl border font-medium ${armed ? "border-danger bg-danger text-white" : "border-field bg-card text-danger"}`}
      >
        {pending ? "กำลังลบ…" : armed ? "กดอีกครั้งเพื่อยืนยันลบ (ลบการ์ดและประวัติด้วย)" : "ลบคำนี้"}
      </button>
      {error && <p role="alert" className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}

export function DeleteContextButton({ contextId, wordId }: { contextId: string; wordId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () =>
    start(async () => {
      const result = await deleteContext(contextId, wordId);
      setError(result?.error ?? null);
    });

  return (
    <button
      type="button"
      aria-label={error ? `${error} กดเพื่อลองใหม่` : "ลบประโยคนี้"}
      title={error ?? undefined}
      disabled={pending}
      onClick={remove}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${error ? "text-danger" : "text-muted"}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}
