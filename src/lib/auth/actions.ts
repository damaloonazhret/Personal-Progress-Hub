"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthErrorMessage, validateCredentials } from "@/lib/auth/messages";
import { getSafeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

export type TAuthState = {
  error: string | null;
  message: string | null;
};

async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    nextPath: getSafeNextPath(String(formData.get("next") ?? "")),
  };
}

export async function signIn(_state: TAuthState, formData: FormData): Promise<TAuthState> {
  const { email, password, nextPath } = readCredentials(formData);
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return { error: validationError, message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: getAuthErrorMessage(error.code), message: null };
  }

  redirect(nextPath);
}

export async function signUp(_state: TAuthState, formData: FormData): Promise<TAuthState> {
  const { email, password } = readCredentials(formData);
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return { error: validationError, message: null };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: getAuthErrorMessage(error.code), message: null };
  }

  if (!data.session) {
    return {
      error: null,
      message:
        "Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите. Пока почта не подтверждена, доступ к задачам закрыт.",
    };
  }

  redirect("/dashboard");
}
