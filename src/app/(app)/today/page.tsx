import type { Metadata } from "next";

import { TaskScreen } from "@/components/tasks/task-screen";

export const metadata: Metadata = {
  title: "Сегодня",
};

export const instant = false;

export default function TodayPage() {
  return (
    <TaskScreen
      view="today"
      title="Сегодня"
      description="Задачи, которые ты сам выбрал на сегодня. Невыполненная задача остаётся здесь и на следующий день."
    />
  );
}
