import { HeaderSkeleton, Loading as Skeleton, PanelSkeleton, StatsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={1} />
      <StatsSkeleton count={3} className="mb-8 sm:grid-cols-3" />
      <div className="grid gap-4 md:grid-cols-2">
        <PanelSkeleton lines={5} />
        <PanelSkeleton lines={5} />
      </div>
    </Skeleton>
  );
}
