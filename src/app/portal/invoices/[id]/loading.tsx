import { HeaderSkeleton, Loading as Skeleton, PanelSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={2} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PanelSkeleton lines={10} bodyClassName="space-y-5 p-8" />
        <div className="space-y-6">
          <PanelSkeleton lines={3} />
          <PanelSkeleton fields={3} />
        </div>
      </div>
    </Skeleton>
  );
}
