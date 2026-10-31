import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ApiError, GoogleGenAI } from "@google/genai";
import * as z from "zod/v4";
import { aiWordSchema } from "./schema";

// ผลลัพธ์ดิบจาก AI (ยังไม่ตรวจด้วย Zod) + จำนวน token ไว้บันทึกใน ai_usage
export type ProviderResult = {
  data: unknown;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

// error ที่แสดงให้ผู้ใช้เห็นได้ตรง ๆ
export class AiError extends Error {}

export type Provider = "gemini" | "anthropic";

// เลือกผู้ให้บริการจาก AI_PROVIDER ใน .env.local
// ไม่ได้ตั้งไว้: ใช้ Gemini ถ้ามี GEMINI_API_KEY ไม่อย่างนั้นใช้ Claude
export function currentProvider(): Provider {
  const p = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  return process.env.GEMINI_API_KEY ? "gemini" : "anthropic";
}

export async function generateWord(system: string, user: string): Promise<ProviderResult> {
  return currentProvider() === "gemini" ? callGemini(system, user) : callAnthropic(system, user);
}

// ---------- Google Gemini (มีแผนฟรี) ----------

async function callGemini(system: string, user: string): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("ยังไม่ได้ใส่ GEMINI_API_KEY ใน .env.local");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: geminiSchema(),
        temperature: 0.2,
      },
    });
    const text = res.text;
    if (!text) throw new AiError("Gemini ตอบกลับว่างเปล่า ลองกดเติมใหม่");
    return {
      data: JSON.parse(text),
      model,
      inputTokens: res.usageMetadata?.promptTokenCount ?? null,
      outputTokens: res.usageMetadata?.candidatesTokenCount ?? null,
    };
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof SyntaxError) throw new AiError("Gemini ตอบกลับไม่ใช่ JSON ลองกดเติมใหม่");
    if (err instanceof ApiError) {
      console.error("Gemini error", err.status, err.message);
      if (err.status === 429) throw new AiError("ใช้ Gemini ครบโควตาฟรีแล้ว (ต่อนาทีหรือต่อวัน) รอสักครู่แล้วลองใหม่");
      if (err.status === 400 && /api key/i.test(err.message)) {
        throw new AiError("GEMINI_API_KEY ไม่ถูกต้อง ตรวจ .env.local");
      }
      if (err.status === 401 || err.status === 403) throw new AiError("GEMINI_API_KEY ไม่ถูกต้องหรือไม่มีสิทธิ์");
      if (err.status === 404) throw new AiError(`ไม่พบโมเดล ${model} ลองเปลี่ยน GEMINI_MODEL`);
      throw new AiError(`Gemini ตอบกลับ error ${err.status}: ${shorten(err.message)}`);
    }
    throw err;
  }
}

// ---------- Anthropic Claude (ต้องเติมเครดิต) ----------

async function callAnthropic(system: string, user: string): Promise<ProviderResult> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiError("ยังไม่ได้ใส่ ANTHROPIC_API_KEY ใน .env.local");
  const model = process.env.AI_MODEL || "claude-haiku-5-5";

  try {
    const client = new Anthropic();
    const message = await client.messages.parse({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: zodOutputFormat(aiWordSchema) },
    });
    if (!message.parsed_output) throw new AiError("AI ตอบกลับไม่ครบ ลองกดเติมใหม่");
    return {
      data: message.parsed_output,
      model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic error", err.status, err.message);
      if (err.status === 401) throw new AiError("ANTHROPIC_API_KEY ไม่ถูกต้อง ตรวจ .env.local");
      if (err.status === 429) throw new AiError("เรียก AI ถี่เกินไป รอสักครู่แล้วลองใหม่");
      if (/credit balance/i.test(err.message)) {
        throw new AiError("เครดิต Anthropic ไม่พอ เติมเงินใน Console หรือใช้ Gemini แบบฟรีแทน");
      }
      throw new AiError(`Claude ตอบกลับ error ${err.status ?? ""}: ${shorten(err.message)}`);
    }
    throw err;
  }
}

// JSON schema สำหรับ Gemini (ตัด $schema ออก เพราะ API ไม่ต้องใช้)
function geminiSchema() {
  const schema = z.toJSONSchema(aiWordSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

const shorten = (s: string) => (s.length > 160 ? `${s.slice(0, 160)}…` : s);
