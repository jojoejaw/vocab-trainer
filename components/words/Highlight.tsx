// ไฮไลต์คำในประโยค (ไม่สนตัวพิมพ์เล็ก/ใหญ่) ถ้าไม่เจอคำก็แสดงประโยคเดิม
export function Highlight({ sentence, term }: { sentence: string; term: string }) {
  const i = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (!term || i < 0) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, i)}
      <mark className="rounded bg-[#fde8c8] px-0.5 font-semibold text-ink">{sentence.slice(i, i + term.length)}</mark>
      {sentence.slice(i + term.length)}
    </>
  );
}

// ซ่อนคำในประโยคเป็นช่องว่าง ใช้ด้านหน้าการ์ดไทย → อังกฤษ
export function Blank({ sentence, term }: { sentence: string; term: string }) {
  const i = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (!term || i < 0) return null;
  return (
    <>
      {sentence.slice(0, i)}
      <span className="inline-block min-w-16 border-b-2 border-ink/40 text-transparent" aria-label="ช่องว่าง">
        {sentence.slice(i, i + term.length)}
      </span>
      {sentence.slice(i + term.length)}
    </>
  );
}
