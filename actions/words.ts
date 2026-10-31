"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { WordInput } from "@/lib/words";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type DuplicateInfo = { id: string; term: string; meaning_th: string | null };
export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string; duplicate?: DuplicateInfo };

const clean = (s: string | undefined | null, max = 500) => (s ?? "").trim().slice(0, max);
const cleanList = (xs: string[], max = 10) =>
  [...new Set(xs.map((x) => x.trim()).filter(Boolean))].slice(0, max);

async function requireUser(supabase: Supabase) {
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("not signed in");
}

// F3: หาคำเดิมในคลัง (ไม่สนตัวพิมพ์เล็ก/ใหญ่และช่องว่าง)
export async function checkDuplicate(term: string): Promise<DuplicateInfo | null> {
  const t = term.trim().toLowerCase();
  if (!t) return null;
  const supabase = await createClient();
  await requireUser(supabase);
  const { data } = await supabase
    .from("words")
    .select("id, term, meaning_th")
    .ilike("term", t.replace(/[%_\\]/g, (c) => `\\${c}`));
  return (data ?? []).find((w) => w.term.trim().toLowerCase() === t) ?? null;
}

// แปลงชื่อ tag เป็น id (สร้าง tag ใหม่ถ้ายังไม่มี)
async function resolveTagIds(supabase: Supabase, names: string[]) {
  const wanted = cleanList(names, 5).map((n) => n.slice(0, 30));
  if (wanted.length === 0) return [];
  const { data: existing } = await supabase.from("tags").select("id, name");
  const byName = new Map((existing ?? []).map((t) => [t.name.toLowerCase(), t.id as string]));
  const missing = wanted.filter((n) => !byName.has(n.toLowerCase()));
  if (missing.length > 0) {
    const { data: created, error } = await supabase
      .from("tags")
      .insert(missing.map((name) => ({ name })))
      .select("id, name");
    if (error) throw error;
    created?.forEach((t) => byName.set(t.name.toLowerCase(), t.id));
  }
  return wanted.map((n) => byName.get(n.toLowerCase())).filter((id): id is string => Boolean(id));
}

function wordFields(input: WordInput) {
  return {
    term: clean(input.term, 80),
    part_of_speech: clean(input.part_of_speech, 20) || null,
    meaning_th: clean(input.meaning_th, 200) || null,
    definition_en: clean(input.definition_en, 300) || null,
    ipa: clean(input.ipa, 80) || null,
    reading_th: clean(input.reading_th, 80) || null,
    word_family: cleanList(input.word_family, 8),
    root_parts: clean(input.root_parts, 200) || null,
    collocations: cleanList(input.collocations, 6),
  };
}

