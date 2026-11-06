import type { Metadata } from "next";

import { SectionPage } from "@/components/layout/section-page";

export const metadata: Metadata = {
  title: "Проекты",
};

export default function ProjectsPage() {
  return (
    <SectionPage
      title="Проекты"
      description="Здесь появятся активные проекты, число задач и прогресс. Пустой проект не будет показывать 100%."
    />
  );
}
