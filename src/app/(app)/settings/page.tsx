import type { Metadata } from "next";

import { SectionPage } from "@/components/layout/section-page";

export const metadata: Metadata = {
  title: "Настройки",
};

export default function SettingsPage() {
  return (
    <SectionPage
      title="Настройки"
      description="Здесь позже появятся аккаунт и параметры приложения. Сейчас можно переключить светлую и тёмную тему."
    />
  );
}
