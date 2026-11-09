"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { signIn, signUp, type TAuthState } from "@/lib/auth/actions";

const initialState: TAuthState = {
  error: null,
  message: null,
};

type TProps = {
  mode: "login" | "register";
  nextPath: string;
};

export function CredentialsForm({ mode, nextPath }: TProps) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isLogin = mode === "login";
  const submitLabel = isLogin ? "Войти" : "Создать аккаунт";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor={`${mode}-email`}>
        Email
        <input
          id={`${mode}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor={`${mode}-password`}>
        Пароль
        <input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={8}
          required
          className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Подождите…" : submitLabel}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
        <Link
          href={isLogin ? "/register" : `/login?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {isLogin ? "Создать" : "Войти"}
        </Link>
      </p>
    </form>
  );
}
