type TProps = {
  title: string;
  description: string;
};

export function SectionPage({ title, description }: TProps) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </section>
  );
}
