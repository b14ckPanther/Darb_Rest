import { Skeleton } from "@darb-rest/ui";
export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-5 w-72 max-w-full" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}
