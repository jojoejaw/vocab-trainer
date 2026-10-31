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

// รอแต่ละโมเดลไม่เกิน 15 วินาที (ตอนคนใช้เยอะ Gemini อาจค้าง ~40 วินาทีแล้วตอบ 503)
const GEMINI_TIMEOUT_MS = 15_000;
// โมเดลที่เพิ่งไม่ว่าง ข้ามไป 10 นาที ครั้งต่อไปจะได้ไม่ต้องรอ timeout ซ้ำ
const BUSY_SKIP_MS = 10 * 60_000;
const busyUntil = new Map<string, number>();

// ลองตามลำดับ: GEMINI_MODEL (ถ้าตั้งไว้) → flash → flash-lite โดยเลื่อนโมเดลที่เพิ่งไม่ว่างไปท้ายสุด
function geminiModels() {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = [...new Set([preferred, "gemini-flash-latest", "gemini-flash-lite-latest"].filter((m): m is string => Boolean(m)))];
  const now = Date.now();
  const isBusy = (m: string) => (busyUntil.get(m) ?? 0) > now;
  return [...models.filter((m) => !isBusy(m)), ...models.filter(isBusy)];
}

// โมเดลนี้ใช้ไม่ได้ชั่วคราว ให้ลองโมเดลถัดไป: ไม่ว่าง, หมดโควตาของรุ่นนี้, ไม่มีรุ่นนี้, หมดเวลา
function shouldTryNextModel(err: unknown) {
  if (err instanceof ApiError) return [404, 429, 500, 503, 504].includes(err.status);
  return err instanceof Error && /abort|timeout|timed out/i.test(`${err.name} ${err.message}`);
}

async function callGemini(system: string, user: string): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("ยังไม่ได้ใส่ GEMINI_API_KEY ใน .env.local");

  // ปิด retry ของ SDK (ค่าเริ่มต้นลอง 5 รอบ ทำให้ค้างหลายนาที) แล้วเปลี่ยนโมเดลเองแทน
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: GEMINI_TIMEOUT_MS, retryOptions: { attempts: 1 } },
  });

  let lastError: unknown;
  for (const model of geminiModels()) {
    try {
      const result = await callGeminiModel(ai, model, system, user);
      busyUntil.delete(model);
      return result;
    } catch (err) {
      if (!shouldTryNextModel(err)) throw toGeminiError(err, model);
      busyUntil.set(model, Date.now() + BUSY_SKIP_MS);
      console.warn(`Gemini ${model} unavailable, trying next model:`, err instanceof Error ? err.message : err);
      lastError = err;
    }
  }
  if (lastError instanceof ApiError && lastError.status === 429) {
    throw new AiError("ใช้ Gemini ครบโควตาฟรีแล้ว (ต่อนาทีหรือต่อวัน) รอสักครู่แล้วลองใหม่");
  }
  throw new AiError("Gemini ไม่ว่างตอนนี้ (คนใช้เยอะหรือตอบช้าเกินไป) ลองใหม่อีกครั้ง");
}

async function callGeminiModel(ai: GoogleGenAI, model: string, system: string, user: string): Promise<ProviderResult> {
  try {
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
    if (err instanceof SyntaxError) throw new AiError("Gemini ตอบกลับไม่ใช่ JSON ลองกดเติมใหม่");
    throw err;
  }
}

// error ที่ไม่ควรลองโมเดลอื่น (key ผิด, คำขอผิด) แปลงเป็นข้อความให้ผู้ใช้
function toGeminiError(err: unknown, model: string) {
  if (err instanceof AiError) return err;
  if (err instanceof ApiError) {
    console.error("Gemini error", model, err.status, err.message);
    if (err.status === 400 && /api key/i.test(err.message)) {
      return new AiError("GEMINI_API_KEY ไม่ถูกต้อง ตรวจ .env.local");
    }
    if (err.status === 401 || err.status === 403) return new AiError("GEMINI_API_KEY ไม่ถูกต้องหรือไม่มีสิทธิ์");
    return new AiError(`Gemini ตอบกลับ error ${err.status}: ${shorten(err.message)}`);
  }
  return err;
}

// ---------- Anthropic Claude (ต้องเติมเครดิต) ----------

async function callAnthropic(system: string, user: string): Promise<ProviderResult> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiError("ยังไม่ได้ใส่ ANTHROPIC_API_KEY ใน .env.local");
  const model = process.env.AI_MODEL || "claude-haiku-5-5";

  try {
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
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
