import type { Metadata } from "next";

import { SectionPage } from "@/components/layout/section-page";

export const metadata: Metadata = {
  title: "Сферы",
};

export default function AreasPage() {
  return (
    <SectionPage
      title="Сферы"
      description="Здесь будут крупные направления: английский, тренировки, разработка и другие. Проекты и задачи появятся внутри них."
    />
  );
}
