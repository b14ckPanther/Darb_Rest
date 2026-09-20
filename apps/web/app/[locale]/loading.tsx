import { Skeleton } from "@darb-rest/ui";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-4 pt-12">
        <Skeleton className="h-12 w-3/4 max-w-md" />
        <Skeleton className="h-6 w-1/2 max-w-sm" />
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  );
}
