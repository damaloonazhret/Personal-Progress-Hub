"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

type TProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: TProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
