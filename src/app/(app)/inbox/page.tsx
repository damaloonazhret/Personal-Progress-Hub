import type { Metadata } from "next";

import { SectionPage } from "@/components/layout/section-page";

export const metadata: Metadata = {
  title: "Входящие",
};

export default function InboxPage() {
  return (
    <SectionPage
      title="Входящие"
      description="Здесь будут задачи, которые ещё не разложены по проектам и не взяты на сегодня."
    />
  );
}
