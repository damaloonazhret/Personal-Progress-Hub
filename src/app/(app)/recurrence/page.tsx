import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { RecurrenceList } from "@/components/recurrence/recurrence-list";
import { SectionPage } from "@/components/layout/section-page";
import { getCatalog } from "@/lib/organization/queries";
import { getLocalToday } from "@/lib/profile/queries";
import { getRecurrenceRules } from "@/lib/recurrence/queries";

export const metadata: Metadata = {
  title: "Повторы",
};

export const instant = false;

async function RecurrenceContent() {
  await connection();
  const [rules, catalog, today] = await Promise.all([getRecurrenceRules(), getCatalog(), getLocalToday()]);

  return (
    <RecurrenceList
      rules={rules.rules}
      areas={catalog.areas}
      projects={catalog.projects}
      today={today}
      loadError={rules.error ?? catalog.error}
    />
  );
}

export default function RecurrencePage() {
  return (
    <SectionPage
      title="Повторы"
      description="«Сегодня» и «Обзор» создают пропущенные вхождения активных правил до текущей местной даты. Будущие появятся в календаре при открытии нужного диапазона. Изменение правила не переписывает уже созданные задачи."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка правил…</p>}>
        <RecurrenceContent />
      </Suspense>
    </SectionPage>
  );
}
