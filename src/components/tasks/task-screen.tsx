import { connection } from "next/server";
import { Suspense } from "react";

import { SectionPage } from "@/components/layout/section-page";
import { TaskBoard } from "@/components/tasks/task-board";
import { getCatalog } from "@/lib/organization/queries";
import { getCompletedTasks, getInboxTasks, getTodayTasks } from "@/lib/tasks/queries";
import type { TTaskView } from "@/lib/tasks/model";

type TProps = {
  view: TTaskView;
  title: string;
  description: string;
};

async function TaskScreenContent({ view }: Pick<TProps, "view">) {
  await connection();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [result, catalog] = await Promise.all([
    view === "today" ? getTodayTasks() : view === "completed" ? getCompletedTasks() : getInboxTasks(),
    getCatalog(),
  ]);

  return (
    <TaskBoard
      tasks={result.tasks}
      scope={{ view }}
      today={today}
      loadError={result.error ?? catalog.error}
      catalog={catalog}
      showFilters={view === "completed"}
    />
  );
}

export function TaskScreen({ view, title, description }: TProps) {
  return (
    <SectionPage title={title} description={description}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка задач…</p>}>
        <TaskScreenContent view={view} />
      </Suspense>
    </SectionPage>
  );
}
