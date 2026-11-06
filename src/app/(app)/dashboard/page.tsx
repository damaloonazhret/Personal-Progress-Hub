import type { Metadata } from "next";

import { SectionPage } from "@/components/layout/section-page";

export const metadata: Metadata = {
  title: "Обзор",
};

export default function DashboardPage() {
  return (
    <SectionPage
      title="Обзор"
      description="Здесь появится сводка: активные задачи, сделанное сегодня и прогресс по направлениям. Списки подключим после схемы базы."
    />
  );
}
