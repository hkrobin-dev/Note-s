import { Suspense } from "react";
import { CalendarView } from "@/features/calendar/CalendarView";
import { PageSkeleton } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CalendarView />
    </Suspense>
  );
}
