export default function Loading() {
  return (
    <div
      role="status"
      className="flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground"
    >
      <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      Memuat Teras SB85…
    </div>
  );
}
