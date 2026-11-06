import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { AreaList } from "@/components/organization/area-list";
import { SectionPage } from "@/components/layout/section-page";
import { getAreaCards } from "@/lib/organization/queries";

export const metadata: Metadata = {
  title: "Сферы",
};

export const instant = false;

async function AreasContent() {
  await connection();
  const result = await getAreaCards();

  return <AreaList areas={result.areas} loadError={result.error} />;
}

export default function AreasPage() {
  return (
    <SectionPage
      title="Сферы"
      description="Направления, внутри которых живут проекты и задачи. Удаление сферы удаляет и то, и другое."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка сфер…</p>}>
        <AreasContent />
      </Suspense>
    </SectionPage>
  );
}
