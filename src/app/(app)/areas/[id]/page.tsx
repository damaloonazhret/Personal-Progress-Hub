import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import { SectionPage } from "@/components/layout/section-page";
import { DetailEditor } from "@/components/organization/detail-editor";
import { ProjectList } from "@/components/organization/project-list";
import { TaskBoard } from "@/components/tasks/task-board";
import { getAreaDetail, getCatalog } from "@/lib/organization/queries";
import { getTasksInArea } from "@/lib/tasks/queries";

export const metadata: Metadata = {
  title: "Сфера",
};

export const instant = false;

type TProps = {
  params: Promise<{ id: string }>;
};

async function AreaContent({ params }: TProps) {
  await connection();
  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) {
    notFound();
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [detailResult, taskResult, catalog] = await Promise.all([getAreaDetail(id), getTasksInArea(id), getCatalog()]);

  if (detailResult.error || taskResult.error) {
    return <p className="text-sm text-destructive">{detailResult.error ?? taskResult.error}</p>;
  }

  if (!detailResult.detail) {
    notFound();
  }

  const { area, projects } = detailResult.detail;
  const looseTasks = taskResult.tasks.filter((task) => task.projectId === null && task.status === "todo");
  const projectGroups = projects.map((project) => ({
    project,
    tasks: taskResult.tasks.filter((task) => task.projectId === project.id && task.status === "todo"),
  }));

  return (
    <SectionPage title={area.name} description={area.description ?? "Проекты и задачи этой сферы."}>
      <Link href="/areas" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Все сферы
      </Link>
      <DetailEditor kind="area" id={area.id} name={area.name} description={area.description} progress={area.progress} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Проекты</h2>
        <ProjectList areas={[{ id: area.id, name: area.name }]} projects={projects} loadError={null} fixedAreaId={area.id} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Задачи без проекта</h2>
        <TaskBoard
          tasks={looseTasks}
          scope={{ view: "area", areaId: area.id }}
          today={today}
          loadError={null}
          catalog={catalog}
        />
      </section>
      {projectGroups.map((group) => (
        <section key={group.project.id} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">
            <Link href={`/projects/${group.project.id}`} className="underline-offset-4 hover:underline">
              {group.project.name}
            </Link>
          </h2>
          <TaskBoard
            tasks={group.tasks}
            scope={{ view: "project", projectId: group.project.id, areaId: area.id }}
            today={today}
            loadError={null}
            catalog={catalog}
          />
        </section>
      ))}
    </SectionPage>
  );
}

export default function AreaDetailPage({ params }: TProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка сферы…</p>}>
      <AreaContent params={params} />
    </Suspense>
  );
}
