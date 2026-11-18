import { Suspense } from "react";
import { ExpensesView } from "@/features/expenses/ExpensesView";
import { PageSkeleton } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExpensesView />
    </Suspense>
  );
}
