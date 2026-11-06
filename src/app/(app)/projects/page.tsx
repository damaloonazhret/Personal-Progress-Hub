import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { SectionPage } from "@/components/layout/section-page";
import { ProjectList } from "@/components/organization/project-list";
import { getProjectCards } from "@/lib/organization/queries";

export const metadata: Metadata = {
  title: "Проекты",
};

export const instant = false;

async function ProjectsContent() {
  await connection();
  const result = await getProjectCards();

  return <ProjectList areas={result.areas} projects={result.projects} loadError={result.error} />;
}

export default function ProjectsPage() {
  return (
    <SectionPage
      title="Проекты"
      description="Проект всегда относится к сфере. Прогресс считается по активным и завершённым задачам. Пустой проект не показывает 100%."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка проектов…</p>}>
        <ProjectsContent />
      </Suspense>
    </SectionPage>
  );
}
