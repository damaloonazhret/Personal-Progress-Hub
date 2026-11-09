import type { Metadata } from "next";

import { AuthScreen } from "@/components/auth/auth-screen";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { getSafeNextPath } from "@/lib/auth/paths";

export const metadata: Metadata = {
  title: "Вход",
};

export const instant = false;

type TProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: TProps) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const callbackNotice =
    params.error === "callback"
      ? "Не удалось подтвердить email. Откройте ссылку из письма ещё раз или войдите, если аккаунт уже подтверждён."
      : null;

  return (
    <AuthScreen
      title="Вход"
      description="Войдите, чтобы увидеть свои задачи."
      notice={callbackNotice}
    >
      <CredentialsForm mode="login" nextPath={nextPath} />
    </AuthScreen>
  );
}
