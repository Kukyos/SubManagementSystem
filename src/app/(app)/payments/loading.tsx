import { ChartSkeleton, FilterSkeleton, HeaderSkeleton, Loading as Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={2} />
      <ChartSkeleton className="mb-8" />
      <FilterSkeleton />
      <TableSkeleton cols={7} />
    </Skeleton>
  );
}
