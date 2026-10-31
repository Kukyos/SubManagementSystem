import { HeaderSkeleton, Loading as Skeleton, PanelSkeleton, StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={2} />
      <StatsSkeleton count={4} className="mb-6 sm:grid-cols-2 lg:grid-cols-4" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TableSkeleton cols={4} rows={6} />
        <PanelSkeleton lines={6} />
      </div>
    </Skeleton>
  );
}
