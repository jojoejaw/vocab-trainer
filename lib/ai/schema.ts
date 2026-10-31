import * as z from "zod/v4";

// รูปแบบผลลัพธ์ที่บังคับให้ AI ตอบ (structured output)
// ข้อจำกัดความยาวตรวจซ้ำใน normalizeAiWord เพราะ JSON schema ของ API รองรับไม่ครบ
export const aiWordSchema = z.object({
  status: z.enum(["ok", "not_found", "ambiguous"]),
  term: z.string(),
  part_of_speech: z.enum(["noun", "verb", "adjective", "adverb", "phrase", "other"]),
  meaning_th: z.string(),
  definition_en: z.string(),
  ipa: z.string(),
  reading_th: z.string(),
  example_sentence: z.string().nullable(),
  word_family: z.array(z.string()),
  root_parts: z.string().nullable(),
  collocations: z.array(z.string()),
  suggested_tags: z.array(z.object({ name: z.string(), is_new: z.boolean() })),
  confidence: z.enum(["high", "medium", "low"]),
  spelling_suggestions: z.array(z.string()),
});

export type AiWord = z.infer<typeof aiWordSchema>;

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max).trim() : s.trim());

// ตัดค่าที่เกินขอบเขตตาม prompt และกัน tag ซ้ำ
export function normalizeAiWord(w: AiWord, existingTags: string[]): AiWord {
  const known = new Map(existingTags.map((t) => [t.toLowerCase(), t]));
  const seen = new Set<string>();
  const tags = w.suggested_tags
    .map((t) => {
      const match = known.get(t.name.trim().toLowerCase());
      return match ? { name: match, is_new: false } : { name: clip(t.name, 30), is_new: true };
    })
    .filter((t) => t.name && !seen.has(t.name.toLowerCase()) && seen.add(t.name.toLowerCase()))
    .slice(0, 2);

  return {
    ...w,
    term: w.term.trim(),
    meaning_th: clip(w.meaning_th, 80),
    definition_en: clip(w.definition_en, 200),
    example_sentence: w.example_sentence ? clip(w.example_sentence, 300) : null,
    word_family: w.word_family.map((s) => s.trim()).filter(Boolean).slice(0, 5),
    collocations: w.collocations.map((s) => s.trim()).filter(Boolean).slice(0, 3),
    suggested_tags: tags,
    spelling_suggestions: w.spelling_suggestions.slice(0, 5),
  };
}