// F2: บันทึกคำใหม่ + ประโยค + tag (trigger ในฐานข้อมูลสร้างการ์ด 2 ทิศให้)
export async function createWord(input: WordInput): Promise<SaveResult> {
  const fields = wordFields(input);
  if (!fields.term) return { ok: false, error: "พิมพ์คำศัพท์ก่อน" };
  if (!fields.meaning_th) return { ok: false, error: "ใส่ความหมายไทยก่อนบันทึก" };

  const supabase = await createClient();
  await requireUser(supabase);

  const duplicate = await checkDuplicate(fields.term);
  if (duplicate) return { ok: false, error: "มีคำนี้ในคลังแล้ว", duplicate };

  const { data: word, error } = await supabase
    .from("words")
    .insert({ ...fields, ai_filled: input.ai_filled })
    .select("id")
    .single();
  if (error || !word) {
    if (error?.code === "23505") {
      const dup = await checkDuplicate(fields.term);
      return { ok: false, error: "มีคำนี้ในคลังแล้ว", duplicate: dup ?? undefined };
    }
    console.error("createWord failed", error);
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  try {
    const sentence = clean(input.sentence, 1000);
    if (sentence) {
      const { error: ctxError } = await supabase.from("contexts").insert({
        word_id: word.id,
        sentence,
        source_title: clean(input.source_title, 200) || null,
        source_url: clean(input.source_url, 500) || null,
        is_ai_generated: input.sentence_is_ai,
      });
      if (ctxError) throw ctxError;
    }
    const tagIds = await resolveTagIds(supabase, input.tags);
    if (tagIds.length > 0) {
      const { error: tagError } = await supabase
        .from("word_tags")
        .insert(tagIds.map((tag_id) => ({ word_id: word.id, tag_id })));
      if (tagError) throw tagError;
    }
  } catch (err) {
    // บันทึกไม่ครบ ลบคำทิ้ง (การ์ดและประโยคลบตามด้วย cascade)
    console.error("createWord details failed", err);
    await supabase.from("words").delete().eq("id", word.id);
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: word.id };
}

// F3: เพิ่มประโยคใหม่เข้าคำที่มีอยู่แล้ว
export async function addContext(
  wordId: string,
  sentence: string,
  isAi = false,
  sourceTitle = "",
  sourceUrl = "",
): Promise<SaveResult> {
  const text = clean(sentence, 1000);
  if (!text) return { ok: false, error: "ไม่มีประโยคให้เพิ่ม" };
  const supabase = await createClient();
  await requireUser(supabase);
  const { error } = await supabase.from("contexts").insert({
    word_id: wordId,
    sentence: text,
    source_title: clean(sourceTitle, 200) || null,
    source_url: clean(sourceUrl, 500) || null,
    is_ai_generated: isAi,
  });
  if (error) return { ok: false, error: "เพิ่มประโยคไม่สำเร็จ" };
  revalidatePath(`/words/${wordId}`);
  return { ok: true, id: wordId };
}

// F4: แก้ไขคำ + แทนที่ tag ทั้งชุด
export async function updateWord(wordId: string, input: WordInput): Promise<SaveResult> {
  const fields = wordFields(input);
  if (!fields.term) return { ok: false, error: "คำศัพท์ห้ามว่าง" };
  if (!fields.meaning_th) return { ok: false, error: "ความหมายไทยห้ามว่าง" };

  const supabase = await createClient();
  await requireUser(supabase);

  const dup = await checkDuplicate(fields.term);
  if (dup && dup.id !== wordId) return { ok: false, error: "มีคำนี้ในคลังแล้ว", duplicate: dup };

  const { error } = await supabase.from("words").update(fields).eq("id", wordId);
  if (error) return { ok: false, error: "บันทึกไม่สำเร็จ" };

  try {
    const tagIds = await resolveTagIds(supabase, input.tags);
    const { error: delError } = await supabase.from("word_tags").delete().eq("word_id", wordId);
    if (delError) throw delError;
    if (tagIds.length > 0) {
      const { error: tagError } = await supabase
        .from("word_tags")
        .insert(tagIds.map((tag_id) => ({ word_id: wordId, tag_id })));
      if (tagError) throw tagError;
    }
  } catch (err) {
    // ตัวคำบันทึกแล้ว แต่ tag อาจไม่ครบ ให้ผู้ใช้กดบันทึกซ้ำ
    console.error("updateWord tags failed", err);
    revalidatePath("/", "layout");
    return { ok: false, error: "บันทึกคำแล้ว แต่บันทึก tag ไม่สำเร็จ กดบันทึกอีกครั้ง" };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: wordId };
}

export type DeleteResult = { error: string } | undefined;

export async function deleteContext(contextId: string, wordId: string): Promise<DeleteResult> {
  const supabase = await createClient();
  await requireUser(supabase);
  const { error } = await supabase.from("contexts").delete().eq("id", contextId);
  if (error) {
    console.error("deleteContext failed", error);
    return { error: "ลบประโยคไม่สำเร็จ" };
  }
  revalidatePath(`/words/${wordId}`);
}

// F4: ลบคำ (การ์ด ประโยค และประวัติการทบทวนลบตามด้วย cascade)
export async function deleteWord(wordId: string): Promise<DeleteResult> {
  const supabase = await createClient();
  await requireUser(supabase);
  const { error } = await supabase.from("words").delete().eq("id", wordId);
  if (error) {
    console.error("deleteWord failed", error);
    return { error: "ลบคำไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  revalidatePath("/", "layout");
  redirect("/words");
}
