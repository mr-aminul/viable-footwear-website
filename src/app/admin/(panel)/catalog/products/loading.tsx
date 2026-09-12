export default function ProductsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded-lg bg-cloud/80" />
          <div className="h-4 w-64 max-w-full rounded bg-cloud/60" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-cloud/70" />
      </div>
      <div className="h-24 rounded-2xl bg-white/80" />
      <div className="h-72 rounded-2xl bg-white/80" />
    </div>
  )
}
