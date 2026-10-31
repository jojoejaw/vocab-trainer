import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import ReviewSession from "@/components/review/ReviewSession";
import { getReviewQueue } from "@/lib/review-data";

export default function ReviewPage() {
  return (
    <>
      <PageHeader title="ทบทวน" />
      <Suspense fallback={<p className="px-5 text-muted">กำลังโหลดการ์ด…</p>}>
        <Session />
      </Suspense>
    </>
  );
}

// อ่านข้อมูลผู้ใช้ จึงต้องอยู่ใน Suspense (Cache Components)
async function Session() {
  const queue = await getReviewQueue();
  return <ReviewSession initial={queue.cards} />;
}
