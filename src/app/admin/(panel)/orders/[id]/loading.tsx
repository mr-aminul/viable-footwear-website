export default function OrderDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-lg bg-cloud/80" />
      <div className="h-4 w-72 max-w-full rounded bg-cloud/60" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-white/80" />
        <div className="h-64 rounded-2xl bg-white/80" />
      </div>
      <div className="h-48 rounded-2xl bg-white/80" />
    </div>
  )
}
