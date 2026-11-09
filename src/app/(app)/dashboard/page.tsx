import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { SectionPage } from "@/components/layout/section-page";
import { TaskSummary } from "@/components/tasks/task-summary";
import { getTaskSummary } from "@/lib/tasks/queries";

export const metadata: Metadata = {
  title: "Обзор",
};

export const instant = false;

async function DashboardSummary() {
  await connection();
  const summary = await getTaskSummary();

  if (summary.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {summary.error}
      </p>
    );
  }

  return <TaskSummary counts={summary.counts} />;
}

export default function DashboardPage() {
  return (
    <SectionPage
      title="Обзор"
      description="Сколько задач сейчас в работе, что выбрано на сегодня и сколько уже сделано."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка сводки…</p>}>
        <DashboardSummary />
      </Suspense>
    </SectionPage>
  );
}
