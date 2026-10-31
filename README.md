# Vocab Trainer

เว็บแอปฝึกจำคำศัพท์ภาษาอังกฤษสาย Cyber Security
(Next.js 16 + Supabase) · ตอนนี้อยู่ที่สัปดาห์ 1: ล็อกอิน + โครงหน้าจอ

## รันในเครื่อง

1. ติดตั้งแพ็กเกจ (ครั้งแรกครั้งเดียว)

   ```bash
   npm install
   ```

2. ตั้งค่า Supabase: คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจาก
   Supabase › Project Settings › API Keys

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
   ```

3. สร้างตาราง: เปิด Supabase › SQL Editor แล้ววางเนื้อหาไฟล์
   `supabase/migrations/0001_init_schema.sql` จากนั้นกด Run

4. รันแอป

   ```bash
   npm run dev
   ```

   เปิด http://localhost:3000

## โครงสร้าง

```
app/(auth)/login       หน้าเข้าสู่ระบบ / สมัครสมาชิก
app/auth/callback      รับลิงก์ยืนยันอีเมล
app/(tabs)/            หน้าที่มี Bottom nav: หน้าแรก, คลังคำ, สถิติ
app/(focus)/           หน้าเต็มจอ: ทบทวน, เพิ่มคำ, ตั้งค่า
actions/auth.ts        Server Actions: เข้าสู่ระบบ, สมัคร, ออกจากระบบ
lib/supabase/          Supabase client ฝั่งเซิร์ฟเวอร์ / เบราว์เซอร์ / proxy
proxy.ts               ต่ออายุ session และกันหน้าที่ต้องล็อกอิน
supabase/migrations/   SQL สร้างฐานข้อมูล
```
