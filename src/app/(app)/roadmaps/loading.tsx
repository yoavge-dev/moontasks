import { Skeleton } from "@/components/ui/skeleton";

export default function RoadmapsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Roadmap columns */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="min-w-[220px] space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 + (col % 2) }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
