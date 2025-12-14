export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-36 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-64 bg-slate-200 rounded animate-pulse mt-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="h-40 bg-slate-200 animate-pulse" />
              <div className="p-4">
                <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse mt-2" />
                <div className="flex gap-2 mt-4">
                  <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
