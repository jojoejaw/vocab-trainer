"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { aiWordSchema, normalizeAiWord, type AiWord } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/ai/prompt";

const MODEL = process.env.AI_MODEL || "claude-haiku-5-5";

export type FillResult = { ok: true; word: AiWord } | { ok: false; error: string };

// ให้ AI เติมข้อมูลคำ (ยังไม่บันทึกคำ แค่คืนผลให้ผู้ใช้ตรวจ)
export async function fillWord(term: string, sentence: string): Promise<FillResult> {
  term = term.trim();
  sentence = sentence.trim();
  if (!term) return { ok: false, error: "พิมพ์คำศัพท์ก่อน" };
  if (term.length > 80 || sentence.length > 1000) {
    return { ok: false, error: "คำหรือประโยคยาวเกินไป" };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ยังไม่ได้ใส่ ANTHROPIC_API_KEY ใน .env.local" };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const { data: tagRows } = await supabase.from("tags").select("name").order("name");
  const tags = (tagRows ?? []).map((t) => t.name as string);

  try {
    const client = new Anthropic();
    const message = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(term, sentence, tags) }],
      output_config: { format: zodOutputFormat(aiWordSchema) },
    });

    await supabase.from("ai_usage").insert({
      action: "fill_word",
      model: MODEL,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    });

    if (!message.parsed_output) return { ok: false, error: "AI ตอบกลับไม่ครบ ลองกดเติมใหม่" };
    return { ok: true, word: normalizeAiWord(message.parsed_output, tags) };
  } catch (err) {
    console.error("fillWord failed", err);
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "API key ของ AI ไม่ถูกต้อง ตรวจ .env.local" };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "เรียก AI ถี่เกินไป รอสักครู่แล้วลองใหม่" };
    }
    if (err instanceof Anthropic.APIError && err.status === 400) {
      return { ok: false, error: "AI ปฏิเสธคำขอ (ตรวจเครดิตใน Anthropic Console)" };
    }
    return { ok: false, error: "เรียก AI ไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
}
