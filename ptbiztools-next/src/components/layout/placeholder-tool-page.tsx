export function PlaceholderToolPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-(--radius-2xl) border border-border bg-surface p-8 shadow-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Migration In Progress</p>
      <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{description}</p>
      <p className="mt-6 text-sm text-foreground">
        This route is now mounted in Next.js and protected by the same auth/role model. Full feature parity will be
        completed in the next migration pass.
      </p>
    </section>
  );
}
