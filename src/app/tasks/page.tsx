import { Suspense } from "react";
import { TasksView } from "@/features/tasks/TasksView";
import { PageSkeleton } from "@/components/ui";

export default function TasksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TasksView />
    </Suspense>
  );
}
