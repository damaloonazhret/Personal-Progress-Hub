import { AppShell } from "@/components/layout/app-shell";

type TProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: TProps) {
  return <AppShell>{children}</AppShell>;
}
