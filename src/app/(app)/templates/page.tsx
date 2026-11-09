import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { SectionPage } from "@/components/layout/section-page";
import { TemplateList } from "@/components/templates/template-list";
import { getCatalog } from "@/lib/organization/queries";
import { getTemplates } from "@/lib/templates/queries";

export const metadata: Metadata = {
  title: "Шаблоны",
};

export const instant = false;

async function TemplatesContent() {
  await connection();
  const [templates, catalog] = await Promise.all([getTemplates(), getCatalog()]);

  return (
    <TemplateList
      templates={templates.templates}
      areas={catalog.areas}
      projects={catalog.projects}
      loadError={templates.error ?? catalog.error}
    />
  );
}

export default function TemplatesPage() {
  return (
    <SectionPage
      title="Шаблоны"
      description="Шаблон задаёт поля новой задачи. Уже созданная задача после этого живёт отдельно."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка шаблонов…</p>}>
        <TemplatesContent />
      </Suspense>
    </SectionPage>
  );
}
