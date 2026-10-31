import { HeaderSkeleton, Loading as Skeleton, PanelSkeleton, StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={0} />
      <PanelSkeleton fields={2} className="mb-6" />
      <StatsSkeleton count={3} className="mb-6 sm:grid-cols-3" />
      <TableSkeleton cols={8} rows={8} />
    </Skeleton>
  );
}
