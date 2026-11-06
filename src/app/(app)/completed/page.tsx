import type { Metadata } from "next";

import { SectionPage } from "@/components/layout/section-page";

export const metadata: Metadata = {
  title: "Готово",
};

export default function CompletedPage() {
  return (
    <SectionPage
      title="Готово"
      description="Здесь будет история выполненных задач с фильтрами по сфере, проекту и дате."
    />
  );
}
