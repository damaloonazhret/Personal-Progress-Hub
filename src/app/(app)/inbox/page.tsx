import type { Metadata } from "next";

import { TaskScreen } from "@/components/tasks/task-screen";

export const metadata: Metadata = {
  title: "Входящие",
};

export const instant = false;

export default function InboxPage() {
  return (
    <TaskScreen
      view="inbox"
      title="Входящие"
      description="Активные задачи без сферы и проекта, которые ещё не взяты на сегодня."
    />
  );
}
