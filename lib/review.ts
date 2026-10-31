// ชนิดข้อมูลและตัวช่วยของการทบทวน (ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์)
import { fsrs, type Card, type Grade, type State } from "ts-fsrs";
import type { CardRow } from "@/lib/words";

// ตัวคำนวณตารางทบทวน ใช้ค่าเดียวกันทั้งตอนแสดงช่วงเวลาบนปุ่มและตอนบันทึกจริง
export const scheduler = fsrs({ enable_fuzz: true });

type CardStateName = CardRow["state"];
const STATE_NUM: Record<CardStateName, State> = { new: 0, learning: 1, review: 2, relearning: 3 };
export const STATE_NAME: CardStateName[] = ["new", "learning", "review", "relearning"];

// ค่าตาราง FSRS ของการ์ด ตรงกับคอลัมน์ในตาราง cards
export type Schedule = {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: CardStateName;
  last_review: string | null;
};

export const SCHEDULE_COLUMNS =
  "due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, state, last_review";

export type ReviewWord = {
  id: string;
  term: string;
  part_of_speech: string | null;
  meaning_th: string | null;
  definition_en: string | null;
  ipa: string | null;
  reading_th: string | null;
  sentence: string | null;
};

export type ReviewCard = Schedule & {
  id: string;
  direction: CardRow["direction"];
  word: ReviewWord;
};

export const RATINGS = [
  { grade: 1, label: "ลืม", key: "1" },
  { grade: 2, label: "ยาก", key: "2" },
  { grade: 3, label: "ได้", key: "3" },
  { grade: 4, label: "ง่าย", key: "4" },
] as const satisfies readonly { grade: Grade; label: string; key: string }[];

export function isGrade(n: unknown): n is Grade {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

export function toFsrsCard(s: Schedule): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps,
    reps: s.reps,
    lapses: s.lapses,
    state: STATE_NUM[s.state],
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  };
}

export function fromFsrsCard(c: Card): Schedule {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: STATE_NAME[c.state],
    last_review: c.last_review ? c.last_review.toISOString() : null,
  };
}

// ช่วงเวลาถึงรอบถัดไปของแต่ละปุ่ม เช่น { 1: "1 นาที", 3: "10 นาที", 4: "8 วัน" }
export function previewIntervals(s: Schedule, now: Date): Record<Grade, string> {
  const preview = scheduler.repeat(toFsrsCard(s), now);
  const out = {} as Record<Grade, string>;
  for (const { grade } of RATINGS) out[grade] = formatInterval(preview[grade].card.due.getTime() - now.getTime());
  return out;
}

export function formatInterval(ms: number) {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} นาที`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} ชม.`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} วัน`;
  if (days < 365) return `${Math.round(days / 30)} เดือน`;
  return `${(days / 365).toFixed(1).replace(/\.0$/, "")} ปี`;
}

// วันที่ตาม timezone ของผู้ใช้ ในรูป YYYY-MM-DD
export function dateKey(d: Date, timeZone: string) {
  return d.toLocaleDateString("en-CA", { timeZone });
}
