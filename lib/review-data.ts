import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_COLUMNS, dateKey, type ReviewCard, type ReviewWord } from "@/lib/review";

// อ่านคิวทบทวน เรียกจาก Server Component เท่านั้น
const CARD_SELECT = `id, direction, ${SCHEDULE_COLUMNS}, words(id, term, part_of_speech, meaning_th, definition_en, ipa, reading_th, contexts(sentence, created_at))`;

type CardWithWord = Omit<ReviewCard, "word"> & {
  words: Omit<ReviewWord, "sentence"> & { contexts: { sentence: string; created_at: string }[] };
};

function toReviewCard({ words, ...card }: CardWithWord): ReviewCard {
  const { contexts, ...word } = words;
  const first = [...contexts].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  return { ...card, word: { ...word, sentence: first?.sentence ?? null } };
}

export type ReviewQueue = {
  cards: ReviewCard[];
  dueCount: number;
  newWordCount: number;
  newWordsToday: number;
  newLimit: number;
};

// คิววันนี้: การ์ดครบกำหนดก่อน แล้วตามด้วยคำใหม่ไม่เกิน new_cards_per_day คำ/วัน
// (นับเป็นคำ: คำใหม่ 1 คำมีการ์ด 2 ทิศ ให้ทบทวนทิศอังกฤษ → ไทยก่อน)
export async function getReviewQueue(): Promise<ReviewQueue> {
  const supabase = await createClient();
  const now = new Date();

  const [{ data: profile }, { data: newLogs }, { data: dueRows, error: dueError }, { data: newRows, error: newError }] =
    await Promise.all([
      supabase.from("profiles").select("new_cards_per_day, timezone").maybeSingle(),
      // log ที่ state = new คือการเห็นการ์ดใหม่ครั้งแรก ดูย้อนหลัง 2 วันพอ แล้วกรองเอาเฉพาะวันนี้
      supabase
        .from("review_logs")
        .select("reviewed_at, cards(word_id)")
        .eq("state", "new")
        .gte("reviewed_at", new Date(now.getTime() - 2 * 86_400_000).toISOString()),
      supabase
        .from("cards")
        .select(CARD_SELECT)
        .neq("state", "new")
        .lte("due", now.toISOString())
        .order("due")
        .limit(300),
      supabase.from("cards").select(CARD_SELECT).eq("state", "new").order("created_at").limit(1000),
    ]);
  if (dueError) console.error("getReviewQueue due failed", dueError);
  if (newError) console.error("getReviewQueue new failed", newError);

  const timeZone = profile?.timezone ?? "Asia/Bangkok";
  const newLimit = profile?.new_cards_per_day ?? 10;
  const today = dateKey(now, timeZone);

  // คำที่เริ่มเรียนไปแล้ววันนี้ (การ์ดอีกทิศของคำเหล่านี้ไม่นับเพิ่ม)
  const startedToday = new Set(
    ((newLogs ?? []) as unknown as { reviewed_at: string; cards: { word_id: string } | null }[])
      .filter((l) => l.cards && dateKey(new Date(l.reviewed_at), timeZone) === today)
      .map((l) => l.cards!.word_id),
  );

  const newCards = ((newRows ?? []) as unknown as CardWithWord[]).map(toReviewCard);
  const pickedWords = new Set<string>();
  let slots = Math.max(0, newLimit - startedToday.size);
  for (const c of newCards) {
    if (pickedWords.has(c.word.id)) continue;
    if (startedToday.has(c.word.id)) pickedWords.add(c.word.id);
    else if (slots > 0) {
      pickedWords.add(c.word.id);
      slots--;
    }
  }
  const picked = newCards.filter((c) => pickedWords.has(c.word.id));
  const dueCards = ((dueRows ?? []) as unknown as CardWithWord[]).map(toReviewCard);

  return {
    cards: [
      ...dueCards,
      ...picked.filter((c) => c.direction === "en_to_th"),
      ...picked.filter((c) => c.direction === "th_to_en"),
    ],
    dueCount: dueCards.length,
    newWordCount: [...pickedWords].filter((id) => !startedToday.has(id)).length,
    newWordsToday: startedToday.size,
    newLimit,
  };
}
