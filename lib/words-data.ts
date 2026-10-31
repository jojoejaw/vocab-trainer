import { createClient } from "@/lib/supabase/server";
import { WORD_SELECT, type ContextRow, type WordRow } from "@/lib/words";

// อ่านข้อมูลคำศัพท์ เรียกจาก Server Component เท่านั้น (ไม่ใช่ Server Action)
export async function listWords(): Promise<WordRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("words")
    .select(WORD_SELECT)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) console.error("listWords failed", error);
  return (data ?? []) as unknown as WordRow[];
}

export async function getWord(id: string) {
  const supabase = await createClient();
  const [{ data: word }, { data: contexts }] = await Promise.all([
    supabase.from("words").select(WORD_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("contexts")
      .select("id, sentence, source_title, source_url, is_ai_generated, created_at")
      .eq("word_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!word) return null;
  return { word: word as unknown as WordRow, contexts: (contexts ?? []) as ContextRow[] };
}

export async function listTagNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("name").order("name");
  return (data ?? []).map((t) => t.name as string);
}
