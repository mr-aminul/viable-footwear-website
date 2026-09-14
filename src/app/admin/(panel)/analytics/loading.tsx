export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 rounded-lg bg-cloud/80" />
      <div className="h-4 w-72 max-w-full rounded bg-cloud/60" />
      <div className="flex gap-2">
        <div className="h-9 w-20 rounded-full bg-white/80" />
        <div className="h-9 w-24 rounded-full bg-white/80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
      </div>
      <div className="h-72 rounded-2xl bg-white/80" />
    </div>
  )
}
