const AUTH_ENTRY_PATHS = new Set(["/login", "/register"]);

export function isAuthEntryPath(pathname: string) {
  return AUTH_ENTRY_PATHS.has(pathname);
}

export function isAuthCallbackPath(pathname: string) {
  return pathname === "/auth/callback" || pathname.startsWith("/auth/callback/");
}

export function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }

  const pathname = value.split(/[?#]/, 1)[0] ?? "/dashboard";

  if (isAuthEntryPath(pathname) || isAuthCallbackPath(pathname)) {
    return "/dashboard";
  }

  return value;
}
