import { HeaderSkeleton, Loading as Skeleton, PanelSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={0} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton fields={4} />
        <PanelSkeleton lines={6} />
      </div>
    </Skeleton>
  );
}
