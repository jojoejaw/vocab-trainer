-- =============================================================
-- Vocab Trainer (Cyber Security) · Initial schema for Supabase
-- วางไฟล์นี้ที่ supabase/migrations/ แล้วรัน `supabase db reset`
-- หรือคัดลอกไปรันใน SQL Editor ของ Supabase
-- =============================================================

-- ---------- Enums ----------
create type card_direction as enum ('en_to_th', 'th_to_en');

-- ตรงกับ State ของ ts-fsrs: 0 New, 1 Learning, 2 Review, 3 Relearning
create type card_state as enum ('new', 'learning', 'review', 'relearning');

-- ---------- profiles: 1 แถวต่อผู้ใช้ ----------
create table profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text,
  new_cards_per_day  int  not null default 10 check (new_cards_per_day between 0 and 200),
  ai_daily_limit     int           check (ai_daily_limit >= 0),   -- ยังไม่กำหนดค่า (null = ไม่จำกัด)
  timezone           text not null default 'Asia/Bangkok',
  created_at         timestamptz not null default now()
);

-- สร้าง profile อัตโนมัติเมื่อสมัครสมาชิก
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- words: คำศัพท์ ----------
create table words (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references profiles (id) on delete cascade,
  term            text not null check (length(trim(term)) > 0),
  part_of_speech  text,                 -- noun, verb, adjective ...
  meaning_th      text,                 -- ความหมายไทย (AI เติม แล้วผู้ใช้ตรวจ)
  definition_en   text,                 -- definition อังกฤษสั้น ๆ
  ipa             text,
  reading_th      text,                 -- คำอ่านภาษาไทย (แสดงด้านหลังการ์ด)
  word_family     text[] not null default '{}',
  root_parts      text,                 -- รากศัพท์ / prefix / suffix
  collocations    text[] not null default '{}',
  notes           text,
  ai_filled       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- กันคำซ้ำ (F3): ไม่สนตัวพิมพ์เล็ก/ใหญ่ และช่องว่างหัวท้าย
create unique index words_user_term_uniq on words (user_id, lower(trim(term)));

-- ---------- contexts: ประโยคที่เจอคำ (หลายประโยคต่อคำ) ----------
create table contexts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references profiles (id) on delete cascade,
  word_id          uuid not null references words (id) on delete cascade,
  sentence         text not null,
  source_title     text,
  source_url       text,
  is_ai_generated  boolean not null default false,
  created_at       timestamptz not null default now()
);
create index contexts_word_idx on contexts (word_id);

-- ---------- tags + word_tags ----------
create table tags (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null default auth.uid() references profiles (id) on delete cascade,
  name     text not null
);
create unique index tags_user_name_uniq on tags (user_id, lower(name));

create table word_tags (
  word_id  uuid not null references words (id) on delete cascade,
  tag_id   uuid not null references tags (id) on delete cascade,
  user_id  uuid not null default auth.uid() references profiles (id) on delete cascade,
  primary key (word_id, tag_id)
);
create index word_tags_tag_idx on word_tags (tag_id);

-- ---------- cards: การ์ด 2 ทิศต่อคำ + สถานะ FSRS (ตาม Card ของ ts-fsrs) ----------
create table cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles (id) on delete cascade,
  word_id         uuid not null references words (id) on delete cascade,
  direction       card_direction not null,
  due             timestamptz not null default now(),
  stability       double precision not null default 0,
  difficulty      double precision not null default 0,
  elapsed_days    int not null default 0,
  scheduled_days  int not null default 0,
  learning_steps  int not null default 0,
  reps            int not null default 0,
  lapses          int not null default 0,
  state           card_state not null default 'new',
  last_review     timestamptz,
  created_at      timestamptz not null default now(),
  unique (word_id, direction)
);
-- ใช้ดึงคิวทบทวน: การ์ดที่ครบกำหนดของผู้ใช้
create index cards_user_due_idx on cards (user_id, due);
create index cards_user_state_idx on cards (user_id, state);

-- สร้างการ์ด 2 ทิศอัตโนมัติเมื่อเพิ่มคำ
create function create_cards_for_word() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into cards (user_id, word_id, direction)
  values (new.user_id, new.id, 'en_to_th'),
         (new.user_id, new.id, 'th_to_en');
  return new;
end $$;

create trigger on_word_created
  after insert on words
  for each row execute function create_cards_for_word();

-- ---------- review_logs: ประวัติการให้คะแนน (ตาม ReviewLog ของ ts-fsrs) ----------
create table review_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references profiles (id) on delete cascade,
  card_id         uuid not null references cards (id) on delete cascade,
  rating          smallint not null check (rating between 1 and 4),  -- 1 ลืม, 2 ยาก, 3 ได้, 4 ง่าย
  state           card_state not null,          -- สถานะก่อนทบทวน
  due             timestamptz not null,
  stability       double precision not null,
  difficulty      double precision not null,
  elapsed_days    int not null,
  scheduled_days  int not null,
  learning_steps  int not null default 0,
  reviewed_at     timestamptz not null default now(),
  duration_ms     int check (duration_ms >= 0)
);
create index review_logs_user_time_idx on review_logs (user_id, reviewed_at);
create index review_logs_card_idx on review_logs (card_id);

-- ---------- ai_usage: คุมเพดานการเรียก AI ต่อวัน ----------
create table ai_usage (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references profiles (id) on delete cascade,
  word_id        uuid references words (id) on delete set null,
  action         text not null,          -- เช่น 'fill_word', 'generate_sentence'
  model          text,
  input_tokens   int,
  output_tokens  int,
  created_at     timestamptz not null default now()
);
create index ai_usage_user_time_idx on ai_usage (user_id, created_at);

-- ---------- updated_at อัตโนมัติ ----------
create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger words_touch before update on words
  for each row execute function touch_updated_at();

-- =============================================================
-- Row Level Security: เห็นและแก้ได้เฉพาะข้อมูลของตัวเอง
-- =============================================================
alter table profiles    enable row level security;
alter table words       enable row level security;
alter table contexts    enable row level security;
alter table tags        enable row level security;
alter table word_tags   enable row level security;
alter table cards       enable row level security;
alter table review_logs enable row level security;
alter table ai_usage    enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own words" on words
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own contexts" on contexts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tags" on tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own word_tags" on word_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own cards" on cards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own review_logs" on review_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own ai_usage" on ai_usage
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =============================================================
-- Views ช่วยหน้า Home (คำนวณ "วันนี้" ตาม timezone ใน profiles)
-- =============================================================

-- จำนวนการ์ดครบกำหนด และคำใหม่ที่เรียนไปแล้ววันนี้
create view today_summary with (security_invoker = true) as
select
  p.id as user_id,
  (select count(*) from cards c
     where c.user_id = p.id and c.state <> 'new' and c.due <= now())            as due_count,
  (select count(*) from cards c
     where c.user_id = p.id and c.state = 'new')                                 as new_available,
  (select count(*) from review_logs r
     where r.user_id = p.id and r.state = 'new'
       and (r.reviewed_at at time zone p.timezone)::date
           = (now() at time zone p.timezone)::date)                              as new_done_today,
  p.new_cards_per_day
from profiles p;

-- วันที่มีการทบทวน (ใช้คำนวณ Streak ฝั่งแอป)
create view review_days with (security_invoker = true) as
select distinct
  r.user_id,
  (r.reviewed_at at time zone p.timezone)::date as review_date
from review_logs r
join profiles p on p.id = r.user_id;
