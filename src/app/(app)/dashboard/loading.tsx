import { ChartSkeleton, HeaderSkeleton, Loading as Skeleton, PanelSkeleton, StatsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={2} />
      <StatsSkeleton count={4} className="mb-6 sm:grid-cols-2 lg:grid-cols-4" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ChartSkeleton />
        <PanelSkeleton lines={7} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <PanelSkeleton lines={7} />
      </div>
    </Skeleton>
  );
}
