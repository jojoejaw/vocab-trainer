import Link from "next/link";
import type { WordStatus } from "@/lib/words";

const badge: Record<WordStatus["kind"], string> = {
  new: "bg-brand-soft text-brand-dark",
  due: "bg-[#fef0e1] text-[#9a3b06]",
  later: "bg-line-soft text-[#374151]",
};

export default function WordListItem({
  id,
  term,
  meaning,
  status,
}: {
  id: string;
  term: string;
  meaning: string | null;
  status: WordStatus;
}) {
  return (
    <Link
      href={`/words/${id}`}
      className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-mono text-base font-semibold">{term}</span>
        <span className="truncate text-sm text-muted">{meaning ?? "—"}</span>
      </div>
      <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${badge[status.kind]}`}>
        {status.label}
      </span>
    </Link>
  );
}
