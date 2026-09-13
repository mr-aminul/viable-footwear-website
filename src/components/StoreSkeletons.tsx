export function ShopSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 md:px-6 md:py-14 lg:px-8">
      <div className="h-10 w-40 rounded-lg bg-cloud/80" />
      <div className="mt-3 h-4 w-64 max-w-full rounded bg-cloud/60" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-20 rounded-full bg-cloud/70" />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square rounded-[1.35rem] bg-cloud/70" />
            <div className="h-4 w-[75%] rounded bg-cloud/60" />
            <div className="h-3 w-1/2 rounded bg-cloud/50" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 md:px-6 md:py-12 lg:px-8">
      <div className="h-4 w-28 rounded bg-cloud/60" />
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="aspect-square rounded-[1.5rem] bg-cloud/70" />
        <div className="space-y-4">
          <div className="h-8 w-[75%] rounded-lg bg-cloud/80" />
          <div className="h-4 w-1/3 rounded bg-cloud/60" />
          <div className="h-6 w-24 rounded bg-cloud/70" />
          <div className="mt-8 h-12 w-full rounded-full bg-cloud/70" />
          <div className="h-20 w-full rounded-2xl bg-cloud/50" />
        </div>
      </div>
    </div>
  )
}
