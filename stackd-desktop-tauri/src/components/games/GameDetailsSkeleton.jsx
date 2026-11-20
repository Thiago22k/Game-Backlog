const Bone = ({ className = '' }) => (
  <div className={`bg-gray-800 animate-pulse rounded ${className}`} />
);

const GameDetailsSkeleton = () => {
  return (
    <div className="min-h-screen bg-primary-navy overflow-x-hidden w-full">

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Banner placeholder */}
        <div className="absolute inset-0 bg-primary-navy-dark animate-pulse" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12 w-full">
          {/* Back button */}
          <Bone className="w-16 h-4 mb-8" />

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover column */}
            <div className="shrink-0 space-y-3">
              <Bone className="w-44 h-64 rounded-xl" />
              <Bone className="w-44 h-10 rounded-xl" />
            </div>

            {/* Title & meta column */}
            <div className="flex-1 min-w-0 space-y-4 pt-2">
              {/* Title */}
              <Bone className="w-3/4 h-10 rounded-lg" />

              {/* Genre pills */}
              <div className="flex gap-2">
                <Bone className="w-20 h-6 rounded-full" />
                <Bone className="w-24 h-6 rounded-full" />
                <Bone className="w-16 h-6 rounded-full" />
              </div>

              {/* Meta: dev · date */}
              <div className="flex gap-3">
                <Bone className="w-32 h-4" />
                <Bone className="w-24 h-4" />
              </div>

              {/* Platform chips */}
              <div className="flex gap-1.5 flex-wrap">
                {[80, 64, 72, 56].map((w, i) => (
                  <Bone key={i} className={`w-${w / 4} h-5 rounded`} style={{ width: w }} />
                ))}
              </div>

              {/* Summary lines */}
              <div className="space-y-2 pt-2">
                <Bone className="w-full h-4" />
                <Bone className="w-full h-4" />
                <Bone className="w-5/6 h-4" />
              </div>

              {/* Status + rating buttons row */}
              <div className="flex gap-2 pt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Bone key={i} className="w-24 h-10 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: Tabs + content ───────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tab bar */}
            <div className="flex gap-6 border-b border-gray-700 pb-0">
              {[72, 60, 64, 56].map((w, i) => (
                <Bone key={i} className="h-9 rounded-t" style={{ width: w }} />
              ))}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Bone key={i} className="h-24 rounded-xl" />
              ))}
            </div>

            {/* Rating distribution block */}
            <Bone className="w-full h-40 rounded-xl" />
          </div>

          {/* ── RIGHT: Sidebar ─────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* User action card */}
            <Bone className="w-full h-48 rounded-2xl" />

            {/* Quick facts card */}
            <div className="bg-primary-navy-dark rounded-2xl p-5 space-y-3">
              <Bone className="w-1/3 h-5 rounded" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <Bone className="w-24 h-4" />
                  <Bone className="w-20 h-4" />
                </div>
              ))}
            </div>

            {/* Similar games */}
            <div className="space-y-3">
              <Bone className="w-1/3 h-5 rounded" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Bone className="w-12 h-16 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Bone className="w-3/4 h-4" />
                    <Bone className="w-1/2 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetailsSkeleton;

