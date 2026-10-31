"use server";

import { createClient } from "@/lib/supabase/server";
import { aiWordSchema, normalizeAiWord, type AiWord } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/ai/prompt";
import { AiError, generateWord } from "@/lib/ai/providers";

export type FillResult = { ok: true; word: AiWord } | { ok: false; error: string };

// ให้ AI เติมข้อมูลคำ (ยังไม่บันทึกคำ แค่คืนผลให้ผู้ใช้ตรวจ)
export async function fillWord(term: string, sentence: string): Promise<FillResult> {
  term = term.trim();
  sentence = sentence.trim();
  if (!term) return { ok: false, error: "พิมพ์คำศัพท์ก่อน" };
  if (term.length > 80 || sentence.length > 1000) {
    return { ok: false, error: "คำหรือประโยคยาวเกินไป" };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const { data: tagRows } = await supabase.from("tags").select("name").order("name");
  const tags = (tagRows ?? []).map((t) => t.name as string);

  try {
    const result = await generateWord(SYSTEM_PROMPT, buildUserMessage(term, sentence, tags));

    await supabase.from("ai_usage").insert({
      action: "fill_word",
      model: result.model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
    });

    const parsed = aiWordSchema.safeParse(result.data);
    if (!parsed.success) {
      console.error("AI output did not match schema", parsed.error.issues);
      return { ok: false, error: "AI ตอบกลับไม่ตรงรูปแบบ ลองกดเติมใหม่" };
    }
    return { ok: true, word: normalizeAiWord(parsed.data, tags) };
  } catch (err) {
    if (err instanceof AiError) return { ok: false, error: err.message };
    console.error("fillWord failed", err);
    return { ok: false, error: "เรียก AI ไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
}
