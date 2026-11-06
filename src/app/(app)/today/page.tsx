import type { Metadata } from "next";

import { SectionPage } from "@/components/layout/section-page";

export const metadata: Metadata = {
  title: "Сегодня",
};

export default function TodayPage() {
  return (
    <SectionPage
      title="Сегодня"
      description="Здесь будет список задач, которые ты сам выбрал на сегодня. Невыполненная задача не станет просроченной на следующий день."
    />
  );
}
