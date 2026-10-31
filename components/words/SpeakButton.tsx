"use client";

import { speak } from "@/lib/tts";

export default function SpeakButton({ text, size = 44 }: { text: string; size?: number }) {
  return (
    <button
      type="button"
      aria-label={`ฟังเสียง ${text}`}
      onClick={() => speak(text)}
      disabled={!text.trim()}
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full border border-[#c9d6fb] bg-brand-soft text-brand disabled:opacity-40"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}
