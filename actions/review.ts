"use server";

import { createClient } from "@/lib/supabase/server";
import {
  SCHEDULE_COLUMNS,
  STATE_NAME,
  fromFsrsCard,
  isGrade,
  scheduler,
  toFsrsCard,
  type Schedule,
} from "@/lib/review";

export type ReviewResult = { ok: true; schedule: Schedule } | { ok: false; error: string };

// ให้คะแนนการ์ด: คำนวณรอบถัดไปด้วย FSRS จากค่าในฐานข้อมูล (ไม่เชื่อค่าจากเบราว์เซอร์)
export async function reviewCard(cardId: string, rating: number, durationMs: number): Promise<ReviewResult> {
  if (!isGrade(rating)) return { ok: false, error: "คะแนนไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const { data: row, error: readError } = await supabase
    .from("cards")
    .select(SCHEDULE_COLUMNS)
    .eq("id", cardId)
    .maybeSingle<Schedule>();
  if (readError || !row) return { ok: false, error: "ไม่พบการ์ดนี้" };

  const now = new Date();
  const { card, log } = scheduler.next(toFsrsCard(row), now, rating);
  const elapsedDays = row.last_review
    ? Math.max(0, Math.floor((now.getTime() - Date.parse(row.last_review)) / 86_400_000))
    : 0;
  const schedule = fromFsrsCard(card);

  // เช็ค reps เดิมกันกดซ้ำ/เปิดหลายแท็บแล้วให้คะแนนการ์ดเดียวกัน 2 ครั้ง
  const { data: updated, error: updateError } = await supabase
    .from("cards")
    .update({ ...schedule, elapsed_days: elapsedDays })
    .eq("id", cardId)
    .eq("reps", row.reps)
    .select("id");
  if (updateError) {
    console.error("reviewCard update failed", updateError);
    return { ok: false, error: "บันทึกคะแนนไม่สำเร็จ" };
  }
  if (!updated || updated.length === 0) return { ok: false, error: "การ์ดนี้ให้คะแนนไปแล้ว" };

  const { error: logError } = await supabase.from("review_logs").insert({
    card_id: cardId,
    rating,
    state: STATE_NAME[log.state],
    due: log.due.toISOString(),
    stability: log.stability,
    difficulty: log.difficulty,
    elapsed_days: elapsedDays,
    scheduled_days: log.scheduled_days,
    learning_steps: log.learning_steps,
    reviewed_at: now.toISOString(),
    duration_ms: Math.min(Math.max(0, Math.round(durationMs) || 0), 3_600_000),
  });
  // ตารางของการ์ดบันทึกแล้ว ประวัติหายไป 1 แถวไม่กระทบการทบทวน
  if (logError) console.error("reviewCard log failed", logError);

  return { ok: true, schedule };
}
