import { Skeleton } from "@darb-rest/ui";
export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-52 w-full" />
    </main>
  );
}
