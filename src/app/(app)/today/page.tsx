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
      description="Незавершённые задачи с датой не позже сегодня. Прошлая дата остаётся, пока задачу не уберут или не завершат."
    />
  );
}
