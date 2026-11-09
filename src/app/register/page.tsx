import type { Metadata } from "next";

import { AuthScreen } from "@/components/auth/auth-screen";
import { CredentialsForm } from "@/components/auth/credentials-form";

export const metadata: Metadata = {
  title: "Регистрация",
};

export default function RegisterPage() {
  return (
    <AuthScreen
      title="Регистрация"
      description="Создайте аккаунт. Подтверждение почты нужно один раз, после этого можно входить."
    >
      <CredentialsForm mode="register" nextPath="/dashboard" />
    </AuthScreen>
  );
}
