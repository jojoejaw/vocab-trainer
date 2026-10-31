# Vocab Trainer

เว็บแอปส่วนตัวฝึกจำคำศัพท์ภาษาอังกฤษสาย IT Cyber Security เพื่อให้อ่านเอกสารแล้วเข้าใจ
ผู้ใช้คนเดียว ใช้บนมือถือเป็นหลัก ตอบผู้ใช้เป็นภาษาไทย

- Requirement + Database schema + Prompt AI: https://claude.ai/artifact/Hy4Y12ZwibTYwfrJS244Lj
- Mockup มือถือ 6 หน้า: https://claude.ai/artifact/RNRTpkx4NvTqdzuMbq123k
- GitHub: https://github.com/jojoejaw/vocab-trainer

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents: true`) + TypeScript + Tailwind v4
  - Next.js 16 ต่างจากเวอร์ชันเก่า: อ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด
  - `middleware.ts` เปลี่ยนชื่อเป็น `proxy.ts`
  - ข้อมูลที่ขึ้นกับ request (cookies, params, searchParams) ต้องอยู่ใน `<Suspense>`
  - `lib/supabase/server.ts` เรียก `connection()` ก่อนสร้าง client เพื่อกัน error Date.now() ตอน prerender
- Supabase (PostgreSQL + Auth อีเมล/รหัสผ่าน, RLS ทุกตาราง) · schema: `supabase/migrations/0001_init_schema.sql`
- AI เติมข้อมูลคำ: `lib/ai/providers.ts` เลือกด้วย `AI_PROVIDER` = `gemini` (ฟรี, ค่าเริ่มต้น) หรือ `anthropic`
- ยังไม่ได้ใช้ shadcn/ui: ใช้ Tailwind ตรง ๆ ตามสีใน `app/globals.css` (token: page, card, ink, muted, line, brand ...)

## โครงสร้าง

- `app/(auth)` login · `app/(tabs)` หน้าที่มี Bottom nav (หน้าแรก, คลังคำ, สถิติ) · `app/(focus)` หน้าเต็มจอ (ทบทวน, เพิ่มคำ, รายละเอียด/แก้ไขคำ, ตั้งค่า)
- `actions/` Server Actions (เขียนข้อมูล) · `lib/words-data.ts` อ่านข้อมูลจาก Server Component
- `lib/words.ts` ชนิดข้อมูล + `wordStatus()` · `lib/ai/` prompt, Zod schema, providers

## คำสั่ง

- `npm run dev` · `npm run build` · `npm run lint` · `npx tsc --noEmit`
- ห้ามรัน `npm audit fix --force`
- npm 11 ในเครื่องนี้ลบ `@emnapi/core`, `@emnapi/runtime` ออกจาก `package-lock.json` ทุกครั้งที่ install/prune: อย่า commit ส่วนนี้ (`git checkout package-lock.json`)
- ปุ่มสมัครสมาชิกปิดไว้ เปิดชั่วคราวด้วย `ALLOW_SIGNUP=true` ใน `.env.local`
- ห้ามอ่าน/แสดงค่าใน `.env.local` (มี key) ถ้าต้องแก้ ให้บอกผู้ใช้ว่าต้องเพิ่มบรรทัดไหน

## Git

- งานใหม่ทำใน branch แยก แล้วเปิด PR เข้า `main` ให้ผู้ใช้ merge
- ก่อนจบงานต้อง build + lint ผ่าน

## สถานะ (31 ต.ค. 2026)

- [x] สัปดาห์ 1: ล็อกอิน, layout มือถือ, Bottom nav
- [x] สัปดาห์ 2: เพิ่มคำ + AI เติมข้อมูล, ตรวจคำซ้ำ, คลังคำ, รายละเอียด/แก้ไข/ลบคำ
- [x] เพิ่ม Gemini แบบฟรี (PR #3) ยังไม่ได้ทดสอบเรียกจริง
- [ ] สัปดาห์ 3: หน้าทบทวน Flashcard 2 ทิศ + ts-fsrs + คิวรายวัน (คำใหม่ 10 คำ/วัน, การ์ด "ลืม" วนกลับท้ายคิว)
- [ ] สัปดาห์ 4: หน้าแรกดึงตัวเลขจริงจาก view `today_summary` + Streak, ตั้งค่า, PWA
- ยังไม่ deploy (รันในเครื่องเท่านั้น จนกว่าผู้ใช้จะขอ)
