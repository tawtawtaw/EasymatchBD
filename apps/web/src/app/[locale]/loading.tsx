export default function LocaleLoading() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-6xl flex-col justify-center gap-4 px-4 py-16 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-rose-100" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-zinc-100" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-36 animate-pulse rounded-2xl border border-zinc-100 bg-zinc-50"
          />
        ))}
      </div>
    </div>
  );
}
