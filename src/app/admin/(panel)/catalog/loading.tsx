export default function ProductsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 rounded-lg bg-cloud/80" />
      <div className="h-4 w-72 max-w-full rounded bg-cloud/60" />
      <div className="h-20 rounded-2xl bg-white/80" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-[1.35rem] bg-white/80" />
        ))}
      </div>
    </div>
  )
}
