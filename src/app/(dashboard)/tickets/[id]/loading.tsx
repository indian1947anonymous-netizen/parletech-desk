export default function TicketLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 p-4 sm:p-6 space-y-4 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-6 w-20 bg-slate-200 rounded-md"></div>
          <div className="h-6 w-3 bg-slate-200 rounded"></div>
          <div className="h-6 w-64 bg-slate-200 rounded-md"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded-md"></div>
          <div className="h-9 w-32 bg-slate-200 rounded-md"></div>
        </div>
      </div>

      {/* Main Workspace Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left 2 Cols: Main ticket body & conversation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3">
            <div className="h-4 w-40 bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-100 rounded"></div>
            <div className="h-4 w-3/4 bg-slate-100 rounded"></div>
          </div>
          <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200"></div>
              <div className="space-y-1">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                <div className="h-3 w-24 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div className="h-16 w-full bg-slate-100 rounded-lg"></div>
          </div>
        </div>

        {/* Right 1 Col: Properties, Kaseya & Zoho cards */}
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <div className="h-5 w-32 bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-100 rounded"></div>
            <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
            <div className="h-9 w-full bg-slate-200 rounded-md mt-4"></div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <div className="h-5 w-40 bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-100 rounded"></div>
            <div className="h-9 w-full bg-slate-200 rounded-md mt-4"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
