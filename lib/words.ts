// ชนิดข้อมูลและฟังก์ชันช่วยของคำศัพท์ (ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์)

export type CardRow = {
  id: string;
  direction: "en_to_th" | "th_to_en";
  due: string;
  state: "new" | "learning" | "review" | "relearning";
};

export type ContextRow = {
  id: string;
  sentence: string;
  source_title: string | null;
  source_url: string | null;
  is_ai_generated: boolean;
  created_at: string;
};

export type WordRow = {
  id: string;
  term: string;
  part_of_speech: string | null;
  meaning_th: string | null;
  definition_en: string | null;
  ipa: string | null;
  reading_th: string | null;
  word_family: string[];
  root_parts: string | null;
  collocations: string[];
  notes: string | null;
  ai_filled: boolean;
  created_at: string;
  cards: CardRow[];
  word_tags: { tags: { id: string; name: string } | null }[];
};

export type WordInput = {
  term: string;
  part_of_speech: string;
  meaning_th: string;
  definition_en: string;
  ipa: string;
  reading_th: string;
  word_family: string[];
  root_parts: string;
  collocations: string[];
  tags: string[];
  ai_filled: boolean;
  sentence: string;
  sentence_is_ai: boolean;
  source_title: string;
  source_url: string;
};

export const WORD_SELECT =
  "id, term, part_of_speech, meaning_th, definition_en, ipa, reading_th, word_family, root_parts, collocations, notes, ai_filled, created_at, cards(id, direction, due, state), word_tags(tags(id, name))";

export function tagNames(w: Pick<WordRow, "word_tags">) {
  return w.word_tags.map((wt) => wt.tags?.name).filter((n): n is string => Boolean(n));
}

export type WordStatus = { kind: "new" | "due" | "later"; label: string };

// สถานะของคำจากการ์ดที่ครบกำหนดเร็วที่สุด
export function wordStatus(cards: CardRow[], now = new Date()): WordStatus {
  if (cards.length === 0 || cards.every((c) => c.state === "new")) {
    return { kind: "new", label: "ใหม่" };
  }
  const learned = cards.filter((c) => c.state !== "new");
  const next = Math.min(...learned.map((c) => Date.parse(c.due)));
  if (next <= now.getTime()) return { kind: "due", label: "ทบทวนวันนี้" };
  const days = Math.ceil((next - now.getTime()) / 86_400_000);
  return { kind: "later", label: `อีก ${days} วัน` };
}

// แยกรายการที่คั่นด้วยจุลภาคหรือขึ้นบรรทัดใหม่
export function splitList(s: string) {
  return s.split(/[,\n·]/).map((x) => x.trim()).filter(Boolean);
}
