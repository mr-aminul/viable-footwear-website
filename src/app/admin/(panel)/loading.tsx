export default function AdminPanelLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-cloud/80" />
      <div className="h-4 w-80 max-w-full rounded bg-cloud/60" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
      </div>
      <div className="h-64 rounded-2xl bg-white/80" />
    </div>
  )
}
