import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import { SectionPage } from "@/components/layout/section-page";
import { DetailEditor } from "@/components/organization/detail-editor";
import { TaskBoard } from "@/components/tasks/task-board";
import { getCatalog, getProjectDetail } from "@/lib/organization/queries";
import { getLocalToday } from "@/lib/profile/queries";
import { getProjectTasks } from "@/lib/tasks/queries";

export const metadata: Metadata = {
  title: "Проект",
};

export const instant = false;

type TProps = {
  params: Promise<{ id: string }>;
};

async function ProjectContent({ params }: TProps) {
  await connection();
  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) {
    notFound();
  }

  const today = await getLocalToday();
  const [projectResult, taskResult, catalog] = await Promise.all([getProjectDetail(id), getProjectTasks(id), getCatalog()]);

  if (projectResult.error || taskResult.error) {
    return <p className="text-sm text-destructive">{projectResult.error ?? taskResult.error}</p>;
  }

  if (!projectResult.project) {
    notFound();
  }

  const project = projectResult.project;
  const activeTasks = taskResult.tasks.filter((task) => task.status === "todo");
  const completedTasks = taskResult.tasks.filter((task) => task.status === "done");

  return (
    <SectionPage title={project.name} description={project.description ?? `Проект сферы «${project.areaName}».`}>
      <Link href="/projects" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Все проекты
      </Link>
      <DetailEditor
        kind="project"
        id={project.id}
        name={project.name}
        description={project.description}
        areaId={project.areaId}
        areas={catalog.areas}
        progress={project.progress}
      />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Активные</h2>
        <TaskBoard
          tasks={activeTasks}
          scope={{ view: "project", projectId: project.id, areaId: project.areaId }}
          today={today}
          loadError={null}
          catalog={catalog}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Готово</h2>
        <TaskBoard
          tasks={completedTasks}
          scope={{ view: "completed", projectId: project.id }}
          today={today}
          loadError={null}
          catalog={catalog}
        />
      </section>
    </SectionPage>
  );
}

export default function ProjectDetailPage({ params }: TProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка проекта…</p>}>
      <ProjectContent params={params} />
    </Suspense>
  );
}
