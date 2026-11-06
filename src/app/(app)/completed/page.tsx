import type { Metadata } from "next";

import { TaskScreen } from "@/components/tasks/task-screen";

export const metadata: Metadata = {
  title: "Готово",
};

export const instant = false;

export default function CompletedPage() {
  return (
    <TaskScreen
      view="completed"
      title="Готово"
      description="Выполненные задачи. Возврат делает задачу активной и не добавляет её в «Сегодня»."
    />
  );
}
