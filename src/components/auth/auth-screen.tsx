import { ThemeToggle } from "@/components/layout/theme-toggle";

type TProps = {
  title: string;
  description: string;
  notice?: string | null;
  children: React.ReactNode;
};

export function AuthScreen({ title, description, notice, children }: TProps) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <section className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Personal Progress Hub</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {notice ? (
          <p role="alert" className="text-sm text-destructive">
            {notice}
          </p>
        ) : null}
        {children}
      </section>
    </main>
  );
}
